import ResponseFormatter from "../../../shared/utils/ResponceFormatter.js";

export class ClientController {
  constructor(clientService, authService) {
    if (!clientService) {
      throw new Error("ClientService instance is required");
    }
    if (!authService) {
      throw new Error("AuthService instance is required");
    }

    this.clientService = clientService;
    this.authService = authService;
  }

  async createClient(req, res, next) {
    try {
      const isSuperAdmin = await this.authService.checkSuperAdminPermissions(
        req.user._id,
      );

      if (!isSuperAdmin) {
        return res
          .status(403)
          .json(
            ResponseFormatter.error(
              "You do not have permission to create a client",
              403,
            ),
          );
      }

      const client = await this.clientService.createClient(req.body, req.user);
      return res
        .status(201)
        .json(
          ResponseFormatter.success(client, "Client created successfully", 201),
        );
    } catch (err) {
      next(err);
    }
  }

  async createClientUser(req, res, next) {
    try {
      const { clientId } = req.params;
      const user = await this.clientService.createClientUser(
        clientId,
        req.body,
        req.user,
      );

      if (!user) {
        throw new Error("Failed to create client user");
      }
      return res
        .status(201)
        .json(
          ResponseFormatter.success(
            user,
            "Client user created successfully",
            201,
          ),
        );
    } catch (err) {
      next(err);
    }
  }

  async createApiKey(req, res, next) {
    try {
      const { clientId } = req.params;
      const apiKey = await this.clientService.createApiKey(
        clientId,
        req.body,
        req.user,
      );
      if (!apiKey) {
        throw new Error("Failed to create API key");
      }
      return res
        .status(201)
        .json(
          ResponseFormatter.success(apiKey, "API key created successfully", 201),
        );
    } catch (err) {
      next(err);
    }
  }

  async getApiKeys(req, res, next) {
    try {
      const apiKeys = await this.clientService.getApiKeys(req.params.clientId, req.user);
      return res.status(200).json(ResponseFormatter.success(apiKeys, "API keys fetched successfully", 200));
    } catch (err) {
      next(err);
    }
  }

  async updateApiKey(req, res, next) {
    try {
      const key = await this.clientService.updateApiKey(
        req.params.clientId,
        req.params.keyId,
        req.body,
        req.user,
      );
      return res.status(200).json(ResponseFormatter.success(key, "API key updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  async deleteApiKey(req, res, next) {
    try {
      await this.clientService.deleteApiKey(req.params.clientId, req.params.keyId, req.user);
      return res.status(200).json(ResponseFormatter.success(null, "API key deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  async listClients(req, res, next) {
    try {
      const clients = await this.clientService.listClients(req.user);
      res.status(200).json(ResponseFormatter.success(clients, "Clients fetched successfully"));
    } catch (err) { next(err); }
  }

  async updateClient(req, res, next) {
    try {
      const client = await this.clientService.updateClient(req.params.clientId, req.body, req.user);
      res.status(200).json(ResponseFormatter.success(client, "Client updated successfully"));
    } catch (err) { next(err); }
  }

  async setClientActive(req, res, next) {
    try {
      const client = await this.clientService.setClientActive(req.params.clientId, req.body.isActive, req.user);
      res.status(200).json(ResponseFormatter.success(client, "Client status updated successfully"));
    } catch (err) { next(err); }
  }

  async deleteClient(req, res, next) {
    try {
      await this.clientService.deleteClient(req.params.clientId, req.user);
      return res.status(200).json(ResponseFormatter.success(null, "Client deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  async revokeApiKey(req, res, next) {
    try {
      const key = await this.clientService.revokeApiKey(req.params.clientId, req.params.keyId, req.user);
      res.status(200).json(ResponseFormatter.success(key, "API key revoked successfully"));
    } catch (err) { next(err); }
  }

  async rotateApiKey(req, res, next) {
    try {
      const key = await this.clientService.rotateApiKey(req.params.clientId, req.params.keyId, req.user);
      res.status(201).json(ResponseFormatter.success(key, "API key rotated successfully", 201));
    } catch (err) { next(err); }
  }

  async createMonitoringService(req, res, next) {
    try {
      const service = await this.clientService.createMonitoringService(req.params.clientId, req.body, req.user);
      return res.status(201).json(ResponseFormatter.success(service, "Monitoring service registered successfully", 201));
    } catch (err) { next(err); }
  }

  async listMonitoringServices(req, res, next) {
    try {
      const services = await this.clientService.listMonitoringServices(req.params.clientId, req.user);
      return res.status(200).json(ResponseFormatter.success(services, "Monitoring services fetched successfully"));
    } catch (err) { next(err); }
  }

  async setMonitoringServiceActive(req, res, next) {
    try {
      const service = await this.clientService.setMonitoringServiceActive(req.params.clientId, req.params.serviceId, req.body.isActive, req.user);
      return res.status(200).json(ResponseFormatter.success(service, "Monitoring service updated successfully"));
    } catch (err) { next(err); }
  }

  async deleteMonitoringService(req, res, next) {
    try {
      await this.clientService.deleteMonitoringService(req.params.clientId, req.params.serviceId, req.user);
      return res.status(200).json(ResponseFormatter.success(null, "Monitoring service deleted successfully"));
    } catch (err) { next(err); }
  }
}

