/**
 * Book Routes v1
 * All routes are prefixed with /api/v1/books
 */
const express = require('express');
const bookController = require('../../controllers/book.controller');
const { validate } = require('../../middlewares/validate.middleware');
const { searchLimiter } = require('../../middlewares/rateLimit.middleware');

const {
  createBookSchema,
  updateBookSchema,
  getBooksSchema,      
  bookIdParamSchema,
} = require('../../validations/book.validation');

const router = express.Router();

/**
 * GET /api/v1/books/search
 * Also uses getBooksSchema since it handles query params (search, page, limit)
 */
router.get(
  '/search',
  searchLimiter, 
  validate(getBooksSchema),
  bookController.getAllBooks
);

/**
 * GET /api/v1/books
 * Uses getBooksSchema for pagination and search
 */
router.get(
  '/',
  validate(getBooksSchema),
  bookController.getAllBooks
);

/**
 * POST /api/v1/books
 */
router.post(
  '/',
  validate(createBookSchema),
  bookController.createBook
);


/**
 * GET /api/v1/books/:id
 */
router.get(
  '/:id',
  validate(bookIdParamSchema),
  bookController.getBookById
);

/**
 * PUT /api/v1/books/:id
 */
router.put(
  '/:id',
  validate(updateBookSchema),
  bookController.updateBook
);

/**
 * DELETE /api/v1/books/:id
 */
router.delete(
  '/:id',
  validate(bookIdParamSchema),
  bookController.deleteBook
);

module.exports = router;