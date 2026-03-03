const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');

/**
 * General API Limiter
 * Applied to all /api routes
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  handler: (req, res, next, options) => {
    // Integrate with our custom AppError for consistency!
    next(new AppError(options.message, 429));
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Stricter Limiter for Search
 * Prevents heavy database queries from being spammed
 */
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Only 20 searches per minute
  message: 'Search limit reached. Please wait a moment.',
  handler: (req, res, next, options) => {
    next(new AppError(options.message, 429));
  }
});

module.exports = { apiLimiter, searchLimiter };