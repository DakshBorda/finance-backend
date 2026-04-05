const Joi = require('joi');
const { TRANSACTION_TYPES, CATEGORIES } = require('../utils/constants');

const typeValues = Object.values(TRANSACTION_TYPES);
const categoryValues = Object.values(CATEGORIES);

const createTransactionSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .precision(2)
    .max(9999999999.99)
    .required()
    .messages({
      'number.positive': 'Amount must be a positive number',
      'number.precision': 'Amount cannot have more than 2 decimal places',
      'number.max': 'Amount exceeds the maximum allowed value',
      'any.required': 'Amount is required',
    }),

  type: Joi.string()
    .valid(...typeValues)
    .required()
    .messages({
      'any.only': `Type must be one of: ${typeValues.join(', ')}`,
      'any.required': 'Transaction type is required',
    }),

  category: Joi.string()
    .valid(...categoryValues)
    .required()
    .messages({
      'any.only': `Category must be one of: ${categoryValues.join(', ')}`,
      'any.required': 'Category is required',
    }),

  date: Joi.date()
    .iso()
    .max('now')
    .required()
    .messages({
      'date.max': 'Transaction date cannot be in the future',
      'date.format': 'Date must be in ISO 8601 format (YYYY-MM-DD)',
      'any.required': 'Transaction date is required',
    }),

  description: Joi.string()
    .trim()
    .max(500)
    .allow('', null)
    .optional(),

  reference: Joi.string()
    .trim()
    .max(50)
    .allow('', null)
    .optional(),
});

const updateTransactionSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .precision(2)
    .max(9999999999.99)
    .messages({
      'number.positive': 'Amount must be a positive number',
      'number.precision': 'Amount cannot have more than 2 decimal places',
    }),

  type: Joi.string()
    .valid(...typeValues)
    .messages({
      'any.only': `Type must be one of: ${typeValues.join(', ')}`,
    }),

  category: Joi.string()
    .valid(...categoryValues)
    .messages({
      'any.only': `Category must be one of: ${categoryValues.join(', ')}`,
    }),

  date: Joi.date()
    .iso()
    .max('now')
    .messages({
      'date.max': 'Transaction date cannot be in the future',
    }),

  description: Joi.string()
    .trim()
    .max(500)
    .allow('', null),

  reference: Joi.string()
    .trim()
    .max(50)
    .allow('', null),
})
  .min(1)
  .messages({
    'object.min': 'At least one field is required to update',
  });

const listTransactionsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),

  type: Joi.string()
    .valid(...typeValues)
    .optional(),

  category: Joi.string()
    .valid(...categoryValues)
    .optional(),

  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional()
    .messages({ 'date.min': 'dateTo must be after dateFrom' }),

  amountMin: Joi.number().positive().optional(),
  amountMax: Joi.number().positive().min(Joi.ref('amountMin')).optional()
    .messages({ 'number.min': 'amountMax must be greater than amountMin' }),

  search: Joi.string().trim().max(100).allow('').optional(),

  sortBy: Joi.string()
    .valid('date', 'amount', 'createdAt', 'category', 'type')
    .default('date'),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc'),
});

const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required()
    .messages({ 'string.guid': 'Invalid transaction ID format' }),
});

module.exports = {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
  uuidParamSchema,
};
