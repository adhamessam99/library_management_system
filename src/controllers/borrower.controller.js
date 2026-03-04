/**
 * Borrower Controller
 * HTTP request/response handling for borrower endpoints
 */

const borrowerService = require('../services/borrower.service');

/**
 * POST /api/v1/borrowers
 * Create a new borrower
 */
async function createBorrower(req, res, next) {
  try {
    const { body } = req.validated;
    const borrower = await borrowerService.createBorrower(body);

    return res.status(201).json({
      success: true,
      message: 'Borrower created successfully',
      data: borrower,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/borrowers
 * Get all borrowers with pagination
 */
async function getAllBorrowers(req, res, next) {
  try {
    const { page, limit } = req.validated.query;

    const result = await borrowerService.getAllBorrowers(page, limit);

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
 * GET /api/v1/borrowers/:id
 * Get borrower by ID
 */
async function getBorrowerById(req, res, next) {
  try {
    const { id } = req.validated.params;
    const borrower = await borrowerService.getBorrowerById(id);

    return res.status(200).json({
      success: true,
      data: borrower,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/borrowers/:id
 * Update borrower details (partial update)
 */
async function updateBorrower(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { body } = req.validated;
    const borrower = await borrowerService.updateBorrower(id, body);

    return res.status(200).json({
      success: true,
      message: 'Borrower updated successfully',
      data: borrower,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/borrowers/:id
 * Delete a borrower
 */
async function deleteBorrower(req, res, next) {
  try {
    const { id } = req.validated.params;
    await borrowerService.deleteBorrower(id);

    return res.status(200).json({
      success: true,
      message: 'Borrower deleted successfully',
      data: { id },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createBorrower,
  getAllBorrowers,
  getBorrowerById,
  updateBorrower,
  deleteBorrower,
};
