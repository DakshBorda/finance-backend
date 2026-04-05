const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

// 12 rounds ≈ ~250ms per hash on modern hardware.
// Good balance between brute-force resistance and login latency.
const SALT_ROUNDS = 12;

class AuthService {

  static async register({ email, password, firstName, lastName }) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw ApiError.conflict('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        // role defaults to VIEWER via schema
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    const tokens = AuthService._generateTokenPair(user);

    logger.info(`New user registered: ${user.email} (${user.role})`);

    return { user, tokens };
  }

  static async login({ email, password }) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Generic message prevents email enumeration
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (user.isDeleted) {
      throw ApiError.unauthorized('Account has been deleted. Contact an administrator');
    }

    if (!user.isActive) {
      throw ApiError.unauthorized('Account has been deactivated. Contact an administrator');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const tokens = AuthService._generateTokenPair(user);

    const safeUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };

    logger.info(`User logged in: ${user.email}`);

    return { user: safeUser, tokens };
  }

  // TODO: Implement refresh token rotation — invalidate the old
  // refresh token when a new pair is issued. Prevents stolen tokens
  // from being reused indefinitely.
  static async refreshToken(refreshToken) {
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Refresh token has expired. Please login again');
      }
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.isDeleted || !user.isActive) {
      throw ApiError.unauthorized('User account is no longer valid');
    }

    const tokens = AuthService._generateTokenPair(user);

    return { tokens };
  }

  static async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return user;
  }

  static async updateProfile(userId, updateData) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info(`User updated profile: ${user.email}`);

    return user;
  }

  static async changePassword(userId, { currentPassword, newPassword }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw ApiError.badRequest('New password must be different from current password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    logger.info(`User changed password: ${user.email}`);

    return { message: 'Password changed successfully' };
  }

  static _generateTokenPair(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiry,
    });

    const refreshToken = jwt.sign(
      { userId: user.id },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiry }
    );

    return { accessToken, refreshToken };
  }
}

module.exports = AuthService;
