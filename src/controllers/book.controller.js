const bookService = require('../services/book.service');

async function createBook(req, res, next) {
  try {
    const { body } = req.validated;
    const book = await bookService.createBook(body);

    return res.status(201).json({
      success: true,
      message: 'Book created successfully',
      data: book,
    });
  } catch (error) {
    next(error);
  }
}

async function getAllBooks(req, res, next) {
  try {
    const { page, limit, search } = req.validated.query;

    const result = await bookService.getAllBooks(page, limit, search);

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

async function getBookById(req, res, next) {
  try {
    const { id } = req.validated.params;
    const book = await bookService.getBookById(id);

    return res.status(200).json({
      success: true,
      data: book,
    });
  } catch (error) {
    next(error);
  }
}

async function updateBook(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { body } = req.validated;

    const updated = await bookService.updateBook(id, body);

    return res.status(200).json({
      success: true,
      message: 'Book updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteBook(req, res, next) {
  try {
    const { id } = req.validated.params;
    await bookService.deleteBook(id);

    return res.status(200).json({
      success: true,
      message: 'Book deleted successfully',
      data: { id },
    });
  } catch (error) {
    next(error);
  }
}


module.exports = {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
};