import {
  APPLICATION_ROLES,
  isValidClientRole,
} from "../../../shared/constants/role.js";
import logger from "../../../shared/config/logger.js";
import AppError from "../../../shared/utils/AppError.js";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import MonitoringService from "../../../shared/models/MonitoringService.js";
export class ClientService {
  constructor(dependencies) {
    if (!dependencies) {
      throw new Error("Dependencies are required");
    }

    if (!dependencies.clientRepository) {
      throw new Error("ClientRepository instance is required");
    }

    if (!dependencies.apiKeyRepository) {
      throw new Error("ApiKeyRepository instance is required");
    }

    if (!dependencies.userRepository) {
      throw new Error("UserRepository instance is required");
    }

    this.clientRepository = dependencies.clientRepository;
    this.apiKeyRepository = dependencies.apiKeyRepository;
    this.userRepository = dependencies.userRepository;
  }

 formatClientForResponse(client) {
  if (!client) {
    return null;
  }

  const object = client.toObject
    ? client.toObject()
    : { ...client };

  return object;
}

formatUserForResponse(user) {
  if (!user) {
    return null;
  }

  const object = user.toObject
    ? user.toObject()
    : { ...user };

  delete object.password;

  return object;
}

formatApiKeyForResponse(apiKey) {
  if (!apiKey) {
    return null;
  }

  const object = apiKey.toObject
    ? apiKey.toObject()
    : { ...apiKey };

  // delete object.keyValue;

  return object;
}

  generateSlug(name) {
    return name
      .toLocaleLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim(); //AMAZON-WEB-SERVICE=>amazon-web-service
  }

  canUserAccessClient(user, clientId) {
    if (!user || !clientId) {
      return false;
    }

    if (user.role === APPLICATION_ROLES.SUPER_ADMIN) {
      return true;
    }

 return (
    user.clientId &&
    user.clientId.toString() === clientId.toString()
  );  }

  generateApiKeyValue() {
    const prefix = "api_";
    const randomString = crypto.randomBytes(16).toString("hex");
    return prefix + randomString;
  }

  canManageClient(user, clientId) {
    return user?.role === APPLICATION_ROLES.SUPER_ADMIN ||
      (user?.role === APPLICATION_ROLES.CLIENT_ADMIN &&
        user.clientId?.toString() === clientId?.toString());
  }

  canManageKeys(user, clientId) {
    return this.canManageClient(user, clientId);
  }

  async getClientByApiKey(apiKeyValue) {
    const apiKey = await this.apiKeyRepository.findByKeyValue(apiKeyValue);

    if (!apiKey || apiKey.isExpired()) {
      return null;
    }

    const client = await this.clientRepository.findById(apiKey.clientId);
    if (!client) {
      return null;
    }

    return { client, apiKey };
  }

  async createClient(clientData, adminUser) {
    try {
      const { name, email, description, website } = clientData;
       
      // console.log("Creating client with data:", clientData, "by admin user:", adminUser);

      if (!name || !email) {
        throw new AppError("Name and email are required to create a client", 400);
      }

      const slug = this.generateSlug(name);

      if(!slug || slug.length === 0) {
        throw new AppError("Failed to generate slug from client name", 400);
      }

      const existingClient = await this.clientRepository.findBySlug(slug);

      if (existingClient) {
        throw new AppError("Client with this name already exists", 400);
      }

      const newClient = await this.clientRepository.create({
        name,
        email,
        description,
        website,
        slug,
        createdBy: adminUser._id,
      });

      if (!newClient) {
        throw new Error("Failed to create client");
      }

      return this.formatClientForResponse(newClient);
    } catch (err) {
      logger.error(`Error creating client: ${err.message}`);
      throw err;
    }
  }

  async createClientUser(clientId, userData, adminUser) {
    try {
      const {
        username,
        email,
        password,
        role = APPLICATION_ROLES.CLIENT_ROLE,
      } = userData;

      if (!username || !email || !password) {
        throw new AppError(
          "Username, email and password are required to create a user",
          400,
        );
      }

      if (!isValidClientRole(role)) {
        throw new AppError("Invalid role provided", 400);
      }

      const isSuperAdmin = adminUser?.role === APPLICATION_ROLES.SUPER_ADMIN;
      const isClientAdmin = adminUser?.role === APPLICATION_ROLES.CLIENT_ADMIN;
      if (!isSuperAdmin && !isClientAdmin) {
        throw new AppError("Only client administrators can create client users", 403);
      }
      if (isClientAdmin && adminUser.clientId?.toString() !== clientId.toString()) {
        throw new AppError("You can create users only for your own client", 403);
      }
      if (isClientAdmin && role !== APPLICATION_ROLES.CLIENT_ROLE) {
        throw new AppError("Client administrators can assign only the client role", 403);
      }

      const client = await this.clientRepository.findById(clientId);

      if (!client) {
        throw new AppError("Client not found", 404);
      }

      let permissions = {
        canCreateApiKeys: false,
        canManageUsers: false,
        canViewAnalytics: true,
        canExportData: false,
      };

      if (role === APPLICATION_ROLES.CLIENT_ADMIN) {
        permissions = {
          canCreateApiKeys: true,
          canManageUsers: true,
          canViewAnalytics: true,
          canExportData: true,
        };
      }

      const existingUser = await this.userRepository.findByEmail(email);

      if (existingUser) {
        throw new AppError("User with this email already exists", 400);
      }

      const newUser = await this.userRepository.create({
        username,
        email,
        password,
        role,
        clientId: client._id,
        permissions,
      });

      logger.info("Client user created in MongoDB", {
        userId: newUser._id,
        email: newUser.email,
        role: newUser.role,
        clientId: newUser.clientId,
      });

      return this.formatUserForResponse(newUser);
    } catch (err) {
      logger.error(`Error creating client user: ${err.message}`);
      throw err;
    }
  }

  async createApiKey(clientId, apiKeyData, adminUser) {
    try {
      const client = await this.clientRepository.findById(clientId);

      if (!client) {
        throw new AppError("Client not found", 404);
      }

      if (!this.canManageKeys(adminUser, clientId)) {
        throw new AppError(
          "You do not have permission to create an API key for this client",
          403,
        );
      }

      if (
        adminUser.role !== APPLICATION_ROLES.CLIENT_ADMIN &&
        adminUser.role !== APPLICATION_ROLES.SUPER_ADMIN
      ) {
        throw new AppError(
          "Access denied-only for admin and client-admin can create API-keys ",
          403,
        );
      }

      const {
        name,
        description,
        environment = "production",
        isActive = true,
      } = apiKeyData;

      if (!name) {
        throw new AppError("Name is required to create an API key", 400);
      }

        const keyId = uuidv4();

        const keyValue = this.generateApiKeyValue();
      if (!keyValue) {
        throw new AppError("Failed to generate API key value", 500);
      }

      if (!["production", "staging", "development"].includes(environment)) {
        throw new AppError("Invalid environment provided", 400);
      }

      const apiKey = await this.apiKeyRepository.create({
        keyId,
        keyValue,
        clientId: client._id,
        name,
        description,
        environment,
        isActive,
        createdBy: adminUser._id,
      });

      logger.info("API key created in MongoDB with ID:", apiKey._id);
      
      return apiKey;

      // return this.formatApiKeyForResponse(apiKey);
    } catch (err) {
      logger.error(`Error creating API key: ${err.message}`);
      throw err;
    }
  }

  async getClientApiKeys(clientId, user) {
    try {
      if (!this.canUserAccessClient(user, clientId)) {
        throw new AppError(
          "Access denied-you do not have permission to access this client",
          403,
        );
      }

      const apiKey = await this.apiKeyRepository.findByClientId(clientId);

      const formattedResponces = apiKey.map((key) => {
        const KeyObj = key.toObject() ? key.toObject() : { ...key };
        delete KeyObj.keyValue;
        return KeyObj;
      });

      return formattedResponces;
    } catch (err) {
      logger.error(`Error fetching API keys for client: ${err.message}`);
      throw err;
    }
  }

  async getApiKeys(clientId, user) {
    try {
      const client = await this.clientRepository.findById(clientId);
      if (!client) {
        throw new AppError("Client not found", 404);
      }
      if (!this.canUserAccessClient(user, clientId)) {
        throw new AppError(
          "Access denied-you do not have permission to access this client",
          403,
        );
      }

      const apiKeys = await this.apiKeyRepository.findByClientId(clientId);
      if (!apiKeys) return [];

      const formattedResponces = apiKeys.map((key) => {
        const KeyObj = key.toObject() ? key.toObject() : { ...key };
        delete KeyObj.keyValue;
        return KeyObj;
      });

      return formattedResponces;
    } catch (err) {
      logger.error(`Error fetching API keys for client: ${err.message}`);
      throw err;
    }
  }

  async listClients(user) {
    const storedUser = user?._id ? await this.userRepository.findById(user._id) : null;
    const currentUser = storedUser || user;

    if (currentUser?.role === APPLICATION_ROLES.SUPER_ADMIN) {
      return this.clientRepository.find({});
    }
    if (currentUser?.clientId) {
      const client = await this.clientRepository.findById(currentUser.clientId);
      return client ? [this.formatClientForResponse(client)] : [];
    }
    throw new AppError("You do not have access to client data", 403);
  }

  async updateClient(clientId, clientData, user) {
    if (!this.canManageClient(user, clientId)) {
      throw new AppError("You do not have permission to update this client", 403);
    }
    const client = await this.clientRepository.findById(clientId);
    if (!client) throw new AppError("Client not found", 404);
    const allowed = ["name", "email", "description", "website", "settings"];

    if (clientData.name !== undefined && clientData.name !== client.name) {
      const slug = this.generateSlug(clientData.name);
      if (!slug) throw new AppError("Failed to generate slug from client name", 400);

      const clientWithSlug = await this.clientRepository.findBySlug(slug);
      if (clientWithSlug && clientWithSlug._id.toString() !== client._id.toString()) {
        throw new AppError("Client with this name already exists", 409);
      }
      client.slug = slug;
    }

    allowed.forEach((field) => {
      if (clientData[field] !== undefined) client[field] = clientData[field];
    });
    await client.save();
    return this.formatClientForResponse(client);
  }

  async setClientActive(clientId, isActive, user) {
    if (!this.canManageClient(user, clientId)) {
      throw new AppError("You do not have permission to change this client", 403);
    }
    const client = await this.clientRepository.findById(clientId);
    if (!client) throw new AppError("Client not found", 404);
    client.isActive = Boolean(isActive);
    await client.save();
    return this.formatClientForResponse(client);
  }

  async deleteClient(clientId, user) {
    if (user?.role !== APPLICATION_ROLES.SUPER_ADMIN) {
      throw new AppError("Only super administrators can delete clients", 403);
    }
    const client = await this.clientRepository.findById(clientId);
    if (!client) throw new AppError("Client not found", 404);

    const session = await mongoose.startSession();
    const deleteDependents = async (options = {}) => {
      await MonitoringService.deleteMany({ clientId }, options);
      await this.apiKeyRepository.model.deleteMany({ clientId }, options);
      await this.userRepository.model.deleteMany({ clientId }, options);
      await this.clientRepository.model.findByIdAndDelete(clientId, options);
    };

    try {
      await session.withTransaction(async () => {
        await deleteDependents({ session });
      });
    } catch (error) {
      // The supplied local MongoDB service is standalone and does not support
      // transactions. Keep the cascade functional there while retaining the
      // atomic path for replica sets and production deployments.
      if (!error.message?.includes("Transaction numbers are only allowed")) {
        throw error;
      }
      logger.warn("MongoDB transactions are unavailable; deleting client records without a transaction", {
        clientId,
      });
      await deleteDependents();
    } finally {
      await session.endSession();
    }
  }

  async revokeApiKey(clientId, keyId, user) {
    if (!this.canManageKeys(user, clientId)) {
      throw new AppError("You do not have permission to revoke this API key", 403);
    }
    const key = await this.apiKeyRepository.model.findOne({ _id: keyId, clientId });
    if (!key) throw new AppError("API key not found", 404);
    key.isActive = false;
    await key.save();
    return this.formatApiKeyForResponse(key);
  }

  async updateApiKey(clientId, keyId, apiKeyData, user) {
    if (!this.canManageKeys(user, clientId)) {
      throw new AppError("You do not have permission to update this API key", 403);
    }

    const key = await this.apiKeyRepository.model.findOne({ _id: keyId, clientId });
    if (!key) throw new AppError("API key not found", 404);

    const { name, description, environment } = apiKeyData;
    if (!name) throw new AppError("Name is required to update an API key", 400);
    if (!["production", "staging", "development"].includes(environment)) {
      throw new AppError("Invalid environment provided", 400);
    }

    key.name = name;
    key.description = description || "";
    key.environment = environment;
    await key.save();

    const response = this.formatApiKeyForResponse(key);
    delete response.keyValue;
    return response;
  }

  async deleteApiKey(clientId, keyId, user) {
    if (!this.canManageKeys(user, clientId)) {
      throw new AppError("You do not have permission to delete this API key", 403);
    }
    const result = await this.apiKeyRepository.model.deleteOne({ _id: keyId, clientId });
    if (!result.deletedCount) throw new AppError("API key not found", 404);
  }

  async rotateApiKey(clientId, keyId, user) {
    if (!this.canManageKeys(user, clientId)) {
      throw new AppError("You do not have permission to rotate this API key", 403);
    }
    const oldKey = await this.apiKeyRepository.model.findOne({ _id: keyId, clientId });
    if (!oldKey) throw new AppError("API key not found", 404);
    oldKey.isActive = false;
    await oldKey.save();
    return this.createApiKey(clientId, {
      name: oldKey.name,
      description: oldKey.description,
      environment: oldKey.environment,
    }, user);
  }

  async createMonitoringService(clientId, serviceData, user) {
    if (!this.canManageClient(user, clientId)) {
      throw new AppError("You do not have permission to register a service for this client", 403);
    }

    const { name, baseUrl, apiKeyId } = serviceData;
    if (!name || !baseUrl || !apiKeyId) {
      throw new AppError("Name, base URL, and API key are required", 400);
    }
    const client = await this.clientRepository.findById(clientId);
    if (!client) throw new AppError("Client not found", 404);

    const apiKey = await this.apiKeyRepository.model.findOne({ _id: apiKeyId, clientId, isActive: true });
    if (!apiKey) throw new AppError("Active API key not found for this client", 400);

    try {
      return await MonitoringService.create({ name, baseUrl, apiKeyId, clientId, createdBy: user._id });
    } catch (error) {
      if (error?.code === 11000) throw new AppError("A service with this name already exists", 409);
      throw error;
    }
  }

  async listMonitoringServices(clientId, user) {
    if (!this.canUserAccessClient(user, clientId)) {
      throw new AppError("You do not have permission to access this client", 403);
    }
    return MonitoringService.find({ clientId }).sort({ createdAt: -1 }).populate("apiKeyId", "name environment");
  }

  async setMonitoringServiceActive(clientId, serviceId, isActive, user) {
    if (!this.canManageClient(user, clientId)) {
      throw new AppError("You do not have permission to update this service", 403);
    }
    const service = await MonitoringService.findOne({ _id: serviceId, clientId });
    if (!service) throw new AppError("Monitoring service not found", 404);
    service.isActive = Boolean(isActive);
    await service.save();
    return service;
  }

  async deleteMonitoringService(clientId, serviceId, user) {
    if (!this.canManageClient(user, clientId)) {
      throw new AppError("You do not have permission to delete this service", 403);
    }
    const result = await MonitoringService.deleteOne({ _id: serviceId, clientId });
    if (!result.deletedCount) throw new AppError("Monitoring service not found", 404);
  }
}
