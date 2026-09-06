import { APPLICATION_ROLES } from "../../../shared/constants/role.js";
import ResponceFormatter from "../../../shared/utils/ResponceFormatter.js";
import config from "../../../shared/config/index.js";

export class AuthController {
  constructor(authService) {
    if (!authService) {
      throw new Error("AuthService instance is required");
    }

    this.authService = authService;
  }

  //This method will onboard a super admin user and return the user object and token
  async OnboardSuperAdmin(req, res, next) {
    try {
      const { username, password, email } = req.body;

      const SuperAdminData = {
        username,
        email,
        password,
        role: APPLICATION_ROLES.SUPER_ADMIN,
      };

      const { user, token } =
        await this.authService.OnboardSuperAdmin(SuperAdminData);

      if (!user || !token) {
        throw new Error("Failed to onboard Super Admin");
      }

      res.cookie("token", token, {
        httpOnly: config.cookie.httpOnly,
        secure: config.cookie.secure,
        maxAge: config.cookie.expires,
      });

      res
        .status(201)
        .json(
          ResponceFormatter.success(
            user,
            "super admin created successfully",
            201,
          ),
        );
    } catch (err) {
      next(err);
    }
  }

  //This method will register a new user and return the user object and token
  async register(req, res, next) {
    try {
      //Get the user data from the request body and create a new user in the database
      const { username, password, email, role: role } = req.body;

      //add the userData object to pass to the register method of the authService
      const userData = {
        username,
        email,
        password,
        role: role || APPLICATION_ROLES.CLIENT_ADMIN,
      };

      //Get the user object and token from the register method of the authService
      const { user, token } = await this.authService.register(userData);

      if (!user || !token) {
        throw new Error("Failed to register user");
      }

      res
        .status(201)
        .json(
          ResponceFormatter.success(user, "User registered successfully", 201),
        );
    } catch (err) {
      next(err);
    }
  }

  //This method will login a user and return the user object and token
  async login(req, res, next) {
    try {
      //Get the username and password from the request body and login the user
      const { username, password } = req.body;

      //Get the token and user from the authService using login Method
      const { token, user } = await this.authService.login(username, password);

      //Store the cookies in the name called token
      res.cookie("token", token, {
        httpOnly: config.cookie.httpOnly,
        secure: config.cookie.secure,
        maxAge: config.cookie.expires,
      });

      //token will be deleted after production
      res
        .status(200)
        .json(
          ResponceFormatter.success(
            { user, token },
            "User logged in successfully",
            200,
          ),
        );
    } catch (err) {
      next(err);
    }
  }

  //This method will get the profile of a user and return the user object
  async getProfile(req, res, next) {
    try {
      //Get the userId from the request object and get the user profile from the authService using getProfile Method
      const userId = req.user._id;

      //if not throw the error message userid is missing in the request
      if (!userId) throw new Error("User ID is missing in the request");

      //Get the user profile from the authService using getProfile Method
      const user = await this.authService.getProfile(userId);
      if (!user) throw new Error("User not found");

      res
        .status(200)
        .json(
          ResponceFormatter.success(
            user,
            "User profile fetched successfully",
            200,
          ),
        );
    } catch (err) {
      next(err);
    }
  }

  //This method will logout a user and clear the authentication token
  async logout(req, res, next) {
    try {
      //clear the cookies using the name called token
      res.clearCookie("token");
      res
        .status(200)
        .json(
          ResponceFormatter.success(null, "User logged out successfully", 200),
        );
    } catch (err) {
      next(err);
    }
  }
}
