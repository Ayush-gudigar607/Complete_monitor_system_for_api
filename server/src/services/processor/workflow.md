                           ┌──────────────────────────────┐
                           │       API / Client Service   │
                           │                              │
                           │   API_HIT Event Generated    │
                           └──────────────┬───────────────┘
                                          │
                                          │ publish event
                                          ▼
                           ┌──────────────────────────────┐
                           │          RabbitMQ             │
                           │                              │
                           │     API_HIT Queue             │
                           └──────────────┬───────────────┘
                                          │
                                          │ consume()
                                          ▼
                ┌────────────────────────────────────────────────┐
                │              PROCESSOR SERVICE                 │
                │                                                │
                │  ┌──────────────────────────────────────────┐  │
                │  │             EventConsumer                │  │
                │  │                                          │  │
                │  │  1. Receive RabbitMQ message             │  │
                │  │  2. Circuit Breaker check                │  │
                │  │  3. Parse JSON                           │  │
                │  │  4. Zod schema validation                │  │
                │  │  5. Idempotency check                    │  │
                │  │  6. Route event by type                  │  │
                │  └──────────────────────┬───────────────────┘  │
                │                         │                      │
                │                         │ API_HIT              │
                │                         ▼                      │
                │  ┌──────────────────────────────────────────┐  │
                │  │          ProcessorService                │  │
                │  │                                          │  │
                │  │       processEvent(eventData)             │  │
                │  └──────────────────────┬───────────────────┘  │
                │                         │                      │
                │             ┌───────────┴───────────┐          │
                │             │                       │          │
                │             ▼                       ▼          │
                │  ┌────────────────────┐   ┌─────────────────┐ │
                │  │ ApiHitRepository   │   │ MetricsRepository│ │
                │  │                    │   │                 │ │
                │  │ save(raw event)    │   │ upsert metrics  │ │
                │  └─────────┬──────────┘   └────────┬────────┘ │
                └────────────┼───────────────────────┼──────────┘
                             │                       │
                             ▼                       ▼
                     ┌───────────────┐      ┌──────────────────┐
                     │   MongoDB     │      │   PostgreSQL     │
                     │               │      │                  │
                     │ Raw API Hits  │      │ Aggregated       │
                     │ / Events      │      │ Endpoint Metrics │
                     └───────────────┘      └──────────────────┘


                FAILURE / RESILIENCY PATH
                ─────────────────────────

                      Processing failure
                              │
                              ▼
                    ┌──────────────────┐
                    │ Is error retryable│
                    │      ?           │
                    └────────┬─────────┘
                       YES   │   NO
                             │
              ┌──────────────┘
              ▼
       ┌──────────────────┐
       │ RetryStrategy    │
       │                  │
       │ exponential/back │
       │ off + jitter     │
       └────────┬─────────┘
                │
                │ retry
                ▼
          RabbitMQ Queue
                │
                └───────────────► Processor


                       NO / MAX RETRIES
                              │
                              ▼
                    ┌──────────────────┐
                    │       DLQ        │
                    │                  │
                    │ queue.dlq        │
                    │                  │
                    │ reason            │
                    │ error             │
                    │ retry count       │
                    └──────────────────┘


                 CIRCUIT BREAKER PATH

                 repeated failures
                        │
                        ▼
             ┌─────────────────────┐
             │   Circuit Breaker   │
             │                     │
             │ failure threshold=5 │
             └──────────┬──────────┘
                        │
                     OPEN
                        │
                        ▼
              Message requeued
              back to RabbitMQ
                        │
                        ▼
                  cooldown
                        │
                        ▼
                  HALF-OPEN
                        │
                  test requests
                        │
              ┌─────────┴─────────┐
              │                   │
           success             failure
              │                   │
              ▼                   ▼
            CLOSED              OPEN