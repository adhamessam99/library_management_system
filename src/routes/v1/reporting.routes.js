/**
 * Reporting Routes v1
 * All routes are prefixed with /api/v1/reports
 */

const express = require('express');
const reportingController = require('../../controllers/reporting.controller');
const { validate } = require('../../middlewares/validate.middleware');
const { apiLimiter } = require('../../middlewares/rateLimit.middleware');

const {
  dateRangeSchema,
  statusFilterSchema,
} = require('../../validations/reporting.validation');

const router = express.Router();

/**
 * GET /api/v1/reports/summary
 * Get borrowing summary for a date range
 */
router.get(
  '/summary',
  apiLimiter,
  validate(dateRangeSchema),
  reportingController.getBorrowingSummary
);

/**
 * GET /api/v1/reports/borrowing
 * Get borrowing records by date range (paginated)
 */
router.get(
  '/borrowing',
  apiLimiter,
  validate(statusFilterSchema),
  reportingController.getBorrowingReport
);

/**
 * GET /api/v1/reports/borrowing/export/csv
 * Export borrowing records to CSV
 */
router.get(
  '/borrowing/export/csv',
  apiLimiter,
  validate(statusFilterSchema),
  reportingController.exportBorrowingsCSV
);

/**
 * GET /api/v1/reports/borrowing/export/xlsx
 * Export borrowing records to XLSX
 */
router.get(
  '/borrowing/export/xlsx',
  apiLimiter,
  validate(statusFilterSchema),
  reportingController.exportBorrowingsXLSX
);

/**
 * GET /api/v1/reports/overdue
 * Get overdue records by date range (paginated)
 */
router.get(
  '/overdue',
  apiLimiter,
  validate(dateRangeSchema),
  reportingController.getOverdueReport
);

/**
 * GET /api/v1/reports/overdue/export/csv
 * Export overdue records to CSV
 */
router.get(
  '/overdue/export/csv',
  apiLimiter,
  validate(dateRangeSchema),
  reportingController.exportOverdueCSV
);

/**
 * GET /api/v1/reports/overdue/export/xlsx
 * Export overdue records to XLSX
 */
router.get(
  '/overdue/export/xlsx',
  apiLimiter,
  validate(dateRangeSchema),
  reportingController.exportOverdueXLSX
);

module.exports = router;
