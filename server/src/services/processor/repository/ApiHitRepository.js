import { BaseRepository } from "./BaseRepository.js";

export class ApiHitRepository extends BaseRepository {
  constructor({ model, logger: l } = {}) {
    super({ logger: l });
    if (!model) {
      throw new Error("Model is required");
    };
    this.model = model
  };

  async save(userData) {
    try {
      const doc = new this.model(userData);

      if (!doc) {
        this.logger.error("Error creating document");
        throw new AppError("Error creating document", 500);
      };
      await doc.save();
      this.logger.info(
        `Saving document with data: ${JSON.stringify(userData)}`,
      );
      return doc;
    } catch (err) {
      if (err && err.code === 11000) {
        this.logger.warn("Duplicate event ID,skipping save", {
          eventId: userData.eventId,
        });
        return null;
      };
      this.logger.error(`Error saving API Hit: ${err.message}`);
      throw err;
    };
  };

  async find(filter = {}, options = {}) {
    try {
      const { limit = 100, skip = 0, sort = { timestamp: -1 } } = options;
      const hits = await this.model
        .find(filter)
        .limit(limit)
        .skip(skip)
        .sort(sort)
        .lean();
      if (!hits) {
        this.logger.info("No API hits found for the given filter");
        return [];
      };
      return hits;
    } catch (err) {
      this.logger.error(`Error finding API hits: ${err.message}`);
      throw err;
    };
  };

  async count(filter = {}) {
    try {
      const count = await this.model.countDocuments(filter);
      if (!count) {
        this.logger.info("No API hits found for the given filter");
        return 0;
      };
      return count;
    } catch (err) {
      this.logger.error(`Error counting API hits: ${err.message}`);
      throw err;
    };
  };

  async deleteOldHits(beforeData) {
    try {
      const results = await this.model.deleteMany({
        timestamp: { $lt: beforeData },
      });
      if (!results) {
        this.logger.info("No API hits found for the given filter");
        return 0;
      }
      this.logger.info(
        `Deleted ${results.deletedCount} API hits older than ${beforeData}`,
      );
      return results.deletedCount;
    } catch (err) {
      this.logger.error(`Error deleting old API hits: ${err.message}`);
      throw err;
    };
  };
};
