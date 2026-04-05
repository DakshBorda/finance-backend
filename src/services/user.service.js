const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

class UserService {
  static async listUsers({
    page = 1,
    limit = 10,
    search,
    role,
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeDeleted = false,
  }) {
    const where = {};

    if (!includeDeleted) {
      where.isDeleted = false;
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Case-insensitive search across user-facing fields
    if (search && search.trim()) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    // Run count + fetch in parallel — single round trip to DB
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
    ]);

    return { users, total, page, limit };
  }

  static async getUserById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isDeleted: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return user;
  }

  // TODO: Log role changes to a separate audit table for compliance.
  // Financial system role changes should be traceable.
  static async updateUser(targetUserId, adminUserId, updateData) {
    // Admin cannot modify their own account via user management —
    // forces them to use /auth/profile instead (separation of concerns)
    if (targetUserId === adminUserId) {
      throw ApiError.badRequest('You cannot modify your own account through user management. Use your profile settings instead');
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!existingUser) {
      throw ApiError.notFound('User not found');
    }

    if (existingUser.isDeleted) {
      throw ApiError.badRequest('Cannot update a deleted user. Restore the account first');
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
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

    logger.info(`Admin ${adminUserId} updated user ${targetUserId}: ${JSON.stringify(updateData)}`);

    return updatedUser;
  }

  static async softDeleteUser(targetUserId, adminUserId) {

    if (targetUserId === adminUserId) {
      throw ApiError.badRequest('You cannot delete your own account');
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.isDeleted) {
      throw ApiError.badRequest('User is already deleted');
    }

    const deletedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isDeleted: true,
        isActive: false,
        deletedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isDeleted: true,
        deletedAt: true,
      },
    });

    logger.info(`Admin ${adminUserId} soft-deleted user ${targetUserId} (${user.email})`);

    return deletedUser;
  }

  static async restoreUser(targetUserId, adminUserId) {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (!user.isDeleted) {
      throw ApiError.badRequest('User is not deleted');
    }

    const restoredUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isDeleted: false,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info(`Admin ${adminUserId} restored user ${targetUserId} (${user.email})`);

    return restoredUser;
  }
}

module.exports = UserService;
