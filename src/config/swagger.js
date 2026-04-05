const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./index');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Finance Data Processing & Access Control API',
      version: '1.0.0',
      description: 'RESTful API for managing financial transactions, user roles, and dashboard analytics.',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api/v1`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['ADMIN', 'ANALYST', 'VIEWER'] },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            amount: { type: 'string', description: 'Decimal value as string' },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
            category: { type: 'string', enum: ['SALARY', 'INVESTMENT', 'FREELANCE', 'FOOD', 'TRANSPORT', 'UTILITIES', 'HEALTHCARE', 'ENTERTAINMENT', 'RENT', 'EDUCATION', 'OTHER'] },
            date: { type: 'string', format: 'date' },
            description: { type: 'string', nullable: true },
            reference: { type: 'string' },
            isDeleted: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication & profile management' },
      { name: 'Users', description: 'User management (Admin only)' },
      { name: 'Transactions', description: 'Financial transaction CRUD' },
      { name: 'Dashboard', description: 'Analytics & reporting' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
