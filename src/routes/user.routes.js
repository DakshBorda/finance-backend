const express = require('express');
const userController = require('../controllers/user.controller');
const authenticate = require('../middlewares/auth');
const roleGuard = require('../middlewares/roleGuard');
const validate = require('../middlewares/validate');
const { ROLES } = require('../utils/constants');
const {
  uuidParamSchema,
  listUsersQuerySchema,
  updateUserSchema,
} = require('../validators/user.validator');

const router = express.Router();

// All routes below require ADMIN role
router.use(authenticate, roleGuard(ROLES.ADMIN));

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [ADMIN, ANALYST, VIEWER] }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, email, firstName, lastName, role] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200: { description: Paginated user list }
 *       403: { description: Not an admin }
 */
router.get('/', validate(listUsersQuerySchema, 'query'), userController.listUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: User detail with transaction count }
 *       404: { description: User not found }
 *   patch:
 *     tags: [Users]
 *     summary: Update user role/status (Admin only)
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
 *               role: { type: string, enum: [ADMIN, ANALYST, VIEWER] }
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: User updated }
 *       400: { description: Cannot modify own account }
 *   delete:
 *     tags: [Users]
 *     summary: Soft-delete user (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: User soft-deleted }
 *       400: { description: Cannot delete own account }
 */
router.get('/:id', validate(uuidParamSchema, 'params'), userController.getUserById);
router.patch('/:id', validate(uuidParamSchema, 'params'), validate(updateUserSchema), userController.updateUser);
router.delete('/:id', validate(uuidParamSchema, 'params'), userController.deleteUser);

/**
 * @swagger
 * /users/{id}/restore:
 *   patch:
 *     tags: [Users]
 *     summary: Restore soft-deleted user (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: User restored }
 *       400: { description: User is not deleted }
 */
router.patch('/:id/restore', validate(uuidParamSchema, 'params'), userController.restoreUser);

module.exports = router;
