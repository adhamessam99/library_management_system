/**
 * Borrower Repository
 */

const prisma = require('../utils/prisma');

/**
 * Create a new borrower
 * @param {Object} borrowerData - Borrower data (name, email)
 * @returns {Promise<Object>} Created borrower object
 */
async function createBorrower(borrowerData) {
  return await prisma.borrower.create({
    data: {
      name: borrowerData.name,
      email: borrowerData.email,
    },
    select: {
      id: true,
      name: true,
      email: true,
      registeredDate: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Find all borrowers with pagination
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Results per page
 * @returns {Promise<Object>} { data: [], pagination: {} }
 */
// use take and skip for optimized pagination and for scalability as data grows 
async function findAllBorrowers(page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  // Optimized: Run count and findMany in parallel
  const [borrowers, total] = await Promise.all([
    prisma.borrower.findMany({
      take: limit,
      skip,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, registeredDate: true }
    }),
    prisma.borrower.count()
  ]);

  const pages = Math.ceil(total / limit);

  return {
    data: borrowers,
    pagination: { page, limit, total, pages, hasMore: page < pages },
  };
}

/**
 * Find borrower by ID
 * @param {number} id - Borrower ID
 * @returns {Promise<Object|null>} Borrower object or null
 */
async function findBorrowerById(id) {
  return await prisma.borrower.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      registeredDate: true,
      createdAt: true,
      updatedAt: true,
      borrowingRecords: {
        select: {
          id: true,
          bookId: true,
          borrowedDate: true,
          dueDate: true,
          returnedDate: true,
          status: true,
        },
      },
    },
  });
}

/**
 * Find borrower by email
 * @param {string} email - Borrower email
 * @param {number} excludeId - Optional ID to exclude (for update checks)
 * @returns {Promise<Object|null>} Borrower object or null
 */
async function findBorrowerByEmail(email, excludeId = null) {
  if (excludeId) {
    return await prisma.borrower.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
        NOT: {
          id: excludeId,
        },
      },
    });
  }

  return await prisma.borrower.findUnique({
    where: { email },
  });
}

/**
 * Update borrower details
 * @param {number} id - Borrower ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated borrower object
 */
async function updateBorrower(id, updateData) {
  return await prisma.borrower.update({
    where: { id },
    data: {
      ...(updateData.name && { name: updateData.name }),
      ...(updateData.email && { email: updateData.email }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      registeredDate: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Delete a borrower by ID
 * @param {number} id - Borrower ID
 * @returns {Promise<Object>} Deleted borrower object
 */
async function deleteBorrower(id) {
  return await prisma.borrower.delete({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}

/**
 * Check for active borrowing records
 * @param {number} borrowerId - Borrower ID
 * @returns {Promise<number>} Count of active borrowing records
 */
async function countActiveBorrowings(borrowerId) {
  return await prisma.borrowingRecord.count({
    where: {
      borrowerId,
      status: 'ACTIVE',
    },
  });
}

module.exports = {
  createBorrower,
  findAllBorrowers,
  findBorrowerById,
  findBorrowerByEmail,
  updateBorrower,
  deleteBorrower,
  countActiveBorrowings,
};
