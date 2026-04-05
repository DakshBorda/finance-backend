const express = require('express');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');
const validate = require('../middlewares/validate');
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
} = require('../validators/auth.validator');

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *     responses:
 *       201: { description: User registered successfully }
 *       400: { description: Validation error }
 *       409: { description: Email already exists }
 */
router.post('/register', authLimiter, validate(registerSchema), authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive JWT tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 */
router.post('/login', authLimiter, validate(loginSchema), authController.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: New token pair }
 *       401: { description: Invalid or expired refresh token }
 */
router.post('/refresh', authLimiter, validate(refreshTokenSchema), authController.refreshToken);

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Get own profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User profile }
 *       401: { description: Not authenticated }
 *   patch:
 *     tags: [Auth]
 *     summary: Update own profile (name only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *     responses:
 *       200: { description: Profile updated }
 */
router.get('/profile', authenticate, authController.getProfile);
router.patch('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);

/**
 * @swagger
 * /auth/change-password:
 *   patch:
 *     tags: [Auth]
 *     summary: Change own password
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Password changed }
 *       400: { description: Invalid current password or same password }
 */
router.patch('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

module.exports = router;
