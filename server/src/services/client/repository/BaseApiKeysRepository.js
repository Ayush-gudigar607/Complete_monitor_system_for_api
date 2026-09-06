export default class BaseApiKeysRepository {
  constructor(model) {
    if (!model) {
      throw new Error("Model is required");
    }

    this.model = model;
  }

  // Define the methods that will be implemented by the subclasses
  async create(apiKeyData) {
    throw new Error("Method not implemented");
  }

  //This method will find an API key by its value and return the API key object if found, otherwise it will return null
  async findByKeyValue(keyValue, IncludeInactive) {
    throw new Error("Method not implemented");
  }

  //This method will find all API keys associated with a specific clientId and return an array of API key objects
  async findByClientId(clientId, filters) {
    throw new Error("Method not implemented");
  }

  //This method will count the number of API keys associated with a specific clientId and return the count
  async countByClientId(clientId, filters) {
    throw new Error("Method not implemented");
  }
}
