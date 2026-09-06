import { EVENT_TYPES } from "../eventContracts.js";
import { isRetryable as checkRetryable } from "./RetryStrategy.js";

export class EventProducer {
  constructor({
    channelManager,
    circuitBreaker,
    retryStrategy,
    logger,
    queueName,
  }) {
    if (!channelManager) {
      throw new Error("channelManager is required");
    };

    if (!circuitBreaker) {
      throw new Error("circuitBreaker is required");
    };

    if (!retryStrategy) {
      throw new Error("retryStrategy is required");
    };

    if (!logger) {
      throw new Error("logger is required");
    };

    if (!queueName) {
      throw new Error("queueName is required");
    };

    this.channelManager = channelManager;
    this.circuitBreaker = circuitBreaker;
    this.retryStrategy = retryStrategy;
    this.logger = logger;
    this.queueName = queueName;

    this.metrics = {
      published: 0,
      failed: 0,
      retriesExhausted: 0,
    };

    this._shutdown = false;
  }

  // Track system health
  _incrementMetric(metric) {
    if(this._shutdown) {
      this.logger.warn(`Attempted to increment metric ${metric} after shutdown`);
      return;
    };
    
    if (!Object.prototype.hasOwnProperty.call(this.metrics, metric)) {
      this.logger.warn(`Attempted to increment unknown metric ${metric}`);
      return;
    };
    
    this.metrics[metric] = (this.metrics[metric] || 0) + 1;
  }

  /**
   * Publish a single message to RabbitMQ
   */
  async publish(eventData, { correlationId, attempt = 0 }) {
    const channel = await this.channelManager.getChannel();

    if(!channel) {
      throw new Error("Failed to get a valid channel for publishing");
    }

    const message = {
      type: EVENT_TYPES.API_HIT,
      data: eventData,
      publishedAt: new Date().toISOString(),
      attempt: attempt + 1,
    };

    // Convert message to Buffer
    const messageBuffer = Buffer.from(JSON.stringify(message));

    const publishOptions = {
      persistent: true,
      contentType: "application/json",
      messageId: eventData.eventId,
      correlationId,
      timestamp: Math.floor(Date.now() / 1000),
    };

    return new Promise((resolve, reject) => {
      const onDrain = () => {
        channel.removeListener("drain", onDrain);

        this.logger.info(
          "Channel buffer drained, resuming publishing",
          {
            eventId: eventData.eventId,
            correlationId,
            queueName: this.queueName,
          }
        );
      };

      const written = channel.publish(
        "",
        this.queueName,
        messageBuffer,
        publishOptions,
        (err) => {
          if (err) {
            channel.removeListener("drain", onDrain);

            return reject(
              new Error(`Failed to publish message: ${err.message}`)
            );
          };

          channel.removeListener("drain", onDrain);
          resolve();
        }
      );

      if (!written) {
        this.logger.warn(
          "Channel buffer is full, waiting for drain event",
          {
            eventId: eventData.eventId,
            correlationId,
            queueName: this.queueName,
          }
        );

       //This will ensure that we listen for the drain event only when the buffer is full, preventing unnecessary event listeners and potential memory leaks.
        channel.on("drain", onDrain);
      }
    });
  }

  /**
   * Shutdown EventProducer
   */
  async shutDown() {
    if (this._shutdown) {
      return;
    }

    this._shutdown = true;

    this.logger.info("Shutting down EventProducer");

    await this.channelManager.close();

    this.logger.info("EventProducer shutdown complete");
  }

  /**
   * Get producer status
   */
  async getStatus() {
    return {
      metrics: { ...this.metrics },
      circuitBreakerState: this.circuitBreaker.snapshot(),
    };
  }

  /**
   * Publish API hit event with retry and circuit breaker
   */
  async publishApiHit(eventData, opts = {}) {
    // --------------------------------------------------
    // 1. Check shutdown state
    // --------------------------------------------------

    if (this._shutdown) {
      const error = new Error(
        "EventProducer is shutting down, cannot publish new events"
      );

      error.code = "SHUTDOWN";

      this.logger.warn(
        "[EventProducer] Publish rejected - shutting down",
        {
          eventId: eventData.eventId,
          queueName: this.queueName,
        }
      );

      throw error;
    }

    // --------------------------------------------------
    // 2. Check circuit breaker
    // --------------------------------------------------

    if (!this.circuitBreaker.allowedRequest()) {
      const error = new Error(
        "Circuit breaker is open, cannot publish new events"
      );

      error.code = "CIRCUIT_BREAKER_OPEN";

      this.logger.warn(
        "[EventProducer] Publish rejected - circuit breaker open",
        {
          eventId: eventData.eventId,
          queueName: this.queueName,
        }
      );

      return false;
    }

    // --------------------------------------------------
    // 3. Create correlation ID
    // --------------------------------------------------

    const correlationId =
      opts.correlationId ||
      `event-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`;

    const startMs = Date.now();

    let attempt = 0;

    // --------------------------------------------------
    // 4. Retry loop
    // --------------------------------------------------

    while (true) {
      try {
        await this.publish(eventData, {
          correlationId,
          attempt,
        });

        // ------------------------------------------------
        // 5. Publish succeeded
        // ------------------------------------------------

        const latencyMs = Date.now() - startMs;

        this.circuitBreaker.onSuccess();

        this._incrementMetric("published");

        this.logger.info(
          "[EventProducer] Event published successfully",
          {
            eventId: eventData.eventId,
            correlationId,
            queueName: this.queueName,
            latencyMs,
            attempt: attempt + 1,
          }
        );

        return true;
      } catch (err) {
        // ------------------------------------------------
        // 6. Publish failed
        // ------------------------------------------------

        this.logger.error(
          "[EventProducer] Failed to publish event",
          {
            eventId: eventData.eventId,
            correlationId,
            queueName: this.queueName,
            error: err.message,
            stack: err.stack,
            code: err.code,
            attempt: attempt + 1,
          }
        );

        // ------------------------------------------------
        // 7. Determine retry eligibility
        // ------------------------------------------------

        const retryable =
          checkRetryable(err) &&
          this.retryStrategy.shouldRetry(attempt);

        // ------------------------------------------------
        // 8. Do not retry
        // ------------------------------------------------

        if (!retryable) {
          this.circuitBreaker.onFailure();

          this._incrementMetric("failed");

          if (!this.retryStrategy.shouldRetry(attempt)) {
            this._incrementMetric("retriesExhausted");
          }

          this.logger.error(
            "[EventProducer] Event publishing failed, not retrying",
            {
              eventId: eventData.eventId,
              correlationId,
              queueName: this.queueName,
              attempt: attempt + 1,
              error: err.message,
              stack: err.stack,
              code: err.code,
            }
          );

          throw err;
        }

        // ------------------------------------------------
        // 9. Wait before retry
        // ------------------------------------------------

        await this.retryStrategy.wait(attempt);

        // ------------------------------------------------
        // 10. Increase attempt count
        // ------------------------------------------------

        //another attempt will be made, so increment the attempt counter
        attempt++;

        this.logger.warn(
          "[EventProducer] Retrying event publish",
          {
            eventId: eventData.eventId,
            correlationId,
            queueName: this.queueName,
            attempt: attempt + 1,
          }
        );
      }
    };
  };
};

