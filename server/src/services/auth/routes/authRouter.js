import express from "express";
import dependencies from "../dependencies/Dependencies.js";
import ResponceFormatter from "../../../shared/utils/ResponceFormatter.js";
import requestLogger from "../../../shared/middlewares/requestlogger.js";

import {
  onboardsuperAdminSchema,
  loginSchema,
  registerSchema,
} from "../validation/authSchema.js";

import authenticate from "../../../shared/middlewares/authenticate.js";
import validate from "../../../shared/middlewares/validate.js";

const router = express.Router();

const { controllers } = dependencies;

const authController = controllers.authController;

// GET /api/auth(A basic endpoint to check if the auth service is running and to provide information about available endpoints)
router.get("/", (req, res) => {
  console.log("GET /api/auth HIT");

  //responce has been send to the client with the available endpoints and their methods
  return res.status(200).json(
    ResponceFormatter.success(
      {
        service: "Authentication",
        endpoints: [
          {
            path: "/api/auth/onboard-super-admin",
            method: "POST",
          },
          {
            path: "/api/auth/register",
            method: "POST",
          },
          {
            path: "/api/auth/login",
            method: "POST",
          },
          {
            path: "/api/auth/profile",
            method: "GET",
          },
          {
            path: "/api/auth/logout",
            method: "POST",
          },
        ],
      },
      "Auth endpoints available",
    ),
  );
});

// POST /api/auth/onboard-super-admin(Which Mainly help to get the super admin onboarded to the system)
router.post(
  "/onboard-super-admin",
  requestLogger,
  validate(onboardsuperAdminSchema),
  authController.OnboardSuperAdmin.bind(authController),
);

// POST /api/auth/register(Which mainly helps users to create an account in the system)
router.post(
  "/register",
  requestLogger,
  validate(registerSchema),
  authController.register.bind(authController),
);

// POST /api/auth/login
router.post(
  "/login",
  requestLogger,
  validate(loginSchema),
  authController.login.bind(authController),
);

// GET /api/auth/profile
router.get(
  "/profile",
  requestLogger,
  authenticate,
  authController.getProfile.bind(authController),
);

// POST /api/auth/logout
router.post(
  "/logout",
  requestLogger,
  authenticate,
  authController.logout.bind(authController),
);

export default router;
