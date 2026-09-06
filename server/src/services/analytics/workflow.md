                         ┌──────────────────────┐
                         │     Frontend /       │
                         │     Dashboard UI     │
                         └──────────┬───────────┘
                                    │
                                    │ GET /analytics/...
                                    ▼
                    ┌──────────────────────────────┐
                    │       ANALYTICS SERVICE      │
                    │                              │
                    │  ┌────────────────────────┐  │
                    │  │        Router          │  │
                    │  │                        │  │
                    │  │  /status               │  │
                    │  │  /dashboard            │  │
                    │  └───────────┬────────────┘  │
                    │              │               │
                    │              ▼               │
                    │  ┌────────────────────────┐  │
                    │  │   Authentication       │  │
                    │  │                        │  │
                    │  │ authenticate middleware │  │
                    │  └───────────┬────────────┘  │
                    │              │               │
                    │              ▼               │
                    │  ┌────────────────────────┐  │
                    │  │   AnalyticController   │  │
                    │  │                        │  │
                    │  │ Permission Check       │  │
                    │  │ Client Resolution      │  │
                    │  │ Time Validation        │  │
                    │  └───────────┬────────────┘  │
                    │              │               │
                    │              ▼               │
                    │  ┌────────────────────────┐  │
                    │  │    AnalyticsService    │  │
                    │  │                        │  │
                    │  │ Overall Stats          │  │
                    │  │ Top Endpoints          │  │
                    │  │ Time Series            │  │
                    │  └───────────┬────────────┘  │
                    │              │               │
                    │              ▼               │
                    │  ┌────────────────────────┐  │
                    │  │   MetricsRepository    │  │
                    │  └───────────┬────────────┘  │
                    └──────────────┼───────────────┘
                                   │
                                   ▼
                         ┌────────────────────┐
                         │    PostgreSQL      │
                         │                    │
                         │ Aggregated Metrics │
                         │                    │
                         │ • total hits       │
                         │ • error hits       │
                         │ • latency          │
                         │ • time buckets     │
                         │ • endpoints        │
                         └────────────────────┘