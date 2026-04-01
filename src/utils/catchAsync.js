/**
 * Higher-order function that wraps async route handlers.
 *
 * Without this, every controller would need its own try-catch block.
 * This catches any rejected promise and forwards it to Express's
 * error handling middleware automatically.
 *
 * Usage:
 *   router.get('/items', catchAsync(async (req, res) => { ... }));
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;
