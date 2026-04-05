const Joi = require('joi');
const { ROLES } = require('../utils/constants');



const uuidParamSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid user ID format',
      'any.required': 'User ID is required',
    }),
});

const listUsersQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({ 'number.min': 'Page must be at least 1' }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),

  search: Joi.string()
    .trim()
    .max(100)
    .allow('')
    .optional(),

  role: Joi.string()
    .valid(...Object.values(ROLES))
    .optional()
    .messages({
      'any.only': `Role must be one of: ${Object.values(ROLES).join(', ')}`,
    }),

  isActive: Joi.boolean()
    .optional(),

  sortBy: Joi.string()
    .valid('createdAt', 'email', 'firstName', 'lastName', 'role')
    .default('createdAt')
    .optional(),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .optional(),

  includeDeleted: Joi.boolean()
    .default(false)
    .optional(),
});

const updateUserSchema = Joi.object({
  role: Joi.string()
    .valid(...Object.values(ROLES))
    .messages({
      'any.only': `Role must be one of: ${Object.values(ROLES).join(', ')}`,
    }),

  isActive: Joi.boolean(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field (role or isActive) is required to update',
  });

module.exports = {
  uuidParamSchema,
  listUsersQuerySchema,
  updateUserSchema,
};
