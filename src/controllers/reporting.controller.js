/**
 * Reporting Controller
 * HTTP request/response handling for reporting and export endpoints
 */

const reportingService = require('../services/reporting.service');

/**
 * GET /api/v1/reports/borrowing
 * Get borrowing records by date range (paginated)
 */
async function getBorrowingReport(req, res, next) {
  try {
    const { startDate, endDate, status, page, limit } = req.validated.query;

    const result = await reportingService.getBorrowingReport(startDate, endDate, status, page, limit);

    return res.status(200).json({
      success: true,
      message: 'Borrowing report retrieved successfully',
      data: result.data,
      pagination: result.pagination,
      metadata: result.metadata,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/reports/overdue
 * Get overdue records by date range (paginated)
 */
async function getOverdueReport(req, res, next) {
  try {
    const { startDate, endDate, page, limit } = req.validated.query;

    const result = await reportingService.getOverdueReport(startDate, endDate, page, limit);

    return res.status(200).json({
      success: true,
      message: 'Overdue report retrieved successfully',
      data: result.data,
      pagination: result.pagination,
      metadata: result.metadata,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/reports/summary
 * Get borrowing summary for a date range
 */
async function getBorrowingSummary(req, res, next) {
  try {
    const { startDate, endDate } = req.validated.query;

    const result = await reportingService.getBorrowingSummary(startDate, endDate);

    return res.status(200).json({
      success: true,
      message: 'Borrowing summary retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/reports/borrowing/export/csv
 * Export borrowing records to CSV
 */
async function exportBorrowingsCSV(req, res, next) {
  try {
    const { startDate, endDate, status } = req.validated.query;

    const result = await reportingService.exportBorrowingsToCSV(startDate, endDate, status);

    // Set response headers for file download
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    return res.status(200).send(result.data);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/reports/overdue/export/csv
 * Export overdue records to CSV
 */
async function exportOverdueCSV(req, res, next) {
  try {
    const { startDate, endDate } = req.validated.query;

    const result = await reportingService.exportOverdueToCSV(startDate, endDate);

    // Set response headers for file download
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    return res.status(200).send(result.data);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/reports/borrowing/export/xlsx
 * Export borrowing records to XLSX
 */
async function exportBorrowingsXLSX(req, res, next) {
  try {
    const { startDate, endDate, status } = req.validated.query;

    const result = await reportingService.exportBorrowingsToXLSX(startDate, endDate, status);

    // Set response headers for file download
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    return res.status(200).send(result.buffer);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/reports/overdue/export/xlsx
 * Export overdue records to XLSX
 */
async function exportOverdueXLSX(req, res, next) {
  try {
    const { startDate, endDate } = req.validated.query;

    const result = await reportingService.exportOverdueToXLSX(startDate, endDate);

    // Set response headers for file download
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    return res.status(200).send(result.buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBorrowingReport,
  getOverdueReport,
  getBorrowingSummary,
  exportBorrowingsCSV,
  exportOverdueCSV,
  exportBorrowingsXLSX,
  exportOverdueXLSX,
};
