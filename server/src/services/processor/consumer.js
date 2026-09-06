import { z } from "zod";
import rabbitmq from "../../shared/config/rabbitmq.js";
import logger from "../../shared/config/logger.js";
import config from "../../shared/config/index.js";
import postgres from "../../shared/config/postgres.js";
import mongodb from "../../shared/config/mongodb.js";
import { EVENT_TYPES } from "../../shared/events/eventContracts.js";
import {
  RetryStrategy,
  isRetryable,
} from "../../shared/events/producer/RetryStrategy.js";
import { CircuitBreaker } from "../../shared/events/producer/CircuitBreaker.js";
import processorContainer from "./dependencies/dependencies.js";

const messageSchema = z.object({
  type: z.enum([EVENT_TYPES.API_HIT]),
  data: z.record(z.string(), z.unknown()),
  messageId: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
});

class EventConsumer {
  constructor({
    processorService,
    rabbitmq,
    mongodb,
    postgres,
    config,
    logger,
    retryStrategy,
    circuitBreaker,
  }) {
    this._processorService = processorService;
    this._rabbitmq = rabbitmq;
    this._mongodb = mongodb;
    this._postgres = postgres;
    this._config = config;
    this._logger = logger;
    this._retryStrategy = retryStrategy;
    this._circuitBreaker = circuitBreaker;

    this.isRunning = false;
    this.channel = null;
    this._stats = {
      processed: 0,
      failed: 0,
      retried: 0,
      dlqRouted: 0,
      lastProcessedAt: null,
    };
    this._processedIds = new Set();
    // Track a failure count per event type. This must be a Map because the
    // error handler reads and updates counts with get()/set().
    this._poisonMessages = new Map();
  }

