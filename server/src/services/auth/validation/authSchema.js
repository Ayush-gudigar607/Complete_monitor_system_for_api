import { isValidRole } from "../../../shared/constants/role.js";

const emailPattern = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

// Validation schema for onboarding super admin
export const onboardsuperAdminSchema = {
  username: {
    required: true,
  },
  email: {
    required: true,
    custom: (value) => {
      if (!value) return null;
      return emailPattern.test(value) ? null : "email must be valid";
    },
  },
  password: {
    required: true,
    minLength: 6,
  },
};

// Validation schema for user registration
export const registerSchema = {
  username: {
    required: true,
  },
  email: {
    required: true,
    custom: (value) => {
      if (!value) return null;
      return emailPattern.test(value) ? null : "email must be valid";
    },
  },
  password: {
    required: true,
    minLength: 6,
  },
  role: {
    required: true,
    custom: (value) => {
      if (!value) return null;
      return isValidRole(value) ? null : "Invalid Role";
    },
  },
};

// Validation schema for user login
export const loginSchema = {
  username: {
    required: true,
    type: "string",
  },
  password: {
    required: true,
    type: "string",
  },
};
