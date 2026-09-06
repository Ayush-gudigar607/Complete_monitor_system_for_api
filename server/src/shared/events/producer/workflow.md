                         ┌──────────────────────────┐
                         │      API Request /       │
                         │      Monitoring Logic    │
                         └────────────┬─────────────┘
                                      │
                                      │ API_HIT event
                                      ▼
                    ┌────────────────────────────────┐
                    │       EventProducer            │
                    │                                │
                    │  publishApiHit(eventData)      │
                    └───────────────┬────────────────┘
                                    │
                                    ▼
                         ┌────────────────────┐
                         │ Shutdown Check     │
                         └─────────┬──────────┘
                                   │
                              Active?
                            ┌──────┴──────┐
                           No             Yes
                           │               │
                           ▼               ▼
                     Reject Event     Circuit Breaker
                                           │
                                           ▼
                              ┌────────────────────────┐
                              │    CircuitBreaker      │
                              │                        │
                              │ CLOSED / OPEN /        │
                              │ HALF_OPEN              │
                              └───────────┬────────────┘
                                          │
                                  Request Allowed?
                              ┌───────────┴───────────┐
                             No                       Yes
                             │                         │
                             ▼                         ▼
                     Reject Publish          Generate Correlation ID
                                                       │
                                                       ▼
                                             ┌───────────────────┐
                                             │   Retry Strategy  │
                                             │                   │
                                             │ Attempt publish   │
                                             └─────────┬─────────┘
                                                       │
                                                       ▼
                                             ┌───────────────────┐
                                             │   ChannelManager  │
                                             │                   │
                                             │ getChannel()      │
                                             └─────────┬─────────┘
                                                       │
                                                       ▼
                                             ┌───────────────────┐
                                             │     RabbitMQ      │
                                             │                   │
                                             │ queue: queueName  │
                                             └─────────┬─────────┘
                                                       │
                                      ┌────────────────┴───────────────┐
                                      │                                │
                                  SUCCESS                            ERROR
                                      │                                │
                                      ▼                                ▼
                             ┌─────────────────┐             ┌──────────────────┐
                             │ onSuccess()     │             │ isRetryable()?   │
                             │                 │             └────────┬─────────┘
                             │ published++    │                      │
                             └────────┬────────┘                 ┌────┴────┐
                                      │                         │         │
                                      ▼                        Yes        No
                                   DONE                         │         │
                                                               ▼         ▼
                                                   ┌────────────────┐  ┌──────────────┐
                                                   │ Wait + Retry   │  │ onFailure()  │
                                                   │ exponential    │  │ failed++     │
                                                   │ backoff+jitter │  └──────┬───────┘
                                                   └───────┬────────┘         │
                                                           │                  ▼
                                                           │          Retry exhausted /
                                                           │          publish failed
                                                           │
                                                           └──────────► retry publish