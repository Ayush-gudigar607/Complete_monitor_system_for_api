import { AuthController } from "../controller/authController.js";
import { AuthService } from "../services/AuthService.js";
import MongoUserRepository from "../repository/UserRepository.js";

class Container {
  static init() {
    // Initialize the repositories, services, and controllers
    const repositories = {
      userRepository: new MongoUserRepository(),
    };

    // Initialize the services and controllers with their dependencies
    const services = {
      authService: new AuthService(repositories.userRepository),
    };

    // Initialize the controllers with their dependencies
    const controllers = {
      authController: new AuthController(services.authService),
    };

    return {
      repositories,
      services,
      controllers,
    };
  }
}

const initialized = Container.init();

export { Container };

export default initialized;
