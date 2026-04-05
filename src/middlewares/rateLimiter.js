const rateLimit = require('express-rate-limit');
const config = require('../config');
const ApiError = require('../utils/ApiError');

const isTest = config.env === 'test';

// Stricter limit on auth endpoints to prevent brute-force attacks.
// General API gets a more generous limit.
// Disabled in test environment so integration tests can run freely.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests('Too many authentication attempts. Try again in 15 minutes'));
  },
});

const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests('Too many requests. Please slow down'));
  },
});

module.exports = { authLimiter, apiLimiter };
