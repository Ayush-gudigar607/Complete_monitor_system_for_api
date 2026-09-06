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
);

CREATE INDEX IF NOT EXISTS idx_endpoint_metrics_time
    ON endpoint_metrics (time_bucket);

CREATE INDEX IF NOT EXISTS idx_endpoint_metrics_client_endpoint
    ON endpoint_metrics (client_id, service_name, endpoint);
