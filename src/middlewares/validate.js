const ApiError = require('../utils/ApiError');

/**
 * Validates req[source] against a Joi schema.
 * Replaces the original data with the sanitized version on success.
 */
const validate = (schema, source = 'body') => {
  return (req, _res, next) => {
    const dataToValidate = req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,    // Collect ALL errors, not just the first one
      stripUnknown: true,   // Remove any fields not in the schema
      errors: {
        wrap: { label: false }, // Don't wrap field names in quotes
      },
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return next(
        ApiError.badRequest('Validation failed', details)
      );
    }

    // Replace request data with the validated + sanitized version
    req[source] = value;
    next();
  };
};

module.exports = validate;
