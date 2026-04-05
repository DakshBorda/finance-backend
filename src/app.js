const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { StatusCodes } = require('http-status-codes');

const config = require('./config');
const logger = require('./config/logger');
const swaggerSpec = require('./config/swagger');
const swaggerUi = require('swagger-ui-express');
const ApiError = require('./utils/ApiError');
const ApiResponse = require('./utils/ApiResponse');
const errorHandler = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimiter');
const routes = require('./routes');

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

// --------------- API Documentation ---------------

app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Finance API Documentation',
}));

// --------------- API Routes ---------------

app.use('/api/v1', apiLimiter, routes);

// --------------- 404 Handler ---------------

app.use((req, res, next) => {
  next(new ApiError(
    StatusCodes.NOT_FOUND,
    `Route ${req.method} ${req.originalUrl} not found`
  ));
});

// --------------- Global Error Handler ---------------

app.use(errorHandler);

module.exports = app;
