/**
 * Borrowing Repository
 */

const prisma = require('../utils/prisma');

// Shared select object for borrowing records to avoid repetition
const BORROWING_RECORD_SELECT = {
  id: true,
  bookId: true,
  borrowerId: true,
  borrowedDate: true,
  dueDate: true,
  returnedDate: true,
  status: true,
  book: {
    select: { id: true, title: true, author: true, isbn: true }
  },
  borrower: {
    select: { id: true, name: true, email: true }
  }
};

/**
 * Create a new borrowing record with transaction to ensure consistency
 * Decrements book quantity in a single transaction
 * @param {number} bookId - Book ID
 * @param {number} borrowerId - Borrower ID
 * @param {Date} dueDate - When the book is due
 */
async function createBorrowingRecord(bookId, borrowerId, dueDate) {
  return await prisma.$transaction(async (tx) => {
    const record = await tx.borrowingRecord.create({
      data: {
        bookId,
        borrowerId,
        borrowedDate: new Date(),
        dueDate: new Date(dueDate),
        status: 'ACTIVE',
      },
      select: BORROWING_RECORD_SELECT
    });

    // Decrement book quantity
    await tx.book.update({
      where: { id: bookId,
        availableQuantity: {
          gt: 0, // Extra safety: only update if stock exists
        },
       },
      data: {
        availableQuantity: {
          decrement: 1,
        },
      },
    });

    return record;
  });
}

/**
 * Update borrowing record status to RETURNED with transaction
 * Increments book quantity in a single transaction
 * @param {number} recordId - Borrowing record ID
 * @returns {Promise<Object>} Updated borrowing record
 */
async function updateBorrowingRecordStatus(recordId, bookId) {
  return await prisma.$transaction(async (tx) => {
    const record = await tx.borrowingRecord.update({
      where: { id: recordId },
      data: {
        status: 'RETURNED',
        returnedDate: new Date(),
      },
      select: BORROWING_RECORD_SELECT
    });

    // Increment book quantity
    await tx.book.update({
      where: { id: bookId },
      data: { availableQuantity: { increment: 1 } },
    });

    return record;
  });
}

/**
 * Find borrowing record by ID
 * @param {number} id - Borrowing record ID
 * @returns {Promise<Object|null>} Borrowing record or null
 */
async function findBorrowingRecordById(id) {
  return await prisma.borrowingRecord.findUnique({
    where: { id },
    select: BORROWING_RECORD_SELECT
  });
}

/**
 * Get current books borrowed by a borrower (ACTIVE records)
 * @param {number} borrowerId - Borrower ID
 * @param {number} page - Page number
 * @param {number} limit - Results per page
 * @returns {Promise<Object>} { data: [], pagination: {} }
 */
async function findCurrentBooks(borrowerId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  // Run in parallel for performance
  const [records, total] = await Promise.all([
    prisma.borrowingRecord.findMany({
      where: {
        borrowerId,
        status: 'ACTIVE',
      },
      take: limit,
      skip,
      orderBy: { dueDate: 'asc' }, // Due soonest first
      select: {
        id: true,
        bookId: true,
        borrowedDate: true,
        dueDate: true,
        status: true,
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            isbn: true,
            shelfLocation: true,
          },
        },
      },
    }),
    prisma.borrowingRecord.count({
      where: {
        borrowerId,
        status: 'ACTIVE',
      },
    }),
  ]);

  const pages = Math.ceil(total / limit);

  return {
    data: records,
    pagination: { page, limit, total, pages, hasMore: page < pages },
  };
}

/**
 * Get all overdue ACTIVE borrowing records
 * @param {number} page - Page number
 * @param {number} limit - Results per page
 * @returns {Promise<Object>} { data: [], pagination: {} }
 */
async function findOverdueRecords(page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const now = new Date();

  // Run in parallel for performance
  const [records, total] = await Promise.all([
    prisma.borrowingRecord.findMany({
      where: {
        status: 'ACTIVE',
        dueDate: {
          lt: now, // Due date is before now
        },
      },
      take: limit,
      skip,
      orderBy: { dueDate: 'asc' }, // fetch Most overdue first
      select: BORROWING_RECORD_SELECT
    }),
    prisma.borrowingRecord.count({
      where: {
        status: 'ACTIVE',
        dueDate: {
          lt: now,
        },
      },
    }),
  ]);

  const pages = Math.ceil(total / limit);

  return {
    data: records,
    pagination: { page, limit, total, pages, hasMore: page < pages },
  };
}

/**
 * Count active borrowing records for a borrower
 * @param {number} borrowerId - Borrower ID
 * @param {number|null} bookId - (Optional) Specific Book ID to check
 * @returns {Promise<number>} Count of active records
 */
async function countActiveBorrowings(borrowerId, bookId = null) {
  return await prisma.borrowingRecord.count({
    where: {
      borrowerId,
      status: 'ACTIVE',
      bookId: bookId || undefined, 
    },
  });
}

/**
 * Get book availability
 * @param {number} bookId - Book ID
 * @returns {Promise<Object|null>} Book with availability info
 */
async function findBookAvailability(bookId) {
  return await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      id: true,
      title: true,
      author: true,
      isbn: true,
      availableQuantity: true,
      totalQuantity: true,
    },
  });
}

module.exports = {
  createBorrowingRecord,
  updateBorrowingRecordStatus,
  findBorrowingRecordById,
  findCurrentBooks,
  findOverdueRecords,
  countActiveBorrowings,
  findBookAvailability,
};
