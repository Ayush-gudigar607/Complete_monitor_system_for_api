import ResponceFormatter from "../utils/ResponceFormatter.js";

// Middleware function to validate request body against a schema
const validate = (schema) => (req, res, next) => {
    if (!schema) {
        return next();
    }

    const errors = [];
    const body = req.body || {};

    Object.entries(schema).forEach(([field, rules]) => {
        const value = body[field];

        // Check for required fields
        if (rules.required && (value === undefined || value === null || value === "")) {
            errors.push(`${field} is required`);
            return;
        }

        // Skip further validation if the field is not required and not provided
        if (rules.type && typeof value !== rules.type) {
            errors.push(`${field} must be of type ${rules.type}`);
            return;
        }

        // Check for minimum and maximum length constraints
        if (rules.minLength && typeof value === "string" && value.length < rules.minLength) {
            errors.push(`${field} must be at least ${rules.minLength} characters long`);
            return;
        }

        // Check for maximum length constraints
        if (rules.maxLength && typeof value === "string" && value.length > rules.maxLength) {
            errors.push(`${field} must be at most ${rules.maxLength} characters long`);
            return;
        }

        // Check for custom validation function
        if (rules.custom && typeof rules.custom === "function") {
            const customError = rules.custom(value, body);
            if (customError) {
                errors.push(customError);
                return;
            }
        }
    });

    // If there are validation errors, respond with a 400 status and the error messages
    if (errors.length > 0) {
        return res.status(400).json(ResponceFormatter.error("Validation Error", 400, errors));
    }
    
    // If validation passes, proceed to the next middleware or route handler
    return next();
};

export default validate;
