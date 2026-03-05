/**
 * Reporting Service
 * Business logic for generating reports and exporting borrowing data
 */

const reportingRepository = require('../repositories/reporting.repository');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const AppError = require('../utils/AppError');

/**
 * Helper: Parse and validate date range
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @returns {Object} { start, end }
 */
function parseDateRange(startDate, endDate) {
  let start, end;

  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  } else {
    // Default: last 30 days
    end = new Date();
    start = new Date();
    start.setDate(start.getDate() - 30);
  }

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError('Invalid date format. Use YYYY-MM-DD', 400);
  }

  if (start > end) {
    throw new AppError('Start date must be before end date', 400);
  }

  return { start, end };
}

/**
 * Get borrowing records by date range (paginated)
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {string} status - Filter by status (optional)
 * @param {number} page - Page number
 * @param {number} limit - Results per page
 * @returns {Promise<Object>} Paginated borrowing records with metadata
 */
async function getBorrowingReport(startDate, endDate, status, page, limit) {
  const { start, end } = parseDateRange(startDate, endDate);
  return await reportingRepository.getBorrowingsByDateRange(start, end, status, page, limit);
}

/**
 * Get overdue records by date range (paginated)
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {number} page - Page number
 * @param {number} limit - Results per page
 * @returns {Promise<Object>} Paginated overdue records with metadata
 */
async function getOverdueReport(startDate, endDate, page, limit) {
  const { start, end } = parseDateRange(startDate, endDate);
  return await reportingRepository.getOverdueByDateRange(start, end, page, limit);
}

/**
 * Export borrowing records to CSV
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {string} status - Filter by status (optional)
 * @returns {Promise<Object>} { filename, data, contentType }
 */
