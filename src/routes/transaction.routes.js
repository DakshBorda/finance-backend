const express = require('express');
const txnController = require('../controllers/transaction.controller');
const authenticate = require('../middlewares/auth');
const roleGuard = require('../middlewares/roleGuard');
const validate = require('../middlewares/validate');
const { ROLES } = require('../utils/constants');
const {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
  uuidParamSchema,
} = require('../validators/transaction.validator');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /transactions:
 *   get:
 *     tags: [Transactions]
 *     summary: List transactions (filtered, paginated, sorted)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [INCOME, EXPENSE] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [date, amount, createdAt, category, type], default: date }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200: { description: Paginated list with inline summary stats }
 *   post:
 *     tags: [Transactions]
 *     summary: Create a transaction (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, category, date]
 *             properties:
 *               amount: { type: number, example: 5000.50 }
 *               type: { type: string, enum: [INCOME, EXPENSE] }
 *               category: { type: string, enum: [SALARY, INVESTMENT, FREELANCE, FOOD, TRANSPORT, UTILITIES, HEALTHCARE, ENTERTAINMENT, RENT, EDUCATION, OTHER] }
 *               date: { type: string, format: date }
 *               description: { type: string }
 *               reference: { type: string, description: Auto-generated if omitted }
 *     responses:
 *       201: { description: Transaction created }
 *       400: { description: Validation error }
 *       403: { description: Insufficient permissions }
 */
router.get('/', validate(listTransactionsQuerySchema, 'query'), txnController.list);
router.post('/', roleGuard(ROLES.ADMIN), validate(createTransactionSchema), txnController.create);

/**
 * @swagger
 * /transactions/{id}:
 *   get:
 *     tags: [Transactions]
 *     summary: Get transaction by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Transaction detail }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Transactions]
 *     summary: Update transaction (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number }
 *               type: { type: string }
 *               category: { type: string }
 *               date: { type: string, format: date }
 *               description: { type: string }
 *     responses:
 *       200: { description: Transaction updated }
 *       403: { description: Insufficient permissions }
 *   delete:
 *     tags: [Transactions]
 *     summary: Soft-delete transaction (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Transaction deleted }
 *       403: { description: Insufficient permissions }
 */
router.get('/:id', validate(uuidParamSchema, 'params'), txnController.getById);
router.patch('/:id', roleGuard(ROLES.ADMIN), validate(uuidParamSchema, 'params'), validate(updateTransactionSchema), txnController.update);
router.delete('/:id', roleGuard(ROLES.ADMIN), validate(uuidParamSchema, 'params'), txnController.remove);

module.exports = router;
