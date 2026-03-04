const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const prisma = require('./utils/prisma');
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./middlewares/error.middleware');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');

// Import the bundled v1 routes
const v1Routes = require('./routes/v1');

const app = express();

// ============================================
// SECURITY & GLOBAL MIDDLEWARE
// ============================================

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Global rate limiting to prevent abuse
app.use('/api', apiLimiter);

// Body parsers with size limits for security
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ============================================
// API ROUTES
// ============================================

/**
 * Health Check for monitoring and Docker
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Library Management System API is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * Main API Routes
 * Books, Borrowers, and Borrowing processes are nested under /api/v1
 */
app.use('/api/v1', v1Routes);

// ============================================
// ERROR HANDLING
// ============================================

// Catch-all for undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found on this server`, 404));
});

// Global Error Handler (must be last middleware)
app.use(globalErrorHandler);

// ============================================
// PROCESS MANAGEMENT
// ============================================

/**
 * Ensure Prisma disconnects gracefully on process termination
 */
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Closing database connection...`);
  try {
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = app;