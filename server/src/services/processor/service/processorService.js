import logger from "../../../shared/config/logger.js";

export class ProcessorService {
  constructor({ apiHitRepository, metricsRepository }) {
    if (!apiHitRepository || !metricsRepository) {
      throw new Error(
        "Both apiHitRepository and metricsRepository are required",
      );
    }
    this.apiHitRepository = apiHitRepository;
    this.metricsRepository = metricsRepository;
  }

  getTimeBucket(timeStamp, interval = "hour") {
    const date = new Date(timeStamp);

    switch (interval) {
      case "hour":
        date.setMinutes(0, 0, 0);
        break;
      case "day":
        date.setHours(0, 0, 0, 0);
        break;
      case "minute":
        date.setSeconds(0, 0);
        break;
      default:
        date.setMinutes(0, 0, 0);
    }
    return date;
  }

  async processEvent(eventData) {
    let rawEventSaved = false;
    try {
      logger.info("Processing event data:", {
        eventId: eventData.eventId,
        clientId: eventData.clientId,
        serviceName: eventData.serviceName,
        endpoint: eventData.endpoint,
        method: eventData.method,
      });

      // Step 1: Save raw event data in MongoDB (Critical)
      await this.apiHitRepository.save(eventData);
      rawEventSaved = true;

      logger.info(
        `Raw event data saved successfully for eventId: ${eventData.eventId}`,
      );

      // Step 2: Update aggregated time-series metrics in PostgreSQL (Non-critical)
      await this._updateMetricsWithFallback(eventData);

      logger.info(
        `Event processing completed successfully for eventId: ${eventData.eventId}`,
      );
    } catch (err) {
      if (!rawEventSaved) {
        logger.error(
          `Error processing raw eventId: ${eventData.eventId}, error: ${err.message}`,
        );
        throw err;
      }
      logger.error(
        `Non-critical error occurred while updating metrics for eventId: ${eventData.eventId}, error: ${err.message}`,
      );
    }
  }

  async _updateMetricsWithFallback(eventData) {
    try {
      const timeBucket = this.getTimeBucket(eventData.timestamp);

      const metricsData = {
        clientId: eventData.clientId.toString(),
        serviceName: eventData.serviceName,
        endpoint: eventData.endpoint,
        method: eventData.method,
        totalHits: 1,
        errorHits: eventData.statusCode >= 400 ? 1 : 0,
        avgLatency: eventData.latencyMs,
        minLatency: eventData.latencyMs,
        maxLatency: eventData.latencyMs,
        timeBucket: timeBucket,
      };

      await this.metricsRepository.upsertMetrics(metricsData);

      logger.info(
        `Metrics updated successfully for eventId: ${eventData.eventId}`,
      );
    } catch (err) {
      logger.error(
        `Error updating metrics for eventId: ${eventData.eventId}, error: ${err.message}`,
      );
      // Re-throwing lets processEvent swallow it as non-critical since rawEventSaved is true
      throw err;
    }
  }

  async cleanUpOldMetrics(daysToKeep = 30) {
    try {
      //first get the date
      let cutOffDate = new Date();

      //daysTokeep is by deafult 30 days
      cutOffDate.setDate(cutOffDate.getDate() - daysToKeep);

      //this will delete the old records
      const deletedCount =
        await this.apiHitRepository.deleteOldHits(cutOffDate);
      logger.info(
        `Cleaned up ${deletedCount} old API hits older than ${cutOffDate}`,
      );
      return deletedCount;
    } catch (err) {
      logger.error(`Error cleaning up old metrics: ${err.message}`);
      throw err;
    }
  }
}
