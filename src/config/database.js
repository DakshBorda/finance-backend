const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

// Singleton pattern to avoid multiple connections during hot-reload
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
} else {
  // In development, reuse the client across hot-reloads
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  prisma = global.__prisma;
}


async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error('Failed to connect to database:', error.message);
    process.exit(1);
  }
}


async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info('Database connection closed');
}

module.exports = { prisma, connectDatabase, disconnectDatabase };
