const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { StatusCodes } = require('http-status-codes');

const config = require('./config');
const logger = require('./config/logger');
const ApiError = require('./utils/ApiError');
const ApiResponse = require('./utils/ApiResponse');

const app = express();

// --------------- Security Middleware ---------------

// Set security-related HTTP headers
app.use(helmet());

// Enable CORS for all origins in development
app.use(cors({
  origin: config.env === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') : '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// --------------- Body Parsing ---------------

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --------------- Request Logging ---------------

// Use 'dev' format for development, 'combined' for production
const morganFormat = config.env === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: { write: (message) => logger.info(message.trim()) },
  skip: (req) => req.url === '/health', // Don't log health checks
}));

// --------------- Health Check ---------------

app.get('/health', (req, res) => {
  ApiResponse.success(res, {
    message: 'Server is running',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())}s`,
      environment: config.env,
    },
  });
});

// --------------- API Routes ---------------

// Routes will be mounted here in Phase 2
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/users', userRoutes);
// app.use('/api/v1/transactions', transactionRoutes);
// app.use('/api/v1/dashboard', dashboardRoutes);

// --------------- 404 Handler ---------------

app.use((req, res, next) => {
  next(new ApiError(
    StatusCodes.NOT_FOUND,
    `Route ${req.method} ${req.originalUrl} not found`
  ));
});

// --------------- Global Error Handler ---------------

app.use((err, req, res, _next) => {
  // Log the error for debugging
  if (err.isOperational) {
    logger.warn(`${err.statusCode} - ${err.message} - ${req.originalUrl}`);
  } else {
    logger.error('Unexpected error:', err);
  }

  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.isOperational ? err.message : 'Something went wrong';

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.errorCode || 'INTERNAL_ERROR',
      message,
      ...(err.errors && err.errors.length > 0 && { details: err.errors }),
      // Include stack trace only in development
      ...(config.env === 'development' && { stack: err.stack }),
    },
  });
});

module.exports = app;
