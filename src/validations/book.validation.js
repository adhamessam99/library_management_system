/**
 * Book Validation Schemas using Zod
 */
const { z } = require('zod');


/**
 * Reusable numeric string transformer
 * Handles strings from query/params and converts to safe integers
 */
const numericString = (fieldName, min = 0) => 
  z.union([z.number(), z.string()])
    .refine((val) => {
      // Ensure no spaces and is a valid integer string
      if (typeof val === 'string' && !/^\d+$/.test(val)) return false; 
      const num = typeof val === 'string' ? parseInt(val, 10) : val;
      return !isNaN(num) && num >= min;
    }, `${fieldName} must be a valid positive integer`)
    .transform((val) => parseInt(val, 10));

/**
 * Shared pagination schema for list/search endpoints
 */
const paginationBase = {
  page: numericString('Page', 1).default(1).optional(),
  limit: numericString('Limit', 1).default(10).optional(),
};

/**
 * Shared ID parameter schema
 */
const paramsId = z.object({
  id: numericString('ID', 1),
});

// --- SCHEMAS ---

/**
 * Schema for creating a new book
 */
const createBookSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Title is required').max(255),
    author: z.string().trim().min(1, 'Author is required').max(255),
    isbn: z.string().trim().min(10).max(50)
      .regex(/^[\d-]+$/, 'ISBN can only contain digits and hyphens'),
    totalQuantity: numericString('Total quantity', 0),
    shelfLocation: z.string().trim().min(1, 'Shelf location is required').max(100),
  }),
});

/**
 * Schema for updating an existing book
 */
const updateBookSchema = z.object({
  params: paramsId,
  body: z.object({
    title: z.string().trim().min(1).max(255).optional(),
    author: z.string().trim().min(1).max(255).optional(),
    isbn: z.string().trim().min(10).max(20)
      .regex(/^[\d-]+$/).optional(),
    totalQuantity: numericString('Total quantity', 0).optional(),
    shelfLocation: z.string().trim().min(1).max(100).optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  }),
});

/**
 * Schema for listing books with search and pagination
 */
const getBooksSchema = z.object({
  query: z.object({
    ...paginationBase,
    search: z.string().trim().optional(),
  }),
});

/**
 * Schema for single book operations by ID
 */
const bookIdParamSchema = z.object({
  params: paramsId,
});

module.exports = {
  createBookSchema,
  updateBookSchema,
  getBooksSchema,
  bookIdParamSchema,
};