const { StatusCodes } = require('http-status-codes');
const config = require('../config');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

// Converts known error types (Prisma, JSON parse failures) into
// a consistent JSON shape. Must be the LAST middleware registered.
const errorHandler = (err, req, res, _next) => {
  // Handle Prisma-specific errors and convert to ApiError format
  let error = err;

  if (err.code === 'P2002') {
    // Unique constraint violation (e.g., duplicate email)
    const field = err.meta?.target?.[0] || 'field';
    error = ApiError.conflict(`A record with this ${field} already exists`);
  } else if (err.code === 'P2025') {
    // Record not found (e.g., updating a non-existent row)
    error = ApiError.notFound('The requested record was not found');
  } else if (err.type === 'entity.parse.failed') {
    // Malformed JSON in request body
    error = ApiError.badRequest('Invalid JSON in request body');
  }

  // Log the error for debugging
  if (error.isOperational) {
    logger.warn(`${error.statusCode} - ${error.message} - ${req.originalUrl}`);
  } else {
    logger.error('Unexpected error:', error);
  }

  const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = error.isOperational ? error.message : 'Something went wrong';

  res.status(statusCode).json({
    success: false,
    error: {
      code: error.errorCode || 'INTERNAL_ERROR',
      message,
      ...(error.errors && error.errors.length > 0 && { details: error.errors }),
      // Include stack trace only in development
      ...(config.env === 'development' && { stack: error.stack }),
    },
  });
};

module.exports = errorHandler;