async function exportBorrowingsToCSV(startDate, endDate, status) {
  const { start, end } = parseDateRange(startDate, endDate);

  const records = await reportingRepository.getBorrowingsForExport(start, end, status);

  if (records.length === 0) {
    throw new AppError('No borrowing records found for the specified date range', 404);
  }

  // Transform records for CSV export
  const csvData = records.map((record) => ({
    'Record ID': record.id,
    'Book Title': record.book.title,
    'Book Author': record.book.author,
    'ISBN': record.book.isbn,
    'Borrower Name': record.borrower.name,
    'Borrower Email': record.borrower.email,
    'Borrowed Date': new Date(record.borrowedDate).toLocaleDateString(),
    'Due Date': new Date(record.dueDate).toLocaleDateString(),
    'Returned Date': record.returnedDate ? new Date(record.returnedDate).toLocaleDateString() : 'N/A',
    'Status': record.status,
  }));

  try {
    const parser = new Parser();
    const csv = parser.parse(csvData);

    const filename = `borrowing_report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.csv`;

    return {
      filename,
      data: csv,
      contentType: 'text/csv',
      metadata: {
        totalRecords: records.length,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    };
  } catch (error) {
    throw new AppError(`Failed to generate CSV: ${error.message}`, 500);
  }
}

/**
 * Export overdue records to CSV
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} { filename, data, contentType }
 */
async function exportOverdueToCSV(startDate, endDate) {
  const { start, end } = parseDateRange(startDate, endDate);

  const records = await reportingRepository.getOverdueForExport(start, end);

  if (records.length === 0) {
    throw new AppError('No overdue records found for the specified date range', 404);
  }

  // Transform records for CSV export
  const csvData = records.map((record) => ({
    'Record ID': record.id,
    'Book Title': record.book.title,
    'Book Author': record.book.author,
    'ISBN': record.book.isbn,
    'Borrower Name': record.borrower.name,
    'Borrower Email': record.borrower.email,
    'Borrowed Date': new Date(record.borrowedDate).toLocaleDateString(),
    'Due Date': new Date(record.dueDate).toLocaleDateString(),
    'Days Overdue': record.daysOverdue,
    'Status': record.status,
  }));

  try {
    const parser = new Parser();
    const csv = parser.parse(csvData);

    const filename = `overdue_report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.csv`;

    return {
      filename,
      data: csv,
      contentType: 'text/csv',
      metadata: {
        totalRecords: records.length,
        overdueCount: records.length,
      },
    };
  } catch (error) {
    throw new AppError(`Failed to generate CSV: ${error.message}`, 500);
  }
}

/**
 * Export borrowing records to XLSX
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {string} status - Filter by status (optional)
 * @returns {Promise<Object>} { filename, buffer, contentType }
 */
async function exportBorrowingsToXLSX(startDate, endDate, status) {
  const { start, end } = parseDateRange(startDate, endDate);

  const [records, summary, topBooks, topBorrowers] = await Promise.all([
    reportingRepository.getBorrowingsForExport(start, end, status),
    reportingRepository.getBorrowingSummary(start, end),
    reportingRepository.getMostBorrowedBooks(start, end, 10),
    reportingRepository.getMostActiveBorrowers(start, end, 10),
  ]);

  if (records.length === 0) {
    throw new AppError('No borrowing records found for the specified date range', 404);
  }

  try {
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Summary
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
    ];
    summarySheet.addRows([
      { metric: 'Report Period', value: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` },
      { metric: 'Total Borrowings', value: summary.borrowingStats.totalBorrowings },
      { metric: 'Active Records', value: summary.borrowingStats.activeRecords },
      { metric: 'Returned Records', value: summary.borrowingStats.returnedRecords },
      { metric: 'Overdue Records', value: summary.borrowingStats.overdueRecords },
      { metric: 'Return Rate', value: summary.borrowingStats.rateOfReturn },
      { metric: 'Total Borrowers', value: summary.systemStats.totalBorrowers },
      { metric: 'Total Books', value: summary.systemStats.totalBooks },
    ]);
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

    // Sheet 2: Detailed Records
    const detailSheet = workbook.addWorksheet('Borrowing Records');
    detailSheet.columns = [
      { header: 'Record ID', key: 'id', width: 12 },
      { header: 'Book Title', key: 'bookTitle', width: 25 },
      { header: 'Author', key: 'author', width: 20 },
      { header: 'ISBN', key: 'isbn', width: 15 },
      { header: 'Borrower', key: 'borrowerName', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Borrowed', key: 'borrowedDate', width: 15 },
      { header: 'Due Date', key: 'dueDate', width: 15 },
      { header: 'Returned', key: 'returnedDate', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    const detailRows = records.map((record) => ({
      id: record.id,
      bookTitle: record.book.title,
      author: record.book.author,
      isbn: record.book.isbn,
      borrowerName: record.borrower.name,
      email: record.borrower.email,
      borrowedDate: new Date(record.borrowedDate).toLocaleDateString(),
      dueDate: new Date(record.dueDate).toLocaleDateString(),
      returnedDate: record.returnedDate ? new Date(record.returnedDate).toLocaleDateString() : 'N/A',
      status: record.status,
    }));

    detailSheet.addRows(detailRows);
    detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    detailSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

    // Sheet 3: Top Books
    const booksSheet = workbook.addWorksheet('Top Books');
    booksSheet.columns = [
      { header: 'Book ID', key: 'bookId', width: 12 },
      { header: 'Times Borrowed', key: 'count', width: 15 },
    ];
    booksSheet.addRows(
      topBooks.map((book) => ({
        bookId: book.bookId,
        count: book._count.id,
      }))
    );
    booksSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    booksSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: 'FF70AD47' };

    // Sheet 4: Top Borrowers
    const borrowersSheet = workbook.addWorksheet('Top Borrowers');
    borrowersSheet.columns = [
      { header: 'Borrower ID', key: 'borrowerId', width: 15 },
      { header: 'Times Borrowed', key: 'count', width: 15 },
    ];
    borrowersSheet.addRows(
      topBorrowers.map((borrower) => ({
        borrowerId: borrower.borrowerId,
        count: borrower._count.id,
      }))
    );
    borrowersSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    borrowersSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: 'FFD97706' };

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `borrowing_report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.xlsx`;

    return {
      filename,
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      metadata: {
        totalRecords: records.length,
        summaryIncluded: true,
        topBooksIncluded: true,
        topBorrowersIncluded: true,
      },
    };
  } catch (error) {
    throw new AppError(`Failed to generate XLSX: ${error.message}`, 500);
  }
}

/**
 * Export overdue records to XLSX
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} { filename, buffer, contentType }
 */
async function exportOverdueToXLSX(startDate, endDate) {
  const { start, end } = parseDateRange(startDate, endDate);

  const records = await reportingRepository.getOverdueForExport(start, end);

  if (records.length === 0) {
    throw new AppError('No overdue records found for the specified date range', 404);
  }

  try {
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Overdue Records
    const sheet = workbook.addWorksheet('Overdue Records');
    sheet.columns = [
      { header: 'Record ID', key: 'id', width: 12 },
      { header: 'Book Title', key: 'bookTitle', width: 25 },
      { header: 'Author', key: 'author', width: 20 },
      { header: 'ISBN', key: 'isbn', width: 15 },
      { header: 'Borrower', key: 'borrowerName', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Borrowed', key: 'borrowedDate', width: 15 },
      { header: 'Due Date', key: 'dueDate', width: 15 },
      { header: 'Days Overdue', key: 'daysOverdue', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    const rows = records.map((record) => ({
      id: record.id,
      bookTitle: record.book.title,
      author: record.book.author,
      isbn: record.book.isbn,
      borrowerName: record.borrower.name,
      email: record.borrower.email,
      borrowedDate: new Date(record.borrowedDate).toLocaleDateString(),
      dueDate: new Date(record.dueDate).toLocaleDateString(),
      daysOverdue: record.daysOverdue,
      status: record.status,
    }));

    sheet.addRows(rows);
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: 'FFDC2626' };

    // Highlight cells with high days overdue
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const daysOverdue = row.values[9];
        if (daysOverdue > 30) {
          row.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: 'FFEF4444' };
        }
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `overdue_report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.xlsx`;

    return {
      filename,
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      metadata: {
        totalRecords: records.length,
      },
    };
  } catch (error) {
    throw new AppError(`Failed to generate XLSX: ${error.message}`, 500);
  }
}

/**
 * Get borrowing summary for date range
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} Summary statistics
 */
async function getBorrowingSummary(startDate, endDate) {
  const { start, end } = parseDateRange(startDate, endDate);
  return await reportingRepository.getBorrowingSummary(start, end);
}

module.exports = {
  getBorrowingReport,
  getOverdueReport,
  exportBorrowingsToCSV,
  exportOverdueToCSV,
  exportBorrowingsToXLSX,
  exportOverdueToXLSX,
  getBorrowingSummary,
};
