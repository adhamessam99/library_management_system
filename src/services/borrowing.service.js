/**
 * Borrowing Service
 * Business logic for borrowing process: checkout, return, current books, overdue records
 */

const borrowingRepository = require('../repositories/borrowing.repository');
const borrowerRepository = require('../repositories/borrower.repository');
const AppError = require('../utils/AppError');

/**
 * Checkout a book for a borrower
 * Business rules:
 * - Borrower must exist
 * - Book must exist
 * - Book must have available quantity > 0
 * - Due date must be in the future
 * @param {Object} checkoutData - { bookId, borrowerId, dueDate }
 * @returns {Promise<Object>} Created borrowing record
 * @throws {AppError} 404 if borrower/book not found, 400 if no availability
 */
async function checkout(checkoutData) {
  const { bookId, borrowerId, dueDate } = checkoutData;

    // 1. Parallel existence & status checks for better performance
  const [borrower, book, activeRecord] = await Promise.all([
    borrowerRepository.findBorrowerById(borrowerId),

    borrowingRepository.findBookAvailability(bookId),
    // Check if this borrower ALREADY has this book
    borrowingRepository.countActiveBorrowings(borrowerId, bookId) 
  ]);

  if (!borrower) {
    throw new AppError(`Borrower with ID ${borrowerId} not found`, 404);
  }

  if (!book) {
    throw new AppError(`Book with ID ${bookId} not found`, 404);
  }

  // Prevent duplicate borrowing of the same book
  if (activeRecord > 0) {
    throw new AppError(`Borrower already has an active copy of "${book.title}"`, 409);
  }

  //  Availability Check
  if (book.availableQuantity <= 0) {
    throw new AppError(`Book "${book.title}" is currently out of stock.`, 400);
  }

  // 4. Validate due date
  if (new Date(dueDate) <= new Date()) {
    throw new AppError('Due date must be in the future', 400);
  }

  try {
    return await borrowingRepository.createBorrowingRecord(bookId, borrowerId, dueDate);
  } catch (error) {
    if (error.code === 'P2025') {
      throw new AppError(`Race condition: Book "${book.title}" was just taken by another borrower.`, 400);
    }
    throw error;
  }
}

/**
 * Return a borrowed book
 * Business rules:
 * - Borrowing record must exist
 * - Record must be ACTIVE
 * @param {number} recordId - Borrowing record ID
 * @returns {Promise<Object>} Updated borrowing record
 * @throws {AppError} 404 if record not found, 400 if not ACTIVE
 */
async function returnBook(recordId) {
  const record = await borrowingRepository.findBorrowingRecordById(recordId);
  
  if (!record) {
    throw new AppError(`Borrowing record not found`, 404);
  }

  if (record.status !== 'ACTIVE') {
    throw new AppError(`Record is already ${record.status.toLowerCase()}.`, 400);
  }

  return await borrowingRepository.updateBorrowingRecordStatus(recordId, record.bookId);
}

/**
 * Get current books borrowed by a borrower (ACTIVE records only)
 * @param {number} borrowerId - Borrower ID
 * @param {number} page - Page number
 * @param {number} limit - Results per page
 * @returns {Promise<Object>} { data: [], pagination: {} }
 * @throws {AppError} 404 if borrower not found
 */
async function getCurrentBooks(borrowerId, page, limit) {
  // Verify borrower exists
  const borrower = await borrowerRepository.findBorrowerById(borrowerId);
  if (!borrower) {
    throw new AppError(`Borrower with ID ${borrowerId} not found`, 404);
  }

  return await borrowingRepository.findCurrentBooks(borrowerId, page, limit);
}

/**
 * Get all overdue ACTIVE borrowing records
 * @param {number} page - Page number
 * @param {number} limit - Results per page
 * @returns {Promise<Object>} { data: [], pagination: {} }
 */
async function getOverdueRecords(page, limit) {
  return await borrowingRepository.findOverdueRecords(page, limit);
}

/**
 * Get a specific borrowing record
 * @param {number} id - Borrowing record ID
 * @returns {Promise<Object>} Borrowing record
 * @throws {AppError} 404 if not found
 */
async function getBorrowingRecord(id) {
  const record = await borrowingRepository.findBorrowingRecordById(id);
  if (!record) {
    throw new AppError(`Borrowing record with ID ${id} not found`, 404);
  }
  return record;
}

module.exports = {
  checkout,
  returnBook,
  getCurrentBooks,
  getOverdueRecords,
  getBorrowingRecord,
};
