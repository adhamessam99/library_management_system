const express = require('express');
const bookRoutes = require('./book.routes');
const borrowerRoutes = require('./borrower.routes');
const borrowingRoutes = require('./borrowing.routes');
const reportingRoutes = require('./reporting.routes');

const router = express.Router();

/**
 * Route Mounting
 * All these will be prefixed with /api/v1/
 */
router.use('/books', bookRoutes);
router.use('/borrowers', borrowerRoutes);
router.use('/borrowing', borrowingRoutes);
router.use('/reports', reportingRoutes);

module.exports = router;