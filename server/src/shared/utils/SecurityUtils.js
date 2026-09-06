import config from "../config/index.js";
import jwt from "jsonwebtoken";

//SecurityUtils.js
class SecurityUtils {
  static PASSWORD_REQUIREMENTS = {
    min_length: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
    requireUpperCase: process.env.PASSWORD_REQUIRE_UPPERCASE === "true" || true,
    requireLowerCase: process.env.PASSWORD_REQUIRE_LOWERCASE === "true" || true,
    requireNumber: process.env.PASSWORD_REQUIRE_NUMBER === "true" || true,
    requireSpecialChar:
      process.env.PASSWORD_REQUIRE_SPECIAL_CHAR === "true" || true,
  };

  // Validate password based on the requirements
  static validatePassword(password) {
    const errors = [];
    const requirements = this.PASSWORD_REQUIREMENTS;

    if (!password) {
      return {
        success: false,
        errors: ["Password is required"],
      };
    }

    if (password.length < requirements.min_length) {
      errors.push(
        `Password must be at least ${requirements.min_length} characters long`,
      );
    }

    if (requirements.requireUpperCase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (requirements.requireLowerCase && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (requirements.requireNumber && !/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (
      requirements.requireSpecialChar &&
      !/[!@#$%^&*(),.?":{}|<>]/.test(password)
    ) {
      errors.push("Password must contain at least one special character");
    }

    const weakPasswords = [
      // Sequential & Common Patterns
      "password",
      "123456",
      "123456789",
      "12345678",
      "12345",
      "1234567",
      "1234",
      "111111",
      "000000",
      "123123",
      "7777777",

      // Keyboard Walks
      "qwerty",
      "qwertyuiop",
      "asdfghjkl",
      "zxcvbnm",
      "qazwsx",
      "1q2w3e4r",

      // Common Default Credentials
      "admin",
      "administrator",
      "root",
      "guest",
      "user",
      "default",
      "pass",
      "login",

      // Standard Words & Phrases
      "password1",
      "password123",
      "pass1234",
      "abc123",
      "iloveyou",
      "welcome",
      "monkey",
      "dragon",
      "master",
      "sunshine",
      "princess",
      "football",
      "charlie",
      "trustno1",
    ];

    //if the password is in the weak passwords list, add an error message
    if (weakPasswords.includes(password.toLowerCase())) {
      errors.push("Password is too weak");
    }

    return {
      success: errors.length === 0,
      errors,
      strength: this.CalculatePasswordStrength(password),
    };
  }

  static CalculatePasswordStrength(password) {
    if (!password) {
      return "weak";
    }

    let score = 0;
    // Check for length
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

    // Determine strength based on score
    if (score <= 2) return "weak";
    else if (score === 3 || score === 4) return "medium";
    else return "strong";
  }

  // Generate JWT token for the user
  static generateToken(user) {
    const { _id, email, username, role, clientId } = user;
    const payload = { _id, email, username, role, clientId };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }
}

export default SecurityUtils;
