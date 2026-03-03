/**
 * Server Entry Point
 * Starts the Express application on specified port
 */

const app = require('./app');

// Get port from environment or use default
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

/**
 * Start Server
 */
const server = app.listen(PORT, HOST, () => {
  console.log(`\n✅ Server running on http://${HOST}:${PORT}`);
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  server.close(() => {
    process.exit(1);
  });
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
