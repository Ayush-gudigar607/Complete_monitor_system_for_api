import logger from "../../../shared/config/logger.js";
import AppError from "../../../shared/utils/AppError.js";

export class AnalyticsService {
  constructor({ metricsRepository }) {
    if (!metricsRepository) throw new Error("metricsRepository is required");
    this.metricsRepository = metricsRepository;
  }

  _parseTimeFilters(filters) {
    let { startTime, endTime } = filters || {};

    if (!startTime) {
      startTime = new Date();
      //for example if current time is 2023-06-01T12:00:00Z then startTime will be 2023-05-31T12:00:00Z
      startTime.setHours(startTime.getHours() - 24);
    } else {
      startTime = new Date(startTime);
    }

    if (!endTime) {
      //for example if current time is 2023-06-01T12:00:00Z then endTime will be 2023-06-01T12:00:00Z
      endTime = new Date();
    } else {
      endTime = new Date(endTime);
    }

    return { startTime, endTime };
  }

  async getOverallStats(clientId, filters = {}) {
    try {
      const { startTime, endTime } = this._parseTimeFilters(filters);
      const stats = await this.metricsRepository.getOverallStats(
        clientId,
        startTime,
        endTime,
      );

      const totalHits = parseInt(stats.total_hits) || 0;
      const errorHits = parseInt(stats.error_hits) || 0;
      const errorRate = totalHits > 0 ? (errorHits / totalHits) * 100 : 0;

      return {
        totalHits,
        errorHits,
        successHits: totalHits - errorHits,
        errorRate: parseFloat(errorRate.toFixed(2)),
        avgLatency: parseFloat(stats.avg_latency) || 0,
        uniqueServices: parseInt(stats.unique_services) || 0,
        uniqueEndpoints: parseInt(stats.unique_endpoints) || 0,
        timeRange: {
          startTime,
          endTime,
        },
      };
    } catch (error) {
      logger.error("Error in getOverallStats", error);
      throw error;
    }
  }

  async getTopEndpoints(clientId, options = {}) {
    try {
      const { limit = 10, startTime } = options;

      const parsedStartTime = startTime ? new Date(startTime) : null;

      const endpoints = await this.metricsRepository.getEndpoints(
        clientId,
        limit,
        parsedStartTime,
      );

      return endpoints.map((endpoint) => ({
        serviceName: endpoint.service_name,
        endpoint: endpoint.endpoint,
        method: endpoint.method,
        totalHits: parseInt(endpoint.total_hits) || 0,
        averageLatency: parseFloat(
          parseFloat(endpoint.avg_latency || 0).toFixed(2),
        ),
        errorHits: parseInt(endpoint.error_hits) || 0,
        errorRate:
          endpoint.total_hits > 0
            ? parseFloat(
                ((endpoint.error_hits / endpoint.total_hits) * 100).toFixed(2),
              )
            : 0,
      }));
    } catch (error) {
      logger.error("Error in getTopEndpoints", error);
      throw error;
    }
  }

  async getTimeSeries(clientId, options = {}) {
    try {
      const {
        serviceName,
        endpoint,
        startTime,
        endTime,
        granularity = "hour",
        limit = 24,
      } = options;

      const { endTime: end_time, startTime: start_time } =
        this._parseTimeFilters({ startTime, endTime });

      const metrics = await this.metricsRepository.getMetrics({
        clientId,
        serviceName,
        endpoint,
        granularity,
        startTime: start_time,
        endTime: end_time,
        limit,
      });

      return metrics.map((metric) => ({
        serviceName: metric.service_name,
        endpoint: metric.endpoint,
        method: metric.method,
        totalHits: parseInt(metric.total_hits) || 0,
        errorHits: parseInt(metric.error_hits) || 0,
        averageLatency: parseFloat(
          parseFloat(metric.avg_latency || 0).toFixed(2),
        ),
        minLatency: parseFloat(parseFloat(metric.min_latency || 0).toFixed(2)),
        maxLatency: parseFloat(parseFloat(metric.max_latency || 0).toFixed(2)),
        timeBucket: metric.time_bucket,
      }));
    } catch (error) {
      logger.error("Error in getTimeSeries", error);
      throw error;
    }
  }
}
