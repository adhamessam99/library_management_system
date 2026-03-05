/**
 * Borrowing Integration Tests - Comprehensive Suite (Fixed Version)
 * Covers: Checkout, Return, Overdue Tracking, and Current Borrowing List
 */

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');

describe('Borrowing API Integration Tests', () => {
  // --- Setup & Teardown ---
  beforeEach(async () => {
    // Clean in order to respect Foreign Key constraints
    await prisma.borrowingRecord.deleteMany({});
    await prisma.book.deleteMany({});
    await prisma.borrower.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // --- Utility Helpers ---
  const createTestBook = async (overrides = {}) => {
    return await prisma.book.create({
      data: {
        title: 'Clean Code',
        author: 'Robert Martin',
        // Fixed length ISBN to prevent "value too long" DB errors
        isbn: `978${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        totalQuantity: 5,
        availableQuantity: 5,
        shelfLocation: 'A1-S1',
        ...overrides,
      },
    });
  };

  const createTestBorrower = async (email = null) => {
    return await prisma.borrower.create({
      data: { 
        name: 'John Doe', 
        // Unique email prevents constraint violations across tests
        email: email || `user_${Math.random().toString(36).substr(2, 9)}@test.com` 
      },
    });
  };

  // ============================================
  // POST /api/v1/borrowing/checkout
  // ============================================
  describe('POST /api/v1/borrowing/checkout', () => {
    test('✓ 201: Successfully checkout book & update stock', async () => {
      const book = await createTestBook();
      const borrower = await createTestBorrower();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const res = await request(app)
        .post('/api/v1/borrowing/checkout')
        .send({
          bookId: book.id,
          borrowerId: borrower.id,
          dueDate: dueDate.toISOString(),
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACTIVE');

      // Verify transaction: quantity must decrement
      const updatedBook = await prisma.book.findUnique({ where: { id: book.id } });
      expect(updatedBook.availableQuantity).toBe(4);
    });

    test('✗ 400: Fail when book is out of stock', async () => {
      const book = await createTestBook({ totalQuantity: 1, availableQuantity: 0 });
      const borrower = await createTestBorrower();

      const res = await request(app)
        .post('/api/v1/borrowing/checkout')
        .send({
          bookId: book.id,
          borrowerId: borrower.id,
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(400);

      expect(res.body.message).toMatch(/not available|stock/i);
    });

    test('✗ 400: Fail for past due dates', async () => {
      const book = await createTestBook();
      const borrower = await createTestBorrower();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      await request(app)
        .post('/api/v1/borrowing/checkout')
        .send({
          bookId: book.id,
          borrowerId: borrower.id,
          dueDate: pastDate.toISOString(),
        })
        .expect(400);
    });
  });

  // ============================================
  // PUT /api/v1/borrowing/return/:id
  // ============================================
  describe('PUT /api/v1/borrowing/return/:id', () => {
    test('✓ 200: Successfully return book & restore stock', async () => {
      const book = await createTestBook({ availableQuantity: 2 });
      const borrower = await createTestBorrower();
      const record = await prisma.borrowingRecord.create({
        data: { bookId: book.id, borrowerId: borrower.id, dueDate: new Date(), status: 'ACTIVE' }
      });

      const res = await request(app)
        .put(`/api/v1/borrowing/return/${record.id}`)
        .expect(200);

      expect(res.body.data.status).toBe('RETURNED');
      expect(res.body.data.returnedDate).not.toBeNull();

      // Verify transaction: quantity must increment
      const updatedBook = await prisma.book.findUnique({ where: { id: book.id } });
      expect(updatedBook.availableQuantity).toBe(3);
    });

    test('✗ 404: Fail for non-existent record', async () => {
      await request(app)
        .put('/api/v1/borrowing/return/99999')
        .expect(404);
    });
  });

  // ============================================
  // GET /api/v1/borrowing/overdue
  // ============================================
  describe('GET /api/v1/borrowing/overdue', () => {
    test('✓ 200: Retrieve only active overdue books', async () => {
      const book = await createTestBook();
      const borrower = await createTestBorrower();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      // Create one overdue
      await prisma.borrowingRecord.create({
        data: { bookId: book.id, borrowerId: borrower.id, dueDate: pastDate, status: 'ACTIVE' }
      });

      // Create one future (not overdue)
      await prisma.borrowingRecord.create({
        data: { 
          bookId: book.id, 
          borrowerId: borrower.id, 
          dueDate: new Date(Date.now() + 86400000), 
          status: 'ACTIVE' 
        }
      });

      const res = await request(app).get('/api/v1/borrowing/overdue').expect(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination.total).toBe(1);
    });
  });

  // ============================================
  // GET /api/v1/borrowing/current/:borrowerId
  // ============================================
  describe('GET /api/v1/borrowing/current/:borrowerId', () => {
    test('✓ 200: Paginate active borrowings for a specific user', async () => {
      const book = await createTestBook();
      const borrower = await createTestBorrower();

      // Seed 3 active records
      for (let i = 0; i < 3; i++) {
        await prisma.borrowingRecord.create({
          data: { bookId: book.id, borrowerId: borrower.id, dueDate: new Date(), status: 'ACTIVE' }
        });
      }

      const res = await request(app)
        .get(`/api/v1/borrowing/current/${borrower.id}?limit=2`)
        .expect(200);

      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.total).toBe(3);
    });

    test('✗ 404: Fail for invalid borrower ID', async () => {
      await request(app)
        .get('/api/v1/borrowing/current/88888')
        .expect(404);
    });
  });
});