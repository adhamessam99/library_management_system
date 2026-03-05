/**
 * Reporting Validation Schemas
 * Zod schemas for report generation and export
 */

const { z } = require('zod');

// ============================================
// DATE RANGE SCHEMA
// ============================================
const dateRangeSchema = z.object({
  query: z.object({
    startDate: z
      .string()
      .refine((val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, 'Start date must be a valid date (YYYY-MM-DD)')
      .optional(),
    endDate: z
      .string()
      .refine((val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, 'End date must be a valid date (YYYY-MM-DD)')
      .optional(),
    page: z.string().optional().transform(v => Math.max(1, parseInt(v, 10) || 1)),
    limit: z.string().optional().transform(v => Math.min(100, parseInt(v, 10) || 10)),
  }).refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return new Date(data.startDate) <= new Date(data.endDate);
    },
    { message: 'Start date must be before or equal to end date' }
  ),
});

// ============================================
// EXPORT FORMAT SCHEMA
// ============================================
const exportFormatSchema = z.object({
  query: z.object({
    format: z
      .enum(['csv', 'xlsx'])
      .default('csv')
      .describe('Export format: csv or xlsx'),
    startDate: z
      .string()
      .refine((val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, 'Start date must be a valid date (YYYY-MM-DD)')
      .optional(),
    endDate: z
      .string()
      .refine((val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, 'End date must be a valid date (YYYY-MM-DD)')
      .optional(),
  }).refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return new Date(data.startDate) <= new Date(data.endDate);
    },
    { message: 'Start date must be before or equal to end date' }
  ),
});

// ============================================
// LAST N DAYS SCHEMA
// ============================================
const lastNDaysSchema = z.object({
  query: z.object({
    days: z
      .string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val) && val > 0, 'Days must be a positive number')
      .default('30'),
    page: z.string().optional().transform(v => Math.max(1, parseInt(v, 10) || 1)),
    limit: z.string().optional().transform(v => Math.min(100, parseInt(v, 10) || 10)),
  }),
});

// ============================================
// STATUS FILTER SCHEMA
// ============================================
const statusFilterSchema = z.object({
  query: z.object({
    status: z
      .enum(['ACTIVE', 'RETURNED'])
      .optional()
      .describe('Filter by borrowing status'),
    startDate: z
      .string()
      .optional(),
    endDate: z
      .string()
      .optional(),
    page: z.string().optional().transform(v => Math.max(1, parseInt(v, 10) || 1)),
    limit: z.string().optional().transform(v => Math.min(100, parseInt(v, 10) || 10)),
  }),
});

module.exports = {
  dateRangeSchema,
  exportFormatSchema,
  lastNDaysSchema,
  statusFilterSchema,
};
