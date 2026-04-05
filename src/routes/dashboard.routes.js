const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const authenticate = require('../middlewares/auth');
const roleGuard = require('../middlewares/roleGuard');
const validate = require('../middlewares/validate');
const { ROLES } = require('../utils/constants');
const {
  overviewQuerySchema,
  categorySummaryQuerySchema,
  trendsQuerySchema,
  recentQuerySchema,
  topCategoriesQuerySchema,
} = require('../validators/dashboard.validator');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /dashboard/recent:
 *   get:
 *     tags: [Dashboard]
 *     summary: Recent transactions (all roles)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 5, maximum: 20 }
 *     responses:
 *       200: { description: Recent transactions list }
 */
router.get('/recent', validate(recentQuerySchema, 'query'), dashboardController.getRecent);

/**
 * @swagger
 * /dashboard/overview:
 *   get:
 *     tags: [Dashboard]
 *     summary: Financial overview (Analyst, Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Income/expense totals, net balance, counts }
 *       403: { description: Viewers cannot access }
 */
router.get('/overview', roleGuard(ROLES.ADMIN, ROLES.ANALYST), validate(overviewQuerySchema, 'query'), dashboardController.getOverview);

/**
 * @swagger
 * /dashboard/category-summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Category breakdown with percentages (Analyst, Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [INCOME, EXPENSE] }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Category-wise amounts and percentages }
 */
router.get('/category-summary', roleGuard(ROLES.ADMIN, ROLES.ANALYST), validate(categorySummaryQuerySchema, 'query'), dashboardController.getCategorySummary);

/**
 * @swagger
 * /dashboard/trends:
 *   get:
 *     tags: [Dashboard]
 *     summary: Monthly income/expense trends with moving average (Analyst, Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: months
 *         schema: { type: integer, default: 12, maximum: 36 }
 *     responses:
 *       200: { description: Monthly trend data with 3-month moving average }
 */
router.get('/trends', roleGuard(ROLES.ADMIN, ROLES.ANALYST), validate(trendsQuerySchema, 'query'), dashboardController.getTrends);

/**
 * @swagger
 * /dashboard/top-categories:
 *   get:
 *     tags: [Dashboard]
 *     summary: Top spending/earning categories (Analyst, Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 5, maximum: 20 }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [INCOME, EXPENSE] }
 *     responses:
 *       200: { description: Top categories by total amount }
 */
router.get('/top-categories', roleGuard(ROLES.ADMIN, ROLES.ANALYST), validate(topCategoriesQuerySchema, 'query'), dashboardController.getTopCategories);

module.exports = router;
