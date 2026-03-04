/**
 * Borrower Validation Schemas
 * Zod schemas for input validation
 */


const { z } = require('zod');

const idSchema = z
  .string()
  .transform((val) => parseInt(val, 10))
  .refine((val) => !isNaN(val) && val > 0, {
    message: 'ID must be a positive number',
  });

const emailSchema = z.string().trim().email().max(255);
const nameSchema = z.string().trim().min(1).max(255);

const borrowerIdParamSchema = z.object({
  params: z.object({ id: idSchema }),
});

const createBorrowerSchema = z.object({
  body: z.object({
    name: nameSchema,
    email: emailSchema,
  }),
});

const updateBorrowerSchema = z.object({
  params: z.object({ id: idSchema }),
  body: z
    .object({
      name: nameSchema.optional(),
      email: emailSchema.optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

const getAllBorrowersSchema = z.object({
  query: z.object({
    page: z.string().optional().transform(v => Math.max(1, parseInt(v, 10) || 1)),
    limit: z.string().optional().transform(v => Math.min(100, parseInt(v, 10) || 10)),
  }),
});

module.exports = {
  borrowerIdParamSchema,
  createBorrowerSchema,
  updateBorrowerSchema,
  getAllBorrowersSchema,
};