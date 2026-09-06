/**
 * Custom application error that carries an HTTP status code.
 * Use this instead of plain `new Error()` whenever you want the
 * global errorHandler to respond with a specific HTTP status.
 *
 * @example
 *   throw new AppError("Username already exists", 409);
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
