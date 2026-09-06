import { BaseRepository } from "./BaseRepository.js";

// instead of 10000000 records it allows only 1000 records
const MAX_LIMIT = 1000;
const DEFAULT_LIMIT = 30000;

export class MetricsRepository extends BaseRepository {
  constructor({ logger: l, postgres: pg = {} }) {
    super({ logger: l });
    if (!pg) {
      throw new Error("Postgres client is required");
    };
    this.postgres = pg;
  };

  _query(sql, params = [], client = this.postgres) {
    const target = client || this.postgres;

    if (!target || typeof target.query !== "function") {
      const err = new Error("Postgres client is not configured properly");
      this.logger.error(err.message);
      throw err;
    };

    // Returns a promise that resolves with the query result or rejects with an error; DEFAULT_LIMIT defaults to 30 seconds (adjust as needed).
    return target.query({
      text: sql,
      values: params,
      statement_timeout: DEFAULT_LIMIT,
    });
  };
  //UPSERT is being used to continuously accumulate API traffic metrics without creating duplicate rows for the same endpoint/time bucket.
  async upsertMetrics(metricsData) {
    try {
      const {
        clientId,
        serviceName,
        endpoint,
        method,
        totalHits,
        errorHits,
        avgLatency,
        minLatency,
        maxLatency,
        timeBucket,
      } = metricsData;

      const query = `INSERT INTO endpoint_metrics(client_id, service_name, endpoint, method, total_hits, error_hits, avg_latency, min_latency, max_latency, time_bucket) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (client_id, service_name, endpoint, method, time_bucket) 
       DO UPDATE SET total_hits = endpoint_metrics.total_hits + EXCLUDED.total_hits, 
       error_hits = endpoint_metrics.error_hits + EXCLUDED.error_hits, 
       avg_latency = (endpoint_metrics.avg_latency * endpoint_metrics.total_hits + EXCLUDED.avg_latency * EXCLUDED.total_hits) / (endpoint_metrics.total_hits + EXCLUDED.total_hits),
       min_latency = LEAST(endpoint_metrics.min_latency, EXCLUDED.min_latency), 
       max_latency = GREATEST(endpoint_metrics.max_latency, EXCLUDED.max_latency)`;

      await this._query(query, [
        clientId,
        serviceName,
        endpoint,
        method,
        totalHits,
        errorHits,
        avgLatency,
        minLatency,
        maxLatency,
        timeBucket,
      ]);
    } catch (err) {
      this.logger.error(`Error upserting metrics: ${err.message}`);
      throw err;
    };
  };

  async getMetrics(filter = {}) {
    try {
      const {
        clientId,
        serviceName,
        endpoint,
        method,
        granularity = "hour",
        startTime,
        endTime,
        limit = 100,
        offset = 0,
      } = filter;

      //safeLimit is used to ensure that the limit is within a reasonable range, preventing potential performance issues or excessive data retrieval.
      const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);

      //safeoffset is used to ensure that the offset is not negative, which could lead to unexpected behavior in the query.
      const safeOffset = Math.max(offset, 0);
      const bucketExpression = {
        hour: "time_bucket",
        day: "date_trunc('day', time_bucket)",
        month: "date_trunc('month', time_bucket)",
      }[granularity] || "time_bucket";

      let query = `SELECT 
    service_name, endpoint, method,
    SUM(total_hits) AS total_hits,
    SUM(error_hits) AS error_hits,
    AVG(avg_latency) AS avg_latency,
    MIN(min_latency) AS min_latency,
    MAX(max_latency) AS max_latency,
    ${bucketExpression} AS time_bucket FROM endpoint_metrics`;

      const params = [];
      let paramIndex = 1;

      let whereConditions = [];

      if (clientId != null) {
        whereConditions.push(`client_id=$${paramIndex}`);
        params.push(clientId);
        paramIndex++;
      };

      if (serviceName) {
        whereConditions.push(`service_name=$${paramIndex}`);
        params.push(serviceName);
        paramIndex++;
      };

      if (endpoint) {
        whereConditions.push(`endpoint=$${paramIndex}`);
        params.push(endpoint);
        paramIndex++;
      };

      if (startTime) {
        whereConditions.push(`time_bucket >= $${paramIndex}`);
        params.push(startTime);
        paramIndex++;
      };

      if (endTime) {
        whereConditions.push(`time_bucket <= $${paramIndex}`);
        params.push(endTime);
        paramIndex++;
      };

      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(" AND ")}`;
      };

      query += ` GROUP BY service_name, endpoint, method, ${bucketExpression}
      ORDER BY time_bucket DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

      params.push(safeLimit, safeOffset);

      const result = await this._query(query, params);
      return result.rows;
    } catch (err) {
      this.logger.error(`Error getting metrics: ${err.message}`);
      throw err;
    };
  };

  async getEndpoints(clientId, limit = 10, startTime = null) {
    try {
      const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
      let query = `
       SELECT 
       service_name, endpoint, method,
       SUM(total_hits) AS total_hits,
       SUM(avg_latency * total_hits) / NULLIF(SUM(total_hits), 0) as avg_latency,
       SUM(error_hits) AS error_hits 
       FROM endpoint_metrics`;

      const params = [];
      let paramIndex = 1;

      let whereConditions = [];

      if (clientId != null) {
        whereConditions.push(`client_id=$${paramIndex}`);
        params.push(clientId);
        paramIndex++;
      };

      if (startTime) {
        whereConditions.push(`time_bucket >= $${paramIndex}`);
        params.push(startTime);
        paramIndex++;
      };

      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(" AND ")}`;
      }

      query += ` GROUP BY service_name, endpoint, method
        ORDER BY total_hits DESC
        LIMIT $${paramIndex}`;

      params.push(safeLimit);

      const result = await this._query(query, params);
      return result.rows;
    } catch (err) {
      this.logger.error(`Error getting endpoints: ${err.message}`);
      throw err;
    };
  };

  async getOverallStats(clientId, startTime = null, endTime = null) {
    try {
      let query = `SELECT 
        SUM(total_hits) AS total_hits,
        SUM(error_hits) AS error_hits,
        SUM(avg_latency * total_hits) / NULLIF(SUM(total_hits), 0) AS avg_latency,
        COUNT(DISTINCT service_name) AS unique_services,
        COUNT(DISTINCT endpoint) AS unique_endpoints
        FROM endpoint_metrics`;

      const params = [];
      let paramIndex = 1;
      const whereConditions = [];

      if (clientId != null) {
        whereConditions.push(`client_id=$${paramIndex}`);
        params.push(clientId);
        paramIndex++;
      };

      if (startTime) {
        whereConditions.push(`time_bucket >= $${paramIndex}`);
        params.push(startTime);
        paramIndex++;
      };

      //here time_bucket is a timestamp column in the endpoint_metrics table that represents the time interval for which the metrics are aggregated. The <= operator is used to filter the records based on the endTime parameter, ensuring that only metrics within the specified time range are considered in the overall statistics calculation.
      if (endTime) {
        //paramindex provides the date for the particular time bucket to be considered in the overall statistics calculation. It ensures that only metrics within the specified time range are included in the final result.
        whereConditions.push(`time_bucket <= $${paramIndex}`);
        params.push(endTime);
        paramIndex++;
      };

      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(" AND ")}`;
      }

      const result = await this._query(query, params);
      return result.rows[0] || {};
    } catch (err) {
      this.logger.error(`Error getting overall stats: ${err.message}`);
      throw err;
    };
  };
};
