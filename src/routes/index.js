const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const transactionRoutes = require('./transaction.routes');
const dashboardRoutes = require('./dashboard.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/transactions', transactionRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
