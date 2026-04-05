const DashboardService = require('../services/dashboard.service');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');

const getOverview = catchAsync(async (req, res) => {
  const data = await DashboardService.getOverview(req.query);
  ApiResponse.success(res, { data });
});

const getCategorySummary = catchAsync(async (req, res) => {
  const data = await DashboardService.getCategorySummary(req.query);
  ApiResponse.success(res, { data: { categories: data } });
});

const getTrends = catchAsync(async (req, res) => {
  const data = await DashboardService.getTrends(req.query);
  ApiResponse.success(res, { data: { trends: data } });
});

const getRecent = catchAsync(async (req, res) => {
  const data = await DashboardService.getRecent(req.query);
  ApiResponse.success(res, { data: { transactions: data } });
});

const getTopCategories = catchAsync(async (req, res) => {
  const data = await DashboardService.getTopCategories(req.query);
  ApiResponse.success(res, { data: { categories: data } });
});

module.exports = { getOverview, getCategorySummary, getTrends, getRecent, getTopCategories };
