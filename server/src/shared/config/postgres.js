import pg from "pg";
import config from "./index.js";
import logger from "./logger.js";

const { Pool } = pg;

class PostgresConnection {
  constructor() {
    this.pool = null;
  }
  //This method will create a new pool if it doesn't exist and return the existing pool if it does
  getPool() {
    if (!this.pool) {
      this.pool = new Pool({
        host: config.postgres.host,
        port: config.postgres.port,
        database: config.postgres.database,
        user: config.postgres.user,
        password: config.postgres.password,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      this.pool.on("error", (err, client) => {
        logger.error("Unexpected error on idle client", err);
        process.exit(-1);
      });

      logger.info("PG Pool Created Successfully");
    }
    return this.pool;
  }
  //This method will connect to the database and log the connection status
  async connect() {
    try {
      const pool = this.getPool();
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS endpoint_metrics (
            id BIGSERIAL PRIMARY KEY,
            client_id VARCHAR(24) NOT NULL,
            service_name VARCHAR(255) NOT NULL,
            endpoint VARCHAR(2048) NOT NULL,
            method VARCHAR(10) NOT NULL,
            total_hits BIGINT NOT NULL DEFAULT 0,
            error_hits BIGINT NOT NULL DEFAULT 0,
            avg_latency NUMERIC(12, 3) NOT NULL DEFAULT 0,
            min_latency NUMERIC(12, 3) NOT NULL DEFAULT 0,
            max_latency NUMERIC(12, 3) NOT NULL DEFAULT 0,
            time_bucket TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT endpoint_metrics_unique_bucket
              UNIQUE (client_id, service_name, endpoint, method, time_bucket)
          )
        `);
        await client.query("CREATE INDEX IF NOT EXISTS idx_endpoint_metrics_time ON endpoint_metrics (time_bucket)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_endpoint_metrics_client_endpoint ON endpoint_metrics (client_id, service_name, endpoint)");
        const result = await client.query("SELECT NOW()");
        logger.info(`Postgres Connected Successfully at ${result.rows[0].now}`);
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error("Postgres Connection Error", error);
      throw error;
    }
  }
  //This method will close the pool and log the connection status
  async close()
  {
    if(this.pool)
    {
        await this.pool.end();
        this.pool=null;
        logger.info("Postgres Pool Closed Successfully");
    }
  }
  //This method will execute a query and log the query and its execution time
  async query(text,params)
  {
    const pool=this.getPool();
    const start=Date.now();
    try {
        // `pg` treats a second argument as a callback/config overload. Passing
        // an explicit `undefined` therefore does not reliably return a Promise
        // when callers provide a query-config object (as MetricsRepository does).
        const result = params === undefined
          ? await pool.query(text)
          : await pool.query(text, params);
        const duration=Date.now()-start;
        logger.info(`Expected query:${text} with params:${params} took ${duration} ms`);
        return result;
    } catch (error) {
        logger.error('Failed to exexute query',error);
        throw error;
    }
  }
}

export default new PostgresConnection();
