/**
 * Borrower Service
 * Business logic layer - validation, uniqueness checks, transactions
 */

const borrowerRepository = require('../repositories/borrower.repository');
const AppError = require('../utils/AppError');
const prisma = require('../utils/prisma');

/**
 * Create a new borrower
 * Business rule: Email must be unique
 * @param {Object} borrowerData - Validated borrower data
 * @returns {Promise<Object>} Created borrower
 */
async function createBorrower(borrowerData) {
  // Check if email already exists
  const existingBorrower = await borrowerRepository.findBorrowerByEmail(borrowerData.email);
  if (existingBorrower) {
    throw new AppError(`A borrower with email ${borrowerData.email} already exists`, 409);
  }

  return await borrowerRepository.createBorrower(borrowerData);
}

/**
 * Get all borrowers with pagination
 * @param {number} page - Page number
 * @param {number} limit - Results per page
 * @returns {Promise<Object>} { data: [], pagination: {} }
 */
async function getAllBorrowers(page, limit) {
  return await borrowerRepository.findAllBorrowers(page, limit);
}

/**
 * Get borrower by ID
 * @param {number} id - Borrower ID
 * @returns {Promise<Object>} Borrower object with borrowing records
 * @throws {AppError} 404 if borrower not found
 */
async function getBorrowerById(id) {
  const borrower = await borrowerRepository.findBorrowerById(id);

  if (!borrower) {
    throw new AppError(`Borrower with ID ${id} not found`, 404);
  }

  return borrower;
}

/**
 * Update borrower details
 * Business rule: Email must be unique (if being changed)
 * @param {number} id - Borrower ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated borrower
 * @throws {AppError} 404 if borrower not found, 409 if email duplicate
 */
async function updateBorrower(id, updateData) {
  const existingBorrower = await getBorrowerById(id);

  // If email is being changed, check uniqueness
  if (updateData.email && updateData.email !== existingBorrower.email) {
    const duplicateEmail = await borrowerRepository.findBorrowerByEmail(
      updateData.email,
      id 
    );
    if (duplicateEmail) {
      throw new AppError(`A borrower with email ${updateData.email} already exists`, 409);
    }
  }

  return await borrowerRepository.updateBorrower(id, updateData);
}

/**
 * Delete a borrower
 * Business rule: Cannot delete if borrower has ACTIVE borrowing records
 * @param {number} id - Borrower ID
 * @returns {Promise<Object>} Deleted borrower
 * @throws {AppError} 404 if not found, 400 if active borrowings exist
 */
 // Uses transaction to ensure consistency and prevent race conditions
async function deleteBorrower(id) {
  // We use a transaction to ensure no books are borrowed during the deletion process
  return await prisma.$transaction(async (tx) => {
    const activeBorrowCount = await tx.borrowingRecord.count({
      where: { borrowerId: Number(id), status: 'ACTIVE' },
    });

    if (activeBorrowCount > 0) {
      throw new AppError(
        `Cannot delete borrower. ${activeBorrowCount} book(s) are still checked out.`,
        400
      );
    }

    try {
      return await tx.borrower.delete({
        where: { id: Number(id) },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new AppError(`Borrower with ID ${id} not found`, 404);
      }
      throw error;
    }
  });
}

module.exports = {
  createBorrower,
  getAllBorrowers,
  getBorrowerById,
  updateBorrower,
  deleteBorrower,
};
