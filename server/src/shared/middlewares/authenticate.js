import config from "../config/index.js";
import ResponceFormatter from "../utils/ResponceFormatter.js";
import logger from "../config/logger.js";
import jwt from "jsonwebtoken";

//This will authenticate it
const authenticate = (req, res, next) => {
  try {
    let token = null;
    const authorization = req.get("authorization");
    if (authorization) {
      const [scheme, bearerToken] = authorization.split(" ");
      if (scheme?.toLowerCase() !== "bearer" || !bearerToken) {
        return res
          .status(401)
          .json(ResponceFormatter.error("Invalid authorization header", 401));
      }
      token = bearerToken;
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }
    if (!token) {
      return res
        .status(401)
        .json(ResponceFormatter.error("Authentication token is required", 401));
    }

    //decode the jwt
    const decoded = jwt.verify(token, config.jwt.secret);
    const { _id, username, email, role, clientId } = decoded;
    //assign the decoded user information to req.user for further use in the request lifecycle
    req.user = { _id, username, email, role, clientId };
    next();
  } catch (error) {
    logger.error("Authentication error:", {
      error: error.message,
      path: req.path,
    });

    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json(ResponceFormatter.error("Authentication token has expired", 401));
    }
    return res
      .status(401)
      .json(ResponceFormatter.error("Invalid authentication token", 401));
  }
};

export default authenticate;
