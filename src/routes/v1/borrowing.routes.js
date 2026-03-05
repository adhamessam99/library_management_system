/**
 * Borrowing Routes v1
 * All routes are prefixed with /api/v1/borrowing
 */

const express = require('express');
const borrowingController = require('../../controllers/borrowing.controller');
const { validate } = require('../../middlewares/validate.middleware');
const { apiLimiter } = require('../../middlewares/rateLimit.middleware');

const {
  checkoutSchema,
  returnBookSchema,
  getCurrentBooksSchema,
  getOverdueSchema,
  borrowingRecordIdSchema,
} = require('../../validations/borrowing.validation');

const router = express.Router();

/**
 * POST /api/v1/borrowing/checkout
 * Checkout a book for a borrower
 */
router.post(
  '/checkout',
  apiLimiter,
  validate(checkoutSchema),
  borrowingController.checkout
);

/**
 * PUT /api/v1/borrowing/return/:id
 * Return a borrowed book
 */
router.put(
  '/return/:id',
  apiLimiter,
  validate(returnBookSchema),
  borrowingController.returnBook
);

/**
 * GET /api/v1/borrowing/current/:borrowerId
 * Get current books borrowed by a borrower (ACTIVE records)
 */
router.get(
  '/current/:borrowerId',
  apiLimiter,
  validate(getCurrentBooksSchema),
  borrowingController.getCurrentBooks
);

/**
 * GET /api/v1/borrowing/overdue
 * Get all overdue ACTIVE borrowing records
 */
router.get(
  '/overdue',
  apiLimiter,
  validate(getOverdueSchema),
  borrowingController.getOverdueRecords
);

/**
 * GET /api/v1/borrowing/:id
 * Get a specific borrowing record
 */
router.get(
  '/:id',
  validate(borrowingRecordIdSchema),
  borrowingController.getBorrowingRecord
);

module.exports = router;
