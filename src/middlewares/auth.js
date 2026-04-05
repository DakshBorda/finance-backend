const jwt = require('jsonwebtoken');
const config = require('../config');
const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');

// TODO: Consider caching user lookups here with a short TTL (30s).
// Currently hits DB on every authenticated request.
const authenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token is required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw ApiError.unauthorized('Access token is required');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.accessSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Access token has expired');
      }
      if (err.name === 'JsonWebTokenError') {
        throw ApiError.unauthorized('Invalid access token');
      }
      throw ApiError.unauthorized('Token verification failed');
    }

    // Pull the user fresh from DB — can't trust token claims alone
    // since the account could have been deactivated after token was issued
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isDeleted: true,
      },
    });

    if (!user) {
      throw ApiError.unauthorized('User associated with this token no longer exists');
    }

    if (user.isDeleted) {
      throw ApiError.unauthorized('Account has been deleted');
    }

    if (!user.isActive) {
      throw ApiError.unauthorized('Account has been deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
