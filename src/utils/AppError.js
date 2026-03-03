/**
 * AppError - Custom Error Class
 * Centralized error handling for the application
 */
class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    // status: 'fail' for 4xx errors, 'error' for 5xx errors
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Capture the stack trace so we know exactly where the error happened
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;