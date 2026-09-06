import ResponceFormatter from "../../shared/utils/ResponceFormatter.js";
import logger from "../config/logger.js";
import clientContainer from "../../services/client/Dependencies/dependencies.js";

const validateApiKey = async (req, res, next) => {
  try {
    const apiKeyValue = req.headers["x-api-key"];
    if (!apiKeyValue || typeof apiKeyValue !== "string") {
      logger.warn("API key is missing in the request headers", {
        path: req.path,
        ip: req.ip,
      });
      return res
        .status(401)
        .json(ResponceFormatter.error("API key is missing", 401));
    }

    const result = await clientContainer.services.clientService.getClientByApiKey(
      apiKeyValue,
    );

    if (!result) {
      logger.warn("Invalid api key attempted", {
        path: req.path,
        ip: req.ip,
        apiKey: apiKeyValue.substring(0, 8) + "...",
      });

      return res
        .status(401)
        .json(ResponceFormatter.error("Invalid API key", 401));
    }

    const { client, apiKey } = result;

    if (!client.isActive) {
      logger.warn("Inactive client attempted API access", {
        path: req.path,
        ip: req.ip,
        clientId: client._id,
      });

      return res
        .status(403)
        .json(ResponceFormatter.error("client account is inactive", 403));
    }

    if (!apiKey.permissions?.canIngest) {
      logger.warn("API key without Ingest permissions attempted access", {
        path: req.path,
        ip: req.ip,
        apiKeyId: apiKey._id,
      });
      return res
        .status(403)
        .json(
          ResponceFormatter.error("API Key does not ingest permissions", 403),
        );
    }

    req.client = client;
    req.apiKey = apiKey;

    logger.debug("API Key validated successfully ", {
      clientId: client._id,
      clientName: client.name,
      apiKeyId: apiKey._id,
    });
    next();
  } catch (err) {
    logger.error("Error validating API key", { error: err.message });
    return res
      .status(500)
      .json(ResponceFormatter.error("Internal server error", 500));
  }
};

export default validateApiKey;
