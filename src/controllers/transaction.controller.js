const TransactionService = require('../services/transaction.service');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');

const create = catchAsync(async (req, res) => {
  const transaction = await TransactionService.create(req.user.id, req.body);
  ApiResponse.created(res, {
    message: 'Transaction recorded successfully',
    data: { transaction },
  });
});

const list = catchAsync(async (req, res) => {
  const { transactions, summary, total, page, limit } = await TransactionService.list(req.query);
  ApiResponse.paginated(res, {
    data: { transactions, summary },
    page,
    limit,
    total,
  });
});

const getById = catchAsync(async (req, res) => {
  const transaction = await TransactionService.getById(req.params.id);
  ApiResponse.success(res, { data: { transaction } });
});

const update = catchAsync(async (req, res) => {
  const transaction = await TransactionService.update(req.params.id, req.body);
  ApiResponse.success(res, {
    message: 'Transaction updated successfully',
    data: { transaction },
  });
});

const remove = catchAsync(async (req, res) => {
  const transaction = await TransactionService.softDelete(req.params.id);
  ApiResponse.success(res, {
    message: 'Transaction deleted successfully',
    data: { transaction },
  });
});

module.exports = { create, list, getById, update, remove };
