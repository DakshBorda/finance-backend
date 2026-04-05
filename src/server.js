const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const { connectDatabase, disconnectDatabase } = require('./config/database');

const PORT = config.port;

async function startServer() {
  // Verify database connection before accepting requests
  await connectDatabase();

  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${config.env} mode`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`API base URL: http://localhost:${PORT}/api/v1`);
    logger.info(`API docs:     http://localhost:${PORT}/api/v1/docs`);
  });

  // ---- Graceful shutdown handling ----
  // When the process receives a termination signal, we want to
  // close things down cleanly rather than just dying mid-request.

  const shutdown = async (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    server.close(async () => {
      logger.info('HTTP server closed');
      await disconnectDatabase();
      process.exit(0);
    });

    // Force shutdown if graceful takes too long
    setTimeout(() => {
      logger.error('Forced shutdown — graceful shutdown timed out');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Catch unhandled rejections and uncaught exceptions
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
    // Don't crash the server for unhandled rejections,
    // but make sure they're logged
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Uncaught exceptions leave the app in an unknown state,
    // so we shut down after logging
    shutdown('UNCAUGHT_EXCEPTION');
  });
}

startServer();
