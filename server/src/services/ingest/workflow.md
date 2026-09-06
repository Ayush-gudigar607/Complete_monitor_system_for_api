                         EXTERNAL CLIENT / API
                                │
                                │ POST /ingest
                                │
                                ▼
                    ┌────────────────────────┐
                    │     Ingest Router      │
                    │                        │
                    │  validateApiKey        │
                    │  rateLimiter           │
                    └────────────┬───────────┘
                                 │
                     ┌───────────┴───────────┐
                     │                       │
                 INVALID                   VALID
                     │                       │
                     ▼                       ▼
                 401 / 4xx          ┌──────────────────┐
                                    │ IngestController │
                                    │                  │
                                    │ ingestHit()      │
                                    └────────┬─────────┘
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │  IngestService   │
                                    │                  │
                                    │ Validate data   │
                                    │ Normalize data  │
                                    │ Generate Event  │
                                    └────────┬─────────┘
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │   EventProducer  │
                                    │                  │
                                    │ publishApiHit()  │
                                    └────────┬─────────┘
                                             │
                                  ┌──────────┴───────────┐
                                  │                      │
                              SUCCESS                  FAILURE
                                  │                      │
                                  ▼                      ▼
                         ┌─────────────────┐      ┌─────────────┐
                         │    RabbitMQ     │      │  Rejected   │
                         │                 │      │             │
                         │   API_HIT Queue │      │ HTTP 503    │
                         └────────┬────────┘      └─────────────┘
                                  │
                                  │ asynchronous
                                  ▼
                         ┌──────────────────┐
                         │ Processor Service │
                         └────────┬─────────┘
                                  │
                                  ▼
                       MongoDB + PostgreSQL