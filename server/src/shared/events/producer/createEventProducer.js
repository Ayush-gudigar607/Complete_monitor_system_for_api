import config from "../../config/index.js";
import logger from "../../config/logger.js";
import rabbitmqConnection from "../../config/rabbitmq.js";

import {CircuitBreaker} from "./CircuitBreaker.js";
import { ConformChannelManager } from "./ConformChannelManager.js";
import {EventProducer} from "./eventProducer.js";
import {RetryStrategy} from "./RetryStrategy.js";

export function createEventProducer({ overrides = {} } = {})
{
    const log=overrides.logger || logger;
    const rabbitmq=overrides.rabbitmq || rabbitmqConnection;
    const queueName=overrides.queueName || config.rabbitmq.queue;

    if(!rabbitmq)
    {
        throw new Error("RabbitMQ instance is required");
    }

    if(!queueName)
    {
        throw new Error("Queue name is required");
    }

    if(!config.rabbitmq.retryAttempts || config.rabbitmq.retryAttempts<0)
    {
        throw new Error("Invalid retryAttempts configuration");
    }

    const channelManager=overrides.channelManager || new ConformChannelManager({rabbitmq,logger:log});

    const circuitBreaker=overrides.circuitBreaker || new CircuitBreaker({
        failureThreshold: config.rabbitmq.circuitBreaker?.failureThreshold || 5,
        cooldownMs:config.events?.circuitBreaker?.cooldownMs || 30000,
        halfOpenMaxAttempts:config.events?.circuitBreaker?.halfOpenMaxAttempts || 2,
        logger:log
    });

    const retryStrategy=overrides.retryStrategy || new RetryStrategy({
        maxRetries: config.rabbitmq.retryAttempts,
        baseDelay: config.rabbitmq.retryDelay || 1000,
        maxDelay: config.rabbitmq.retryMaxDelay || 30000,
        jitterFactor: config.rabbitmq.retryJitterFactor || 0.3,
    });

    return new EventProducer({
        channelManager,
        circuitBreaker,
        retryStrategy,
        logger:log,
        queueName
    });
}
