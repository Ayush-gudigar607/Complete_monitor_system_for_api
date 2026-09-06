import BaseRepository from "./BaseRepository.js";
import User from "../../../shared/models/user.js";
import logger from "../../../shared/config/logger.js";

export default class MongoUserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  //This method will create a new user in the database and return the user object
  async create(userData) {
    try {
      let data = { ...userData };
      if (data.role === "SUPER_ADMIN" && !data.permissions) {
        data.permissions = {
          //important
          canCreateApiKeys: true,
          canManageUsers: true,
          canViewAnalytics: true,
          canExportData: true,
        };
      }

      const user = new this.model(data);
      await user.save();

      logger.info(
        `User created with username: ${user.username} and email: ${user.email}`,
      );
      return user;
    } catch (err) {
      logger.error(`Error creating user: ${err.message}`);
      throw err;
    }
  }

  //This method will find a user by their ID and return the user object
  async findById(id) {
    try {
      const user = await this.model.findById(id);
      return user;
    } catch (err) {
      logger.info(`Error finding user by id: ${err.message}`);
      throw err;
    }
  }
  //This method will find a user by their username and return the user object
  async findByUsername(username) {
    try {
      const user = await this.model.findOne({ username: username });
      return user;
    } catch (err) {
      logger.info(`Error finding user by username: ${err.message}`);
      throw err;
    }
  }
  //This method will find a user by their email and return the user object
  async findByEmail(email) {
    try {
      const user = await this.model.findOne({ email: email });
      return user;
    } catch (err) {
      logger.info(`Error finding user by email: ${err.message}`);
      throw err;
    }
  }

  //This method will find a user by their role and return the user object
  async findAll() {
    try {
      const users = await this.model
        .find({ isActive: true })
        .select("-password");
      return users;
    } catch (err) {
      logger.info(`Error finding all users: ${err.message}`);
      throw err;
    }
  }

  async findSuperAdmin()
  {
    const superAdmin=await this.model.findOne({role:"SUPER_ADMIN"})
    if(!superAdmin)
    {
      return false;
    }
    return true;
  }
}
