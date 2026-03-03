/**
 * Global Error Handler Middleware
 * Catches all errors and returns consistent JSON responses
 */
function globalErrorHandler(error, req, res, next) {
  // Default values
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let status = error.status || 'error';
  let errors = error.errors || null;

  // --- Prisma Error Transformations ---
  
  // P2002: Unique constraint violation (e.g., ISBN or Email already exists)
  if (error.code === 'P2002') {
    statusCode = 409;
    const target = error.meta?.target ? error.meta.target.join(', ') : 'field';
    message = `Duplicate value for ${target}. Please use another value.`;
    status = 'fail';
  } 
  
  // P2025: Record not found (e.g., trying to update/delete a non-existent ID)
  else if (error.code === 'P2025') {
    statusCode = 404;
    message = error.meta?.cause || 'The requested record was not found.';
    status = 'fail';
  } 
  
  // P2003: Foreign key constraint failed (e.g., deleting a book that has active borrows)
  else if (error.code === 'P2003') {
    statusCode = 400;
    message = 'Foreign key constraint failed. Please ensure there are no dependent records.';
    status = 'fail';
  }

  // --- Development Logging ---

if (process.env.NODE_ENV === 'development') {
    console.error(`[${new Date().toISOString()}] DEBUG ERROR ${statusCode}:`, error);
    if (statusCode === 500) console.error(error.stack);
  }

res.status(statusCode).json({
    success: false,
    status,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
}
module.exports = globalErrorHandler;