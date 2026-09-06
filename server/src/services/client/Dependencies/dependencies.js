import MongoUserRepository from "../../auth/repository/UserRepository.js";
import MongoApiKeyRepository from "../repository/ApiKeyRepository.js";
import MongoClientRepository from "../repository/ClientRepository.js";
import { ClientService } from "../services/ClientService.js";
import { ClientController } from "../controllers/ClientController.js";
import authContainer from "../../auth/dependencies/Dependencies.js";

class container
{
    static init()
    {
        const repositories = {
            // These modules export initialized repository instances.
            clientRepository: MongoClientRepository,
            apiKeyRepository: MongoApiKeyRepository,
            userRepository: new MongoUserRepository(),
        };

            const services={
            clientService:new ClientService({
            clientRepository:repositories.clientRepository,
            apiKeyRepository:repositories.apiKeyRepository,
            userRepository:repositories.userRepository
        })
    };

    const controllers={
        clientController:new ClientController(services.clientService,authContainer.services.authService)
    };

    return {
        repositories,
        services,
        controllers
    }
}
}

const initializedContainer = container.init();
export {container}
export default initializedContainer;
