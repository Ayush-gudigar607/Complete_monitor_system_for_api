import BaseClientRepository from "./BaseClientRepository.js";
import Client from "../../../shared/models/Client.js";
import logger from "../../../shared/config/logger.js";

class MongoClientRepository extends BaseClientRepository {
  constructor() {
    super(Client);
  }

  /**
   *
   * @param {OBJECT} clientData
   * @returns {Promise<OBJECT>}
   */

  async create(clientData) {
    try {
      const client = new this.model(clientData);
      await client.save();

      logger.info("Client Created in MongoDB", {
        mongoId: client._id,
        slug: client.slug,
      });

      return client;
    } catch (error) {
      logger.error("Error creating client", error);
      throw error;
    }
  }

  async findById(clientId) {
    try {
      const client = await this.model.findById(clientId);
      logger.info("Client details from Mongodb", {
        clientId: client?._id,
      });

      return client;
    } catch (error) {
      logger.error("Error finding client by ID", {
        error: error.message,
        stack: error.stack,
        clientId,
      });
      throw error;
    }
  }

  async findBySlug(slug) {
    try {
      const client = await this.model.findOne({ slug });
      logger.info("Client details from Mongodb using Slug", client);
      return client;
    } catch (error) {
      logger.error("Error finding client by slug:", error);
      throw error;
    }
  }

  /**
   * @params {object} filters-Query filters
     @params{Object} options-query options (limit,skip,sort)
   * @returns {Promise<Object>}
   */

  //after finishing project add the cursor pagination
  async find(filters = {}, options = {}) {
    try {
      const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;
      const clients = await this.model
        .find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select("-__v"); //_v means since id is included by default result look like [{ _id: ..., __v: 0 }, ...]
      logger.info("Fetch the client by using filter", clients);
      return clients;
    } catch (err) {
      logger.error("Error finding Clients:", err);
      throw err;
    }
  }

  async count(filters = []) {
    try {
      const count = await this.model.countDocuments(filters);
      return count;
    } catch (error) {
      logger.error("Error counting clients:", error);
      throw error;
    }
  }
}

export default new MongoClientRepository();
