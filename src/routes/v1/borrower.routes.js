/**
 * Borrower Routes v1
 * All routes are prefixed with /api/v1/borrowers
 */

const express = require('express');
const borrowerController = require('../../controllers/borrower.controller');
const { validate } = require('../../middlewares/validate.middleware');
const { apiLimiter } = require('../../middlewares/rateLimit.middleware');

const {
  createBorrowerSchema,
  updateBorrowerSchema,
  borrowerIdParamSchema,
  getAllBorrowersSchema,
} = require('../../validations/borrower.validation');

const router = express.Router();

/**
 * POST /api/v1/borrowers
 * Create a new borrower
 */
router.post(
  '/',
  apiLimiter,
  validate(createBorrowerSchema),
  borrowerController.createBorrower
);

/**
 * GET /api/v1/borrowers
 * Get all borrowers with pagination
 */
router.get(
  '/',
  apiLimiter,
  validate(getAllBorrowersSchema),
  borrowerController.getAllBorrowers
);

/**
 * GET /api/v1/borrowers/:id
 * Get borrower by ID
 */
router.get(
  '/:id',
  validate(borrowerIdParamSchema),
  borrowerController.getBorrowerById
);

/**
 * PUT /api/v1/borrowers/:id
 * Update borrower details (partial update allowed)
 */
router.put(
  '/:id',
  validate(updateBorrowerSchema),
  borrowerController.updateBorrower
);

/**
 * DELETE /api/v1/borrowers/:id
 * Delete a borrower
 */
router.delete(
  '/:id',
  validate(borrowerIdParamSchema),
  borrowerController.deleteBorrower
);

module.exports = router;
