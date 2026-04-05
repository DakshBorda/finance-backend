const ApiError = require('../utils/ApiError');

/**
 * Usage: roleGuard('ADMIN') or roleGuard('ADMIN', 'ANALYST')
 * Must be chained after authenticate middleware.
 */
const roleGuard = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
        )
      );
    }

    next();
  };
};

module.exports = roleGuard;
