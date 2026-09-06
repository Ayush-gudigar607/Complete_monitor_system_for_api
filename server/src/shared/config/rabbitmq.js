import amqp from "amqplib";
import config from "./index.js";
import logger from "./logger.js";

class RabbitMqConnection {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.connecting = null;
  }
  //This method will connect to rabbitmq and return the channel
  async connect() {
    if (this.channel) {
      return this.channel;
    }
    if (this.connecting) {
      return this.connecting;
    }

    this.connecting = (async () => {
      try {
        logger.info("Connecting to RabbitMQ...", config.rabbitmq.url);
        this.connection = await amqp.connect(config.rabbitmq.url);
        this.channel = await this.connection.createChannel();

        //creating key
        const dlqName = `${config.rabbitmq.queue}.dlq`;

        //DL QUEUE
        await this.channel.assertQueue(dlqName, {
          durable: true,
        });

        //normal queue
        await this.channel.assertQueue(config.rabbitmq.queue, {
          durable: true,
          arguments: {
            "x-dead-letter-exchange": "",
            "x-dead-letter-routing-key": dlqName,
          },
        });
        //log the connection status
        logger.info("Rabbitmq connected successfully");

        //when connection closed
        this.connection.on("close", () => {
          logger.error("Rabbitmq connection closed");
          this.connection = null;
          this.channel = null;
        });

        //when error occurs
        this.connection.on("error", (err) => {
          logger.error("Rabbitmq connection error", err);
          this.connection = null;
          this.channel = null;
        });

        //return the channel
        return this.channel;
      } catch (error) {
        this.connection = null;
        this.channel = null;
        logger.error("Error connecting to RabbitMQ:", error);
        throw error;
      } finally {
        this.connecting = null;
      }
    })();

    return this.connecting;
  }

  //This method will return the channel
  getChannel() {
    return this.channel;
  }

  //This method will return the connection status
  getStatus() {
    if (!this.connection || !this.channel) return "disconnected";
    if (this.connection.closing) return "closing";
    return "connected";
  }

  //This method will close the connection
  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      //close the connection
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      //log the connection status
      logger.info("Rabbitmq connection closed successfully");
    } catch (error) {
      logger.error("Error closing Rabbitmq connection");
    }
  }
}

export default new RabbitMqConnection();
