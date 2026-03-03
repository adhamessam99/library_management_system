/**
 * Book Repository - Pure Prisma Logic
 * Handles all database operations for books
 */

const prisma = require('../utils/prisma');

/**
 * Create a new book
 * @param {Object} data - Book data (title, author, isbn, totalQuantity, shelfLocation)
 * @returns {Promise<Object>} Created book object
 */
async function createBook(data) {
  return await prisma.book.create({
    data: {
      title: data.title,
      author: data.author,
      isbn: data.isbn,
      totalQuantity: data.totalQuantity,
      availableQuantity: data.totalQuantity, // Initially, all books are available
      shelfLocation: data.shelfLocation,
    },
  });
}

/**
 * Get all books with pagination and search
 * @param {number} page - Page number (default 1)
 * @param {number} limit - Items per page (default 10)
 * @param {string} search - Search query (title, author, or isbn)
 * @returns {Promise<Object>} Books list with metadata
 */
async function findAllBooks(page = 1, limit = 10, search = '') {
  const skip = (page - 1) * limit;
  const where = {};

  if (search && search.trim()) {
    const query = search.trim();
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { author: { contains: query, mode: 'insensitive' } },
      { isbn: { contains: query, mode: 'insensitive' } },
    ];
  }

  // Fetch books and total count in parallel
  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.book.count({ where }),
  ]);

  return {
    data: books,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasMore: skip + limit < total,
    },
  };
}

/**
 * Get book by ID
 * @param {number} id - Book ID
 * @returns {Promise<Object|null>} Book object or null
 */
async function findBookById(id) {
  return await prisma.book.findUnique({
    where: { id: Number(id) }, 
    include: {
      borrowingRecords: {
        where: { status: 'ACTIVE' },
        include: { borrower: true } 
      },
    },
  });
}

/**
 * Get book by ISBN
 * @param {string} isbn - Book ISBN
 * @returns {Promise<Object|null>} Book object or null
 */
async function findBookByISBN(isbn) {
  return await prisma.book.findUnique({
    where: { isbn },
  });
}

/**
 * Decrease available quantity (when book is borrowed)
 * @param {number} bookId - Book ID
 * @param {number} quantity - Quantity to decrease (default 1)
 * @returns {Promise<Object>} Updated book
 */
async function decreaseAvailableQuantity(bookId, quantity = 1) {
  return await prisma.book.update({
    where: { id: bookId },
    data: {
      availableQuantity: {
        decrement: quantity,
      },
    },
  });
}

/**
 * Increase available quantity (when book is returned)
 * @param {number} bookId - Book ID
 * @param {number} quantity - Quantity to increase (default 1)
 * @returns {Promise<Object>} Updated book
 */
async function increaseAvailableQuantity(bookId, quantity = 1) {
  return await prisma.book.update({
    where: { id: bookId },
    data: {
      availableQuantity: {
        increment: quantity,
      },
    },
  });
}

module.exports = {
  createBook,
  findAllBooks,
  findBookById,
  findBookByISBN,
  decreaseAvailableQuantity,
  increaseAvailableQuantity,  
};
