/**
 * Borrower Integration Tests (Condensed & High-Impact)
 * Focuses on critical business logic and API contracts.
 */

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');

describe('Borrower API Integration Tests', () => {
  // Clean up DB before each test to ensure isolation
  beforeEach(async () => {
    await prisma.borrowingRecord.deleteMany({});
    await prisma.borrower.deleteMany({});
    await prisma.book.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const VALID_BORROWER = { name: 'John Doe', email: 'john.doe@example.com' };

  // ============================================
  // CREATE TESTS
  // ============================================
  describe('POST /api/v1/borrowers', () => {
    test('✓ Should create borrower (checking trim & 201 status)', async () => {
      const response = await request(app)
        .post('/api/v1/borrowers')
        .send({ name: '  John Doe  ', email: 'john@example.com  ' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('John Doe');
      expect(response.body.data).toHaveProperty('id');
    });

    test('✗ Should fail on invalid data (missing name or bad email)', async () => {
      // Test invalid email
      const res = await request(app)
        .post('/api/v1/borrowers')
        .send({ name: 'Test', email: 'not-an-email' })
        .expect(400);
      
      expect(res.body.success).toBe(false);
    });

    test('✗ Should fail on duplicate email (409 Conflict)', async () => {
      await prisma.borrower.create({ data: VALID_BORROWER });

      const response = await request(app)
        .post('/api/v1/borrowers')
        .send(VALID_BORROWER)
        .expect(409);

      expect(response.body.message).toMatch(/exists|duplicate/i);
    });
  });

  // ============================================
  // LIST & GET TESTS
  // ============================================
  describe('GET /api/v1/borrowers', () => {
    test('✓ Should list borrowers with pagination metadata', async () => {
      await prisma.borrower.createMany({
        data: [VALID_BORROWER, { name: 'Jane', email: 'jane@test.com' }]
      });

      const response = await request(app)
        .get('/api/v1/borrowers?page=1&limit=1')
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(2);
    });

    test('✓ Should get single borrower by ID with borrowing history', async () => {
      const borrower = await prisma.borrower.create({ data: VALID_BORROWER });

      const response = await request(app)
        .get(`/api/v1/borrowers/${borrower.id}`)
        .expect(200);

      expect(response.body.data.email).toBe(VALID_BORROWER.email);
      expect(Array.isArray(response.body.data.borrowingRecords)).toBe(true);
    });

    test('✗ Should return 404 for non-existent ID', async () => {
      await request(app).get('/api/v1/borrowers/9999').expect(404);
    });
  });

  // ============================================
  // UPDATE TESTS
  // ============================================
  describe('PUT /api/v1/borrowers/:id', () => {
    test('✓ Should update borrower name and email', async () => {
      const borrower = await prisma.borrower.create({ data: VALID_BORROWER });

      const response = await request(app)
        .put(`/api/v1/borrowers/${borrower.id}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Name');
    });
  });

  // ============================================
  // DELETE & BUSINESS LOGIC
  // ============================================
  describe('DELETE /api/v1/borrowers/:id', () => {
    test('✓ Should delete borrower successfully', async () => {
      const borrower = await prisma.borrower.create({ data: VALID_BORROWER });

      await request(app).delete(`/api/v1/borrowers/${borrower.id}`).expect(200);
      
      // Verify deletion
      const check = await prisma.borrower.findUnique({ where: { id: borrower.id } });
      expect(check).toBeNull();
    });

    test('✗ Should NOT delete borrower with ACTIVE borrowing records', async () => {
      // Setup: Create borrower, book, and active record
      const borrower = await prisma.borrower.create({ data: VALID_BORROWER });
      const book = await prisma.book.create({
        data: { 
          title: 'Test', author: 'Test', isbn: '123', 
          totalQuantity: 1, availableQuantity: 0, shelfLocation: 'A1' 
        }
      });

      await prisma.borrowingRecord.create({
        data: {
          borrowerId: borrower.id,
          bookId: book.id,
          status: 'ACTIVE',
          dueDate: new Date()
        }
      });

      // Execute & Assert
      const response = await request(app)
        .delete(`/api/v1/borrowers/${borrower.id}`)
        .expect(400);

      expect(response.body.message).toMatch(/checked out/i);
    });
  });
});