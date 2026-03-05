/**
 * Reporting Repository
 * Database queries for generating reports on borrowing data
 */

const prisma = require('../utils/prisma');

// Shared select for borrowing records with all details
const COMPLETE_SELECT = {
  id: true,
  bookId: true,
  borrowerId: true,
  borrowedDate: true,
  dueDate: true,
  returnedDate: true,
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
  borrower: {
    select: {
      id: true,
      name: true,
      email: true,
      registeredDate: true,
    },
  },
};

/**
 * Get borrowing records within a specific date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} status - Filter by status (optional): ACTIVE, RETURNED
 * @param {number} page - Page number
 * @param {number} limit - Results per page
 * @returns {Promise<Object>} { data: [], pagination: {} }
 */
async function getBorrowingsByDateRange(startDate, endDate, status = null, page = 1, limit = 100) {
  const skip = (page - 1) * limit;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Build where clause
  const where = {
    borrowedDate: {
      gte: start,
      lte: end,
    },
  };

  if (status) {
    where.status = status;
  }

  // Run in parallel for performance
  const [records, total] = await Promise.all([
    prisma.borrowingRecord.findMany({
      where,
      take: limit,
      skip,
      orderBy: { borrowedDate: 'desc' },
      select: COMPLETE_SELECT,
    }),
    prisma.borrowingRecord.count({ where }),
  ]);

  const pages = Math.ceil(total / limit);

  return {
    data: records,
    pagination: { page, limit, total, pages, hasMore: page < pages },
    metadata: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: status || 'ALL',
    },
  };
}

/**
 * Get overdue records within a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {number} page - Page number
 * @param {number} limit - Results per page
 * @returns {Promise<Object>} { data: [], pagination: {} }
 */
async function getOverdueByDateRange(startDate, endDate, page = 1, limit = 100) {
  const skip = (page - 1) * limit;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  const now = new Date();

  // Where clause for records that were active and overdue during the period
  const where = {
    borrowedDate: {
      gte: start,
      lte: end,
    },
    status: 'ACTIVE',
    dueDate: {
      lt: now,
    },
  };

  // Run in parallel for performance
  const [records, total] = await Promise.all([
    prisma.borrowingRecord.findMany({
      where,
      take: limit,
      skip,
      orderBy: { dueDate: 'asc' },
      select: COMPLETE_SELECT,
    }),
    prisma.borrowingRecord.count({ where }),
  ]);

  const pages = Math.ceil(total / limit);

  // Calculate days overdue for each record
  const enrichedRecords = records.map((record) => ({
    ...record,
    daysOverdue: Math.floor((now - new Date(record.dueDate)) / (1000 * 60 * 60 * 24)),
  }));

  return {
    data: enrichedRecords,
    pagination: { page, limit, total, pages, hasMore: page < pages },
    metadata: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      reportType: 'OVERDUE',
    },
  };
}

/**
 * Get all borrowing records for export (no pagination for complete exports)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} status - Filter by status (optional)
 * @returns {Promise<Array>} All matching records
 */
async function getBorrowingsForExport(startDate, endDate, status = null) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const where = {
    borrowedDate: {
      gte: start,
      lte: end,
    },
  };

  if (status) {
    where.status = status;
  }

  return await prisma.borrowingRecord.findMany({
    where,
    orderBy: { borrowedDate: 'desc' },
    select: COMPLETE_SELECT,
  });
}

/**
 * Get overdue records for export (no pagination)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} All overdue records in period
 */
async function getOverdueForExport(startDate, endDate) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  const now = new Date();

  const records = await prisma.borrowingRecord.findMany({
    where: {
      borrowedDate: {
        gte: start,
        lte: end,
      },
      status: 'ACTIVE',
      dueDate: {
        lt: now,
      },
    },
    orderBy: { dueDate: 'asc' },
    select: COMPLETE_SELECT,
  });

  // Enrich with days overdue
  return records.map((record) => ({
    ...record,
    daysOverdue: Math.floor((now - new Date(record.dueDate)) / (1000 * 60 * 60 * 24)),
  }));
}

/**
 * Get summary statistics for borrowing data
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Summary statistics
 */
async function getBorrowingSummary(startDate, endDate) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  const now = new Date();

  // Run all counts in parallel for performance
  const [totalBorrowings, activeRecords, returnedRecords, overdueRecords, totalBorrowers, totalBooks] = await Promise.all([
    prisma.borrowingRecord.count({
      where: {
        borrowedDate: {
          gte: start,
          lte: end,
        },
      },
    }),
    prisma.borrowingRecord.count({
      where: {
        borrowedDate: {
          gte: start,
          lte: end,
        },
        status: 'ACTIVE',
      },
    }),
    prisma.borrowingRecord.count({
      where: {
        borrowedDate: {
          gte: start,
          lte: end,
        },
        status: 'RETURNED',
      },
    }),
    prisma.borrowingRecord.count({
      where: {
        borrowedDate: {
          gte: start,
          lte: end,
        },
        status: 'ACTIVE',
        dueDate: {
          lt: now,
        },
      },
    }),
    prisma.borrower.count(),
    prisma.book.count(),
  ]);

  return {
    period: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    borrowingStats: {
      totalBorrowings,
      activeRecords,
      returnedRecords,
      overdueRecords,
      rateOfReturn: totalBorrowings > 0 ? ((returnedRecords / totalBorrowings) * 100).toFixed(2) + '%' : '0%',
    },
    systemStats: {
      totalBorrowers,
      totalBooks,
    },
  };
}

/**
 * Get most borrowed books in period
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {number} limit - Top N books
 * @returns {Promise<Array>} Top borrowed books
 */
async function getMostBorrowedBooks(startDate, endDate, limit = 10) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return await prisma.borrowingRecord.groupBy({
    by: ['bookId'],
    where: {
      borrowedDate: {
        gte: start,
        lte: end,
      },
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: limit,
  });
}

/**
 * Get most active borrowers in period
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {number} limit - Top N borrowers
 * @returns {Promise<Array>} Top active borrowers
 */
async function getMostActiveBorrowers(startDate, endDate, limit = 10) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return await prisma.borrowingRecord.groupBy({
    by: ['borrowerId'],
    where: {
      borrowedDate: {
        gte: start,
        lte: end,
      },
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: limit,
  });
}

module.exports = {
  getBorrowingsByDateRange,
  getOverdueByDateRange,
  getBorrowingsForExport,
  getOverdueForExport,
  getBorrowingSummary,
  getMostBorrowedBooks,
  getMostActiveBorrowers,
};
