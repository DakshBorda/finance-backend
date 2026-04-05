const Joi = require('joi');
const { TRANSACTION_TYPES } = require('../utils/constants');

const typeValues = Object.values(TRANSACTION_TYPES);

const overviewQuerySchema = Joi.object({
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional()
    .messages({ 'date.min': 'dateTo must be after dateFrom' }),
});

const categorySummaryQuerySchema = Joi.object({
  type: Joi.string().valid(...typeValues).optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional()
    .messages({ 'date.min': 'dateTo must be after dateFrom' }),
});

const trendsQuerySchema = Joi.object({
  months: Joi.number().integer().min(1).max(36).default(12),
});

const recentQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(20).default(5),
});

const topCategoriesQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(20).default(5),
  type: Joi.string().valid(...typeValues).optional(),
});

module.exports = {
  overviewQuerySchema,
  categorySummaryQuerySchema,
  trendsQuerySchema,
  recentQuerySchema,
  topCategoriesQuerySchema,
};
