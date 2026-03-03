/**
 * Book Service - Business Logic Layer
 * Handles validation, business rules, and database orchestration
 */
const bookRepository = require('../repositories/book.repository');
const AppError = require('../utils/AppError');
const prisma = require('../utils/prisma'); 
/**
 * Create a new book
 * @param {Object} bookData - Validated book data
 */
async function createBook(bookData) {
  const existingBook = await bookRepository.findBookByISBN(bookData.isbn);
  if (existingBook) {
    throw new AppError(`Book with ISBN ${bookData.isbn} already exists`, 409);
  }

  return await bookRepository.createBook(bookData);
}

/**
 * Get all books
 */
async function getAllBooks(page, limit, search) {
  return await bookRepository.findAllBooks(page, limit, search);
}

/**
 * Get book by ID
 */
async function getBookById(id) {
  const book = await bookRepository.findBookById(id);

  if (!book) {
    throw new AppError(`Book with ID ${id} not found`, 404);
  }

  return book;
}

/**
 * Update book details with Inventory Synchronization
 */
async function updateBook(id, updateData) {
  // Use prisma transaction to ensure all checks and updates happen as one atomic unit
  return await prisma.$transaction(async (tx) => {
    
    //  Fetch current state inside the transaction (Locking the logic)
    const existingBook = await tx.book.findUnique({ 
      where: { id: Number(id) } 
    });

    if (!existingBook) {
      throw new AppError(`Book with ID ${id} not found`, 404);
    }

    //  ISBN Unique Check (only if ISBN is being changed)
    if (updateData.isbn && updateData.isbn !== existingBook.isbn) {
      const isUnique = await tx.book.findUnique({ 
        where: { isbn: updateData.isbn } 
      });
      if (isUnique) {
        throw new AppError(`Book with ISBN ${updateData.isbn} already exists`, 409);
      }
    }

    const finalUpdatePayload = { ...updateData };

    //  Atomic Inventory Sync
    if (updateData.totalQuantity !== undefined) {
      // Calculate how many books are currently "out in the world"
      const borrowedCount = existingBook.totalQuantity - existingBook.availableQuantity;

      // Validation: Ensure the librarian isn't trying to set a total lower than what's borrowed
      if (updateData.totalQuantity < borrowedCount) {
        throw new AppError(
          `Cannot reduce total to ${updateData.totalQuantity}. ${borrowedCount} copies are currently borrowed.`,
          400
        );
      }

      // Sync availableQuantity: (New Total) - (Existing Borrowed)
      finalUpdatePayload.availableQuantity = updateData.totalQuantity - borrowedCount;
    }

    //  Perform the update using the transaction client
    return await tx.book.update({
      where: { id: Number(id) },
      data: finalUpdatePayload,
    });
  });
}

/**
 * Delete a book
 * Ensures no active borrowings exist before deletion
 */
async function deleteBook(id) {
  return await prisma.$transaction(async (tx) => {
    //  Fetch within transaction to "lock" the record's state
    const book = await tx.book.findUnique({ 
      where: { id: Number(id) } 
    });

    if (!book) {
      throw new AppError(`Book with ID ${id} not found`, 404);
    }

    if (book.availableQuantity !== book.totalQuantity) {
      const borrowedCount = book.totalQuantity - book.availableQuantity;
      throw new AppError(
        `Cannot delete book. ${borrowedCount} copies are still borrowed.`,
        400
      );
    }

    //  Atomic delete
    return await tx.book.delete({ 
      where: { id: Number(id) } 
    });
  });
}

module.exports = {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
};