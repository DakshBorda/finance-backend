const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const { Prisma } = require('@prisma/client');

// Auto-generates a human-readable reference like TXN-20260405-A3B7
// if the user doesn't provide one. Makes transactions easy to reference
// in conversations and support tickets.
function generateReference() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TXN-${datePart}-${randPart}`;
}

class TransactionService {

  static async create(userId, data) {
    // Auto-generate reference if not provided
    const reference = data.reference?.trim() || generateReference();

    const transaction = await prisma.transaction.create({
      data: {
        amount: new Prisma.Decimal(data.amount),
        type: data.type,
        category: data.category,
        date: new Date(data.date),
        description: data.description || null,
        reference,
        userId,
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    logger.info(`Transaction created: ${reference} (${data.type} ${data.amount}) by user ${userId}`);
    return this._formatTransaction(transaction);
  }

  static async list(filters = {}) {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      search,
      sortBy = 'date',
      sortOrder = 'desc',
    } = filters;

    const where = { isDeleted: false };

    if (type) where.type = type;
    if (category) where.category = category;

    // Date range filtering
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    // Amount range filtering — compare as Decimal
    if (amountMin !== undefined || amountMax !== undefined) {
      where.amount = {};
      if (amountMin !== undefined) where.amount.gte = new Prisma.Decimal(amountMin);
      if (amountMax !== undefined) where.amount.lte = new Prisma.Decimal(amountMax);
    }

    // Free-text search in description and reference
    if (search?.trim()) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    // Run count + data + summary in parallel for performance
    const [total, transactions, summaryAgg] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      // Inline summary — saves the frontend a second API call
      prisma.transaction.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Build summary from the groupBy result
    const summary = { totalIncome: '0', totalExpense: '0', netBalance: '0', count: total };
    for (const group of summaryAgg) {
      if (group.type === 'INCOME') summary.totalIncome = group._sum.amount?.toString() || '0';
      if (group.type === 'EXPENSE') summary.totalExpense = group._sum.amount?.toString() || '0';
    }
    summary.netBalance = (parseFloat(summary.totalIncome) - parseFloat(summary.totalExpense)).toFixed(2);

    return {
      transactions: transactions.map(this._formatTransaction),
      summary,
      total,
      page,
      limit,
    };
  }

  static async getById(id) {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!transaction || transaction.isDeleted) {
      throw ApiError.notFound('Transaction not found');
    }

    return this._formatTransaction(transaction);
  }

  static async update(id, data) {
    const existing = await prisma.transaction.findUnique({ where: { id } });

    if (!existing || existing.isDeleted) {
      throw ApiError.notFound('Transaction not found');
    }

    const updateData = {};
    if (data.amount !== undefined) updateData.amount = new Prisma.Decimal(data.amount);
    if (data.type !== undefined) updateData.type = data.type;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.reference !== undefined) updateData.reference = data.reference || null;

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    logger.info(`Transaction updated: ${transaction.reference} by admin`);
    return this._formatTransaction(transaction);
  }

  static async softDelete(id) {
    const existing = await prisma.transaction.findUnique({ where: { id } });

    if (!existing) {
      throw ApiError.notFound('Transaction not found');
    }

    if (existing.isDeleted) {
      throw ApiError.badRequest('Transaction is already deleted');
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    logger.info(`Transaction soft-deleted: ${transaction.reference}`);
    return this._formatTransaction(transaction);
  }

  // Normalize Decimal fields to strings for JSON serialization.
  // Prisma returns Decimal objects which serialize inconsistently
  // across different JSON libraries.
  static _formatTransaction(txn) {
    return {
      ...txn,
      amount: txn.amount?.toString(),
    };
  }
}

module.exports = TransactionService;
