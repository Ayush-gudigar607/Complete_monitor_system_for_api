import BaseApiKeysRepository from "./BaseApiKeysRepository.js";
import ApiKey from "../../../shared/models/ApiKey.js";
import logger from "../../../shared/config/logger.js";

class MongoApiKeyRepository extends BaseApiKeysRepository {
  constructor() {
    super(ApiKey);
  }

  async create(apiKeyData) {
    try {
      const apiKey = new this.model(apiKeyData);
      await apiKey.save();

      logger.info("API key created successfully", {
        apiKeyId: apiKey._id,
      });

      return apiKey;
    } catch (err) {
      logger.error(`Error creating API key: ${err.message}`);
      throw err;
    }
  }

  async findByKeyValue(keyValue, IncludeInactive = false) {
    try {
      const filter = { keyValue };
      if (!IncludeInactive) {
        filter.isActive = true;
      }

      const apiKey = await this.model.findOne(filter);

      if (!apiKey) {
        logger.info(`API key not found for keyValue: ${keyValue}`);
        return null;
      }

      return apiKey;
    } catch (err) {
      logger.error(`Error finding API key by keyValue: ${err.message}`);
      throw err;
    }
  }

  async findByClientId(clientId, filters = {}) {
    try {
      const query = { clientId, ...filters };
      const apiKeys = await this.model
        .find(query)
        .populate("createdBy", "username email")
        .sort({ createdAt: -1 });
      return apiKeys;
    } catch (err) {
      logger.error(`Error finding API keys by clientId: ${err.message}`);
      throw err;
    }
  }

  async countByClientId(clientId, filters = {}) {
    {
      try {
        const query = { clientId, ...filters };
        const count = await this.model.countDocuments(query);
        logger.info(`Counted ${count} API keys for clientId: ${clientId}`);
        return count;
      } catch (err) {
        logger.error(`Error counting API keys by clientId: ${err.message}`);
        throw err;
      }
    }
  }
}

export default new MongoApiKeyRepository();
