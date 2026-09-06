import bcrypt from "bcryptjs";
import SecurityUtils from "../../../shared/utils/SecurityUtils.js";
import logger from "../../../shared/config/logger.js";
import { APPLICATION_ROLES } from "../../../shared/constants/role.js";
import AppError from "../../../shared/utils/AppError.js";
export class AuthService {
  constructor(userRepository) {
    if (!userRepository) {
      throw new Error("UserRepository instance is required");
    }
    this.userRepository = userRepository;
  }

  //This method will format the user object by removing sensitive information like the password before returning it
  formatResponse(user) {
    if (!user) {
      throw new Error("User object is required");
    }

    const userobject = user.toObject ? user.toObject() : { ...user };
    delete userobject.password;
    return userobject;
  }

  //This method will compare the plain password with the hashed password and return a boolean indicating whether they match
  comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  //This method will onboard a super admin user and return the user object and token
  async OnboardSuperAdmin(SuperAdminData) {
    try {
      // const existingUser = await this.userRepository.findAll();

      const existingSuperAdmin = await this.userRepository.findSuperAdmin();

      if (existingSuperAdmin) {
        throw new Error("Super admin already exists");
      }

      //This will check if the existing user array has any user with the role of SUPER_ADMIN, if it does then it will throw an error
      if (existingSuperAdmin.length > 0 && existingSuperAdmin) {
        throw new AppError("Super Admin already exists", 409);
      }

      //This will create a new super admin user in the database and generate a token for the user
      const user = await this.userRepository.create(SuperAdminData);
      const token = SecurityUtils.generateToken(user);

      logger.info("Super Admin onboarded successfully");
      return { user: this.formatResponse(user), token };
    } catch (err) {
      logger.error(`Error onboarding Super Admin: ${err.message}`);
      throw err;
    }
  }

  //This method will register a new user and return the user object and token
  async register() {
    // Client users must be created through ClientService, which assigns their
    // clientId and enforces the caller's role boundary.  A public registration
    // endpoint cannot safely accept a role (or a client assignment).
    throw new AppError(
      "Self-registration is disabled. Ask a client administrator to create your account.",
      403,
    );

    /* c8 ignore start -- retained below only until the legacy flow is removed
    try {
      // Check for duplicate email
      const existingEmail = await this.userRepository.findByEmail(
        userData.email,
      );
      if (existingEmail) {
        throw new AppError("User with this email already exists", 409);
      }

      // Check for duplicate username
      const existingUsername = await this.userRepository.findByUsername(
        userData.username,
      );

      //if the existingUsername is not null or undefined, then it will throw an error indicating that the user with this username already exists
      if (existingUsername) {
        throw new AppError("User with this username already exists", 409);
      }

      //We gona get the user using the userRepository function
      const user = await this.userRepository.create(userData);

      //Get the token using the SecurityUtils function and pass the user object to it
      const token = SecurityUtils.generateToken(user);

      logger.info(`User registered successfully with email: ${user.email}`);
      return { user: this.formatResponse(user), token };
    } catch (err) {
      logger.error(`Error registering user: ${err.message}`);
      throw err;
    } */
  }

  //This method will login a user and return the user object and token
  async login(username, password) {
    try {
      //Check if the user exists by their username
      const user = await this.userRepository.findByUsername(username);

      //If the user does not exist, throw an error indicating invalid username or password
      if (!user) {
        throw new AppError("Invalid username or password", 401);
      }

      //Check if the user account is active, if not throw an error indicating that the user account is inactive
      if (!user.isActive) {
        throw new AppError("User account is inactive", 403);
      }

      //Compare the provided password with the stored hashed password, if they do not match throw an error indicating invalid username or password
      const isPasswordValid = await this.comparePassword(
        password,
        user.password,
      );

      //if not isPasswordValid is true, then it will throw an error indicating invalid username or password
      if (!isPasswordValid) {
        throw new AppError("Invalid username or password", 401);
      }

      logger.info(`User logged in successfully with email: ${user.email}`);

      //generate the token using the SecurityUtils function and pass the user object to it
      const token = SecurityUtils.generateToken(user);

      return { user: this.formatResponse(user), token };
    } catch (err) {
      logger.error(`Error logging in user: ${err.message}`);
      throw err;
    }
  }

  //This method will get the profile of a user by their userId and return the user object
  async getProfile(userId) {
    try {
      //Get the user object by their userId using the userRepository function
      const user = await this.userRepository.findById(userId);

      //if not user then it will throw an error indicating that the user was not found
      if (!user) {
        throw new AppError("User not found", 404);
      }

      //then it will return the user object after formatting it using the formatResponse method to remove sensitive information like the password
      return this.formatResponse(user);
    } catch (err) {
      logger.error(`Error fetching user profile: ${err.message}`);
      throw err;
    }
  }

  //This method will check if a user has super admin permissions by their userId and return a boolean indicating whether they have the permissions
  async checkSuperAdminPermissions(userId) {
    try {
      //Get the user object by their userId using the userRepository function
      const user = await this.userRepository.findById(userId);
      //if not user then it will throw an error indicating that the user was not found
      if (!user) {
        throw new AppError("User not found", 404);
      }

      //return true if the user role is SUPER_ADMIN, otherwise return false
      return user.role === APPLICATION_ROLES.SUPER_ADMIN;
    } catch (error) {
      logger.error(`Error checking Super Admin permissions: ${error.message}`);
      throw error;
    }
  }
}
