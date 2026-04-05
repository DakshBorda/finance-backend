const Joi = require('joi');

// Password regex: at least 1 uppercase, 1 lowercase, 1 digit, 1 special char
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=])/;
const NAME_PATTERN = /^[a-zA-Z\s'-]+$/;

const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .max(255)
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),

  password: Joi.string()
    .required()
    .min(8)
    .max(128)
    .pattern(PASSWORD_PATTERN)
    .messages({
      'any.required': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password must be at most 128 characters',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),

  firstName: Joi.string()
    .required()
    .trim()
    .min(1)
    .max(50)
    .pattern(NAME_PATTERN)
    .messages({
      'any.required': 'First name is required',
      'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes',
    }),

  lastName: Joi.string()
    .required()
    .trim()
    .min(1)
    .max(50)
    .pattern(NAME_PATTERN)
    .messages({
      'any.required': 'Last name is required',
      'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes',
    }),
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required',
    }),
});

const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .pattern(NAME_PATTERN)
    .messages({
      'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes',
    }),

  lastName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .pattern(NAME_PATTERN)
    .messages({
      'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes',
    }),
})
  .min(1) // At least one field must be present
  .messages({
    'object.min': 'At least one field (firstName or lastName) is required to update',
  });

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required',
    }),

  newPassword: Joi.string()
    .required()
    .min(8)
    .max(128)
    .pattern(PASSWORD_PATTERN)
    .messages({
      'any.required': 'New password is required',
      'string.min': 'New password must be at least 8 characters',
      'string.max': 'New password must be at most 128 characters',
      'string.pattern.base':
        'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
};
