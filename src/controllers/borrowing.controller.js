/**
 * Borrowing Controller
 * HTTP request/response handling for borrowing process endpoints
 */

const borrowingService = require('../services/borrowing.service');

/**
 * POST /api/v1/borrowing/checkout
 * Checkout a book for a borrower
 */
async function checkout(req, res, next) {
  try {
    const { body } = req.validated;
    const record = await borrowingService.checkout(body);

    return res.status(201).json({
      success: true,
      message: 'Book checked out successfully',
      data: record,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/borrowing/return/:id
 * Return a borrowed book
 */
async function returnBook(req, res, next) {
  try {
    const { id } = req.validated.params;
    const record = await borrowingService.returnBook(id);

    return res.status(200).json({
      success: true,
      message: 'Book returned successfully',
      data: record,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/borrowing/current/:borrowerId
 * Get current books borrowed by a borrower (ACTIVE records)
 */
async function getCurrentBooks(req, res, next) {
  try {
    const { borrowerId } = req.validated.params;
    const { page, limit } = req.validated.query;

    const result = await borrowingService.getCurrentBooks(borrowerId, page, limit);

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/borrowing/overdue
 * Get all overdue ACTIVE borrowing records
 */
async function getOverdueRecords(req, res, next) {
  try {
    const { page, limit } = req.validated.query;

    const result = await borrowingService.getOverdueRecords(page, limit);

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/borrowing/:id
 * Get a specific borrowing record
 */
async function getBorrowingRecord(req, res, next) {
  try {
    const { id } = req.validated.params;
    const record = await borrowingService.getBorrowingRecord(id);

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  checkout,
  returnBook,
  getCurrentBooks,
  getOverdueRecords,
  getBorrowingRecord,
};
