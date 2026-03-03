const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');

describe('Book API Integration Tests', () => {
  
  // 1. DATABASE CLEANUP
  beforeEach(async () => {
    // Order matters due to Foreign Key constraints
    await prisma.borrowingRecord.deleteMany({});
    await prisma.book.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const VALID_BOOK = {
    title: "Clean Code",
    author: "Robert C. Martin",
    isbn: "978-0132350884",
    totalQuantity: 10,
    shelfLocation: "Tech-Section-A1"
  };

  // ============================================
  // POST /api/v1/books (Create)
  // ============================================
  describe('POST /api/v1/books', () => {
    it('should create a book and set availableQuantity equal to totalQuantity', async () => {
      const res = await request(app).post('/api/v1/books').send(VALID_BOOK);
      expect(res.statusCode).toBe(201);
      expect(res.body.data.availableQuantity).toBe(VALID_BOOK.totalQuantity);
    });

    it('should return 409 if ISBN already exists', async () => {
      await prisma.book.create({ data: { ...VALID_BOOK, availableQuantity: 10 } });
      const res = await request(app).post('/api/v1/books').send(VALID_BOOK);
      expect(res.statusCode).toBe(409);
    });

    it('should return 400 for invalid ISBN format', async () => {
      const res = await request(app).post('/api/v1/books').send({ ...VALID_BOOK, isbn: "!!!" });
      expect(res.statusCode).toBe(400);
    });
  });

  // ============================================
  // GET /api/v1/books (List & Search)
  // ============================================
  describe('GET /api/v1/books', () => {
    beforeEach(async () => {
      await prisma.book.create({ data: { ...VALID_BOOK, availableQuantity: 10 } });
      await prisma.book.create({ 
        data: { 
          title: "Refactoring", author: "Martin Fowler", isbn: "978-0201485677", 
          shelfLocation: "Tech-B2", totalQuantity: 5, availableQuantity: 5 
        } 
      });
    });

    it('should fetch all books with pagination metadata', async () => {
      const res = await request(app).get('/api/v1/books?page=1&limit=10');
      expect(res.statusCode).toBe(200);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter results using search query', async () => {
      const res = await request(app)
        .get('/api/v1/books/search')
        .query({ search: 'Refactoring' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data[0].title).toBe('Refactoring');
    });
  });

  // ============================================
  // PUT /api/v1/books/:id (Update & Transaction Logic)
  // ============================================
  describe('PUT /api/v1/books/:id', () => {
    it('should update book and sync availableQuantity when totalQuantity changes', async () => {
      const book = await prisma.book.create({ 
        data: { ...VALID_BOOK, totalQuantity: 10, availableQuantity: 8 } // 2 are borrowed
      });

      const res = await request(app)
        .put(`/api/v1/books/${book.id}`)
        .send({ totalQuantity: 15 });

      expect(res.statusCode).toBe(200);
      // Logic: 15 (new total) - 2 (borrowed) = 13 (new available)
      expect(res.body.data.availableQuantity).toBe(13);
    });

    it('should return 409 if updating to an ISBN already held by another book', async () => {
      await prisma.book.create({ data: { ...VALID_BOOK, isbn: "111-1111111", availableQuantity: 1 } });
      const book2 = await prisma.book.create({ 
        data: { ...VALID_BOOK, isbn: "222-2222222", availableQuantity: 1 } 
      });

      const res = await request(app)
        .put(`/api/v1/books/${book2.id}`)
        .send({ isbn: "111-1111111" });

      expect(res.statusCode).toBe(409);
    });

    it('should return 400 if reducing totalQuantity below active borrowed count', async () => {
      const book = await prisma.book.create({ 
        data: { ...VALID_BOOK, totalQuantity: 5, availableQuantity: 1 } // 4 borrowed
      });

      const res = await request(app)
        .put(`/api/v1/books/${book.id}`)
        .send({ totalQuantity: 3 }); // Setting total to 3 while 4 are out

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('currently borrowed');
    });
  });

  // ============================================
  // DELETE /api/v1/books/:id
  // ============================================
  describe('DELETE /api/v1/books/:id', () => {
    it('should delete a book when no copies are borrowed', async () => {
      const book = await prisma.book.create({ data: { ...VALID_BOOK, availableQuantity: 10 } });
      const res = await request(app).delete(`/api/v1/books/${book.id}`);
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 when trying to delete a book with active borrowings', async () => {
      const book = await prisma.book.create({ 
        data: { ...VALID_BOOK, totalQuantity: 5, availableQuantity: 4 } // 1 borrowed
      });
      const res = await request(app).delete(`/api/v1/books/${book.id}`);
      expect(res.statusCode).toBe(400);
    });
  });

  // ============================================
  // Error Handling & Transactions
  // ============================================
  describe('Global Error Handler & Transaction Safety', () => {
    it('should return 500 when the transaction fails unexpectedly', async () => {
      // Mocking $transaction to simulate a DB level failure
      const spy = jest.spyOn(prisma, '$transaction').mockRejectedValue(new Error('Transaction Failed'));

      const res = await request(app).put('/api/v1/books/1').send({ title: "Fail Test" });
      
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Transaction Failed');
      
      spy.mockRestore();
    });

    it('should return 404 for numeric ID that does not exist (Transaction Fetch)', async () => {
      const res = await request(app).put('/api/v1/books/999999').send({ title: "None" });
      expect(res.statusCode).toBe(404);
    });
  });
});