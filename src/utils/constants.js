/**
 * Application-wide constants.
 *
 * These mirror the Prisma enums so we can reference them in
 * validation, middleware, and business logic without importing
 * the Prisma client directly in those layers.
 */

const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  ANALYST: 'ANALYST',
  VIEWER: 'VIEWER',
});

const TRANSACTION_TYPES = Object.freeze({
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
});

const CATEGORIES = Object.freeze({
  SALARY: 'SALARY',
  INVESTMENT: 'INVESTMENT',
  FREELANCE: 'FREELANCE',
  FOOD: 'FOOD',
  TRANSPORT: 'TRANSPORT',
  UTILITIES: 'UTILITIES',
  HEALTHCARE: 'HEALTHCARE',
  ENTERTAINMENT: 'ENTERTAINMENT',
  RENT: 'RENT',
  EDUCATION: 'EDUCATION',
  OTHER: 'OTHER',
});

// Default pagination values
const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
});

// Allowed sort fields for transactions
const TRANSACTION_SORT_FIELDS = ['date', 'amount', 'createdAt', 'category', 'type'];
const SORT_ORDERS = ['asc', 'desc'];

module.exports = {
  ROLES,
  TRANSACTION_TYPES,
  CATEGORIES,
  PAGINATION,
  TRANSACTION_SORT_FIELDS,
  SORT_ORDERS,
};