  async _connectDatabase() {
    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        this._logger.info("Connecting to Databases");
        await Promise.all([
          this._mongodb.connect(),
          this._postgres.connect(),
          this._rabbitmq.connect(),
        ]);

        this._logger.info("Database Connections established");
        return;
      } catch (error) {
        retries++;
        this._logger.error(
          `Database Connection attempt ${retries} failed`,
          error,
        );
        if (retries >= maxRetries) {
          throw new Error(
            `Failed to connect database after ${maxRetries} attempts`,
          );
        }
        //5000 * retries: This calculates the delay in milliseconds. If retries is 1, it waits 5 seconds. If retries is 2, it waits 10 seconds, and so on.
        await new Promise((resolve) => setTimeout(resolve, 5000 * retries));
      }
    }
  }

  async _reconnect() {
    try {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      this.channel = await this._rabbitmq.connect();
      const prefetch = this._config.consumer?.prefetch || 10;
      this.channel.prefetch(prefetch);

      this.channel.on("error", (err) => {
        this._logger.error("Consumer Channel error", err);
        this._circuitBreaker.onFailure();
      });

      await this.channel.on("close", () => {
        this._logger.warn(`Consumer channel closed unexpectedly`);
        if (this.isRunning) this._reconnect();
      });

      await this.channel.consume(
        this._config.rabbitmq.queue,
        async (msg) => {
          if (msg !== null) await this._handleMessage(msg);
        },
        {
          //if noack true it immediatelty deletes it if flase it will be on safe mode
          noAck: false,
          consumerTag: `consumer-${Date.now()}`,
        },
      );
    } catch (error) {
      this._logger.error("Failed to reconnect", error);
      if (this.isRunning) {
        setTimeout(() => this._reconnect(), 1000);
      }
    }
  }

  async _parseMessage(msg) {
    try {
      const content = msg.content.toString();
      const messageData = JSON.parse(content);

      //This mainly help to check the schma
      const parsed = messageSchema.safeParse(messageData);

      if (!parsed.success) {
        throw new Error(`Schema Validation failed:${parsed.error}`);
      }

      return {
        ...parsed.data,
        messageId:
          msg.properties.messageId || messageData.messageId || "unknown",
        retryCount: parseInt(msg.properties.headers?.["x-retry-count"] || 0),
      };
    } catch (error) {
      throw new Error(`Message parsing failed: ${error.message}`);
    }
  }

  async _processMessage(msgData) {
    switch (msgData.type) {
      case EVENT_TYPES.API_HIT:
        await this._processorService.processEvent(msgData.data);
        break;
      default:
        throw new Error(`Unknown event type:${msgData.type}`);
    }
  }

  async _handleMessage(msg) {
    if (!this._circuitBreaker.allowedRequest()) {
      this._logger.warn("Circuit Breaker open,requering message");
      //Only reject this message, not all previously delivered messages
      //Put the message back into the queue.(nack-"I couldn't process it. Put it back.")
      this.channel.nack(msg, false, true);
      return;
    }

    const startTime = Date.now();
    let messageData = null;

    try {
      messageData = await this._parseMessage(msg);

      //idempotency
      if (this._processedIds.has(messageData.messageId)) {
        this._logger.debug("Duplicate Messages are Skipped", {
          messageId: messageData.messageId,
        });

        //ack means message was received and delted automatically
        this.channel.ack(msg);
        return;
      }

      await this._processMessage(messageData);
      this.channel.ack(msg);
      this._circuitBreaker.onSuccess();
      this._stats.processed++;
      this._stats.lastProcessedAt = new Date();
      this._processedIds.add(messageData.messageId);

      if (this._processedIds.size > 100_000) {
        //next will select the value from the first (for example like [1,2,4] i will go for select the 1 by using next function)
        const first = this._processedIds.values().next().value;
        this._processedIds.delete(first);
      }
    } catch (error) {
      await this._handleProcessingError(error, msg, messageData, startTime);
    }
  }

  async _handleProcessingError(error, msg, messageData, startTime) {
    const messageId =
      messageData?.messageId || msg.properties?.messageId || "unknown";
    const retryCount = messageData?.retryCount || 0;
    this._circuitBreaker.onFailure();
    this._stats.failed++;

    const eventType = messageData?.type || "unknown";
    const poisonCount = (this._poisonMessages.get(eventType) || 0) + 1;
    this._poisonMessages.set(eventType, poisonCount);

    if (poisonCount >= 10) {
      this._logger.error("Poison message pattern detected", {
        eventType,
        consecutiveFailures: poisonCount,
      });
    }

    //Non-retryable errors
    if (!isRetryable(error) || !this._retryStrategy.shouldRetry(retryCount)) {
      await this._sendToDLQ(
        msg,
        error,
        retryCount >= this._retryStrategy.maxRetries
          ? "MAX_RETRIES_EXCEEDED"
          : "NON_RETRYABLE",
      );
      return;
    }

    await this._retryMessage(msg, retryCount);
  }

  async _sendToDLQ(msg, error, reason) {
    try {
      const dlqName = `${this._config.rabbitmq.queue}.dlq`;
      this.channel.sendToQueue(dlqName, msg.content, {
        ...msg.properties,
        persistent: true,
        headers: {
          ...msg.properties.headers,
          "x-dlq-reason": reason,
          "x-dlq-error": error.message,
          "x-dlq-timestamp": Date.now(),
          "x-original-queue": this._config.rabbitmq.queue,
        },
      });

      this.channel.ack(msg);
      this._stats.dlqRouted++;
    } catch (error) {
      this._logger.error("Failed to send messages to DLQ", error);
      this.channel.nack(msg, false, false);
    }
  }

  async _retryMessage(msg, retryCount) {
    const delay = this._retryStrategy.delay(retryCount);

    const retryHeaders = {
      ...msg.properties.headers,
      "x-retry-count": retryCount + 1,
      "x-retry-timestamp": Date.now(),
      "x-retry-delay": delay,
      "x-original-queue": this._config.rabbitmq.queue,
    };

    setTimeout(() => {
      try {
        this.channel.sendToQueue(this._config.rabbitmq.queue, msg.content, {
          ...msg.properties,
          headers: retryHeaders,
        });
        this._logger.info("Message scheduled for retry", {
          messageId: msg.properties.messageId,
          retryCount: retryCount + 1,
          delay,
        });
      } catch (error) {
        this._logger.error("Failed to schedule retry:", error);
        this._sendToDLQ(msg, error, "RETRY_FAILED");
      }
    }, delay);

    this.channel.ack(msg);
    this._stats.retried++;
  }

  async _cleanUp() {
    try {
      this.isRunning = false;
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
    } catch (err) {
      this._logger.error("Error during cleanUp:", err);
    }
  }

  async start() {
    try {
      await this._connectDatabase();
      this.channel = await this._rabbitmq.connect();
      const prefetch = this._config.consumer?.prefetch || 10;

      // Set the prefetch count to control the number of unacknowledged messages
      this.channel.prefetch(prefetch);

      this.channel.on("error", (err) => {
        this._logger.error("COnsumer channel closed error:", err);
        this._circuitBreaker.onFailure();
      });

      this.channel.on("close", () => {
        this._logger.warn("Consumer Channel Closed Successfully");
        if (this.isRunning) this._reconnect();
      });

      this._logger.info(
        `Started consuming from queue: ${this._config.rabbitmq.queue}`,
      );
      this.isRunning = true;

      await this.channel.consume(
        this._config.rabbitmq.queue,
        async (msg) => {
          if (msg !== null) await this._handleMessage(msg);
        },
        { noAck: false, consumerTag: `consumer-${Date.now()}` },
      );

      this._logger.info("Event consumer is running");
    } catch (err) {
      this._logger.error("Failed to start consumer:", err);
      await this._cleanUp();
      throw err;
    }
  }

  async stop() {
    try {
      await this._cleanUp();

      await Promise.all([
        this._mongodb.disconnect(),
        this._postgres.close(),
        this._rabbitmq.close(),
      ]);
    } catch (error) {
      this._logger.error("Error during stop:", error);
    }
  }
}

