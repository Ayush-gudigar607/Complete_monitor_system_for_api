import { EventEmitter } from "node:events";

export class ConformChannelManager extends EventEmitter {
  constructor({ rabbitmq, logger }) {
    super();
    this.rabbitmq = rabbitmq;
    this.logger = logger || console;
    this.channel = null;
    this._connecting = false;
    this._connectWaiters = [];
  };

  async getChannel() {
    if (this.channel) return this.channel;
    if (this._connecting) {
      return new Promise((resolve, reject) => {
        this._connectWaiters.push({ resolve, reject });
      });
    };

    return this._connect();
  };

  async _connect() {
    this._connecting = true;
    try {
      let connection;
      if (this.rabbitmq.connection) {
        connection = this.rabbitmq.connection;
      } else {
        const baseChannel = await this.rabbitmq.connect();
        if (!baseChannel) {
          throw new Error("Failed to establish RabbitMQ connection");
        }
        connection = this.rabbitmq.connection;
      }

      //now we have to connect to the channel
      const conformChannel = await connection.createConfirmChannel();

      conformChannel.on("drain", () => {
        this.emit("drain");
      });

      conformChannel.on("close", () => {
        this.logger.error("Conform channel closed");
        this.channel = null;
        this.emit("close");
      });

      conformChannel.on("error", (err) => {
        this.logger.error("Conform channel error:", {
          error: err.message,
          stack: err.stack,
          code: err.code,
        });
        this.channel = null;
        this.emit("error", err);
      });

      this.channel = conformChannel;
      this.logger.info("conform channel created successfully");

      //for the waiters
      for (const waiter of this._connectWaiters) waiter.resolve(conformChannel);
      this._connectWaiters = [];
      
      // Return the channel for the current call
      return conformChannel;
    } catch (err) {
      for (const waiter of this._connectWaiters) waiter.reject(err);
      this._connectWaiters = [];
      this.logger.error("Error creating conform channel", {
        error: err.message,
        stack: err.stack,
        code: err.code,
      });
      throw err;
    } finally {
      this._connecting = false;
    };
  };
};
