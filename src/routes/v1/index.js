const express = require('express');
const bookRoutes = require('./book.routes');
const borrowerRoutes = require('./borrower.routes');

const router = express.Router();

/**
 * Route Mounting
 * All these will be prefixed with /api/v1/
 */
router.use('/books', bookRoutes);
router.use('/borrowers', borrowerRoutes);

module.exports = router;