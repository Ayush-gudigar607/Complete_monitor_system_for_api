import express from "express";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { v4 as uuidv4 } from "uuid";
import MonitoringService from "../../../shared/models/MonitoringService.js";
import ApiKey from "../../../shared/models/ApiKey.js";
import Client from "../../../shared/models/Client.js";
import ingestDependencies from "../../ingest/Dependencies/dependencies.js";
import logger from "../../../shared/config/logger.js";

const router = express.Router();
const hopByHopHeaders = new Set([
  "connection", "content-length", "host", "keep-alive", "proxy-authenticate",
  "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade", "x-api-key",
]);

function forwardedHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => !hopByHopHeaders.has(name.toLowerCase())),
  );
}

function responseHeaders(headers, res) {
  headers.forEach((value, name) => {
    if (!hopByHopHeaders.has(name.toLowerCase())) res.setHeader(name, value);
  });
}

async function publishHit({ service, apiKey, path, method, statusCode, latencyMs, req }) {
  try {
    await ingestDependencies.ingestService.ingestApiHit({
      eventId: uuidv4(),
      timestamp: new Date(),
      serviceName: service.name,
      endpoint: path,
      method,
      statusCode,
      latencyMs,
      clientId: service.clientId,
      apiKeyId: apiKey._id,
      ip: req.ip || req.socket.remoteAddress || "unknown",
      userAgent: req.get("user-agent") || "",
    });
  } catch (error) {
    // Monitoring must never turn a healthy upstream response into a failed request.
    logger.error("Unable to publish proxied API hit", { serviceId: service._id, error: error.message });
  }
}

router.use("/:serviceId", async (req, res) => {
  const startedAt = performance.now();
  const { serviceId } = req.params;
  const path = req.url.startsWith("/") ? req.url : `/${req.url}`;

  try {
    const service = await MonitoringService.findById(serviceId).lean();
    if (!service || !service.isActive) return res.status(404).json({ success: false, message: "Monitoring service not found" });

    const [apiKey, client] = await Promise.all([
      ApiKey.findOne({ _id: service.apiKeyId, clientId: service.clientId, isActive: true }),
      Client.findOne({ _id: service.clientId, isActive: true }),
    ]);
    if (!apiKey || !client) return res.status(403).json({ success: false, message: "Monitoring service is inactive" });

    const targetUrl = new URL(path, service.baseUrl.endsWith("/") ? service.baseUrl : `${service.baseUrl}/`);
    const hasBody = !["GET", "HEAD"].includes(req.method);
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: forwardedHeaders(req.headers),
      body: hasBody ? req : undefined,
      duplex: hasBody ? "half" : undefined,
      redirect: "manual",
    });

    res.status(upstream.status);
    responseHeaders(upstream.headers, res);
    if (upstream.body) await pipeline(Readable.fromWeb(upstream.body), res);
    else res.end();

    await publishHit({
      service, apiKey, path: targetUrl.pathname, method: req.method,
      statusCode: upstream.status, latencyMs: Math.round(performance.now() - startedAt), req,
    });
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startedAt);
    logger.error("Proxy request failed", { serviceId, path, error: error.message });
    if (!res.headersSent) res.status(502).json({ success: false, message: "Unable to reach the registered service" });
    const service = await MonitoringService.findById(serviceId).lean().catch(() => null);
    if (service) {
      const apiKey = await ApiKey.findOne({ _id: service.apiKeyId, clientId: service.clientId, isActive: true }).catch(() => null);
      if (apiKey) await publishHit({ service, apiKey, path: path.split("?")[0], method: req.method, statusCode: 502, latencyMs, req });
    }
  }
});

export default router;
