import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import SecurityUtils from "../utils/SecurityUtils.js";
import { APPLICATION_ROLES } from "../constants/role.js";

//This is the user schema for the user collection in the database. It defines the structure of the user document and its validation rules. The schema also includes pre-save middleware to hash the password before saving it to the database.
const userSchema = new mongoose.Schema(
  {
    // Define the fields for the user schema
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      validate: {
        validator: function (username) {
          return /^[a-zA-Z0-9_-]+(?: [a-zA-Z0-9_-]+)*$/.test(username);
        },
        message: "Please enter a valid username using letters, numbers, spaces, underscores, or hyphens",
      },
    },
   // Define the email field with validation rules
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (email) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); //regex for valid email
        },
        message: "Please enter a valid email address",
      },
    },
    // Define the password field with validation rules
    password: {
      type: String,
      required: true,
      minlength: 6,
      validate: {
        validator: function (password) {
          if (
            this.isModified("password") &&
            password &&
            !password.startsWith("$2b$")
          ) //password always starts with $2b$ (password is not hashed before)
          {
            const validation = SecurityUtils.validatePassword(password);
            return validation.success;
          }
          return true; //if password is not modified or already hashed, skip validation
        },
        // this will execute only if the password is modified and not hashed before, it will validate the password and return the error message if the validation fails
        message: function (password) {
          if (password && !password.startsWith("$2b$")) {
            const validation = SecurityUtils.validatePassword(password);
            return validation.errors.join(", ");
          }

          return "Password validation failed";
        },
      },
    },
 // Define the role field with allowed values and default value
    role: {
      type: String,
      enum: Object.values(APPLICATION_ROLES),
      default: APPLICATION_ROLES.CLIENT_ROLE,
    },
// Define the clientId field with a reference to the Client model and a conditional requirement based on the user's role
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: function () {
        return this.role !== "SUPER_ADMIN"; //clientId is required for all roles except SUPER_ADMIN
      },
    },
// Define the isActive field to indicate whether the user account is active or not
    isActive: {
      type: Boolean,
      default: true,
    },
// Define the permissions field with default values for each permission
    permissions: {
      canCreateApiKeys: {
        type: Boolean,
        default: false,
      },

      canManageUsers: {
        type: Boolean,
        default: false,
      },

      canViewAnalytics: {
        type: Boolean,
        default: false,
      },

      canExportData: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
    collection: "users",
  },
);

// Pre-save middleware to hash the password before saving it to the database
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    return next(err);
  }
});

// Method to compare the provided password with the hashed password in the database

userSchema.index({ clientId: 1, isActive: 1 });
userSchema.index({ role: 1 });

const user = mongoose.model("User", userSchema);

export default user;
