const { StatusCodes, ReasonPhrases } = require('http-status-codes');

// Operational errors we anticipate (bad input, auth failures, etc.).
// Programming bugs should NOT use this class — let them crash loud.
class ApiError extends Error {
  constructor(statusCode, message, errors = [], errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.errorCode = errorCode || this._deriveErrorCode(statusCode);
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  _deriveErrorCode(statusCode) {
    const mapping = {
      [StatusCodes.BAD_REQUEST]: 'VALIDATION_ERROR',
      [StatusCodes.UNAUTHORIZED]: 'UNAUTHORIZED',
      [StatusCodes.FORBIDDEN]: 'FORBIDDEN',
      [StatusCodes.NOT_FOUND]: 'NOT_FOUND',
      [StatusCodes.CONFLICT]: 'CONFLICT',
      [StatusCodes.TOO_MANY_REQUESTS]: 'RATE_LIMIT_EXCEEDED',
      [StatusCodes.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
    };
    return mapping[statusCode] || 'UNKNOWN_ERROR';
  }

  static badRequest(message = ReasonPhrases.BAD_REQUEST, errors = []) {
    return new ApiError(StatusCodes.BAD_REQUEST, message, errors);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(StatusCodes.UNAUTHORIZED, message);
  }

  static forbidden(message = 'Insufficient permissions') {
    return new ApiError(StatusCodes.FORBIDDEN, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(StatusCodes.NOT_FOUND, message);
  }

  static conflict(message = 'Resource already exists') {
    return new ApiError(StatusCodes.CONFLICT, message);
  }

  static internal(message = ReasonPhrases.INTERNAL_SERVER_ERROR) {
    return new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, message);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(StatusCodes.TOO_MANY_REQUESTS, message);
  }
}

module.exports = ApiError;
