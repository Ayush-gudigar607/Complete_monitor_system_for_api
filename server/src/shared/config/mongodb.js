import mongoose from "mongoose";
import config from "./index.js";
import logger from "./logger.js";

class MongoConnection {
  constructor() {
    this.connection = null;
  }
  /**
   * @returns {promise<mongoose.connection>}
   */
  async connect() {
    try {
      if (this.connection) {
        logger.info("Mongodb Already connected");
        //help to reduce the multiple connection setup
        return this.connection;
      }
      await mongoose.connect(config.mongo.uri, {
        dbName: config.mongo.dbName,
      });

      //set the connection to the class property
      this.connection = mongoose.connection;

      logger.info(`MongoDB is connected:${config.mongo.uri} `);

      //This will help to log the connection status
      this.connection.on("error", (err) => {
        logger.error("MongoDB connection Error", err);
      });

      //This will help to log the connection status
      this.connection.on("disconnected", () => {
        logger.warn("Mongodb Disconnected");
      });

      //This will help to log the connection status
      this.connection.on("reconnected", () => {
        logger.info("Mongodb Reconnected successfully");
      });

      return this.connection;
    } catch (error) {
      logger.error("MongoDB connection Error", error);
      throw error;
    }
  }

  /**
     @returns {promise<mongoose.disconnect>}
     */

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.connection = null;
        logger.info("MongoDB Disconnected successfully");
      }
    } catch (error) {
      logger.error("MongoDB Disconnection Error", error);
      throw error;
    }
  }

  /**
   *
   * @returns
   */

  getConnection() {
    return this.connection;
  }
}

export default new MongoConnection();