const retryStrategy = new RetryStrategy({
  maxRetries: config.rabbitmq.retryAttempts,
  baseDelay: config.rabbitmq.retryDelay,
  maxDelay: 30_000,
  jitterFactor: 0.3,
});

const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  cooldownMs: 30_000,
  halfOpenMaxAttempts: 3,
  logger,
});

const consumer = new EventConsumer({
  processorService: processorContainer.services.processorService,
  rabbitmq,
  mongodb,
  postgres,
  config,
  logger,
  retryStrategy,
  circuitBreaker,
});

async function startConsumerWithRetry() {
  const startUpRetry = new RetryStrategy({
    maxRetries: 5,
    baseDelay: 5000,
    maxDelay: 30_000,
    jitterFactor: 0.3,
  });

  let attempt = 0;

  while (startUpRetry.shouldRetry(attempt) || attempt === 0) {
    try {
      logger.info(`Starting Event Consumer, Attempt:${attempt + 1}`);
      await consumer.start();
      logger.info("Event Consumer started successfully");
      return;
    } catch (err) {
      attempt++;
      logger.error(`Failed to start Event Consumer, Attempt:${attempt}`, err);

      if (!startUpRetry.shouldRetry(attempt)) {
        logger.error("Max startup retry attempts reached. Exiting process.");
        process.exit(1);
      }

      await startUpRetry.wait(attempt - 1);
    }
  }
}

process.on("SIGINT", async () => {
  logger.info("Received SIGINT, shutting down gracefully...");
  await consumer.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM, shutting down gracefully...");
  await consumer.stop();
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled promise rejection at:", promise, "reason:", reason);
  process.exit(1);
});

startConsumerWithRetry();

export default consumer;
