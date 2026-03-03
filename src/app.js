/**
 * Main Express Application
 * Complete setup showing integration of all modules
 */

const express = require('express');
const cors = require('cors');
const prisma = require('./utils/prisma');
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./middlewares/error.middleware');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');

// Import routes
const bookRoutes = require('./routes/v1/book.routes');

// Create Express app
const app = express();

// ============================================
// MIDDLEWARE SETUP
// ============================================

/**
 * CORS Middleware
 * Allow requests from any origin (customize for production)
 */
app.use(cors());

// 2. Apply the general rate limiter to all API routes
// This protects your server from brute force and DoS attacks
app.use('/api', apiLimiter);

/**
 * Body Parser Middleware
 * Parse incoming JSON bodies
 */
app.use(express.json({ limit: '10kb' }));

/**
 * URL Encoded Parser Middleware
 * Parse incoming form-encoded bodies
 */
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// ============================================
// API ROUTES
// ============================================

/**
 * Health Check Endpoint
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString() 
  });
});

/**
 * V1 API Routes
 * All book routes are mounted under /api/v1
 * Endpoints:
 *   - POST   /api/v1/books              Create new book
 *   - GET    /api/v1/books              Get all books (with pagination)
 *   - GET    /api/v1/books/search       Search books
 *   - GET    /api/v1/books/:id          Get book by ID
 *   - PUT    /api/v1/books/:id          Update book
 *   - DELETE /api/v1/books/:id          Delete book
 */
app.use('/api/v1/books', bookRoutes);

// ============================================
// 404 CATCH-ALL ROUTE
// ============================================

/**
 * Catch-all route for undefined URLs
 * Must be placed before error handler
 */
app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// ============================================
// GLOBAL ERROR HANDLER MIDDLEWARE
// ============================================

/**
 * Global Error Handler
 * This middleware catches all errors thrown in route handlers
 * Must be defined AFTER all other middleware and routes
 */
app.use(globalErrorHandler);

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

/**
 * Handle process termination signals
 */
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    // Disconnect Prisma
    await prisma.$disconnect();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }

  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = app;
