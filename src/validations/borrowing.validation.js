const { z } = require('zod');

const numericId = z.coerce
  .number()
  .int()
  .positive('ID must be a positive integer');

// Helper for pagination to keep it DRY
const paginationQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
};

const checkoutSchema = z.object({
  body: z.object({
    bookId: numericId,
    borrowerId: numericId,
    dueDate: z.string().datetime().refine((val) => {
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Compare only the date, ignore time for more flexibility
      return date > today;
    }, 'Due date must be today or in the future'),
  }).strict(), // Prevent unexpected fields
});

const returnBookSchema = z.object({
  params: z.object({
    id: numericId,
  }),
});

const getCurrentBooksSchema = z.object({
  params: z.object({
    borrowerId: numericId,
  }),
  query: z.object(paginationQuery),
});

const getOverdueSchema = z.object({
  query: z.object(paginationQuery),
});

const borrowingRecordIdSchema = z.object({
  params: z.object({
    id: numericId,
  }),
});

module.exports = {
  checkoutSchema,
  returnBookSchema,
  getCurrentBooksSchema,
  getOverdueSchema,
  borrowingRecordIdSchema,
};