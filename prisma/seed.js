const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start Seeding...');

  await prisma.borrowingRecord.deleteMany();
  await prisma.book.deleteMany();
  await prisma.borrower.deleteMany();

  // 2. Seed Books

  const booksData = [
    { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '9780743273565', totalQuantity: 5, shelfLocation: 'A1-101' },
    { title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '9780061120084', totalQuantity: 3, shelfLocation: 'B2-205' },
    { title: '1984', author: 'George Orwell', isbn: '9780451524935', totalQuantity: 4, shelfLocation: 'C3-301' },
    { title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884', totalQuantity: 3, shelfLocation: 'D4-102' }
  ];

  const createdBooks = await Promise.all(
    booksData.map(book => prisma.book.create({ 
      data: { ...book, availableQuantity: book.totalQuantity } 
    }))
  );

  // 3. Seed Borrowers
  const borrowersData = [
    { name: 'Alice Johnson', email: 'alice@example.com' },
    { name: 'Bob Smith', email: 'bob@example.com' }
  ];

  const createdBorrowers = await Promise.all(
    borrowersData.map(b => prisma.borrower.create({ data: b }))
  );

  const today = new Date();
  
  await prisma.borrowingRecord.create({
    data: {
      bookId: createdBooks[0].id,
      borrowerId: createdBorrowers[0].id,
      dueDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
    },
  });
  await prisma.book.update({
    where: { id: createdBooks[0].id },
    data: { availableQuantity: { decrement: 1 } }
  });

  await prisma.borrowingRecord.create({
    data: {
      bookId: createdBooks[2].id,
      borrowerId: createdBorrowers[1].id,
      borrowedDate: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000),
      dueDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE', // Status is ACTIVE but dueDate is in the past = Overdue
    },
  });
  await prisma.book.update({
    where: { id: createdBooks[2].id },
    data: { availableQuantity: { decrement: 1 } }
  });

  console.log('✅ Seeding successful: Inventories adjusted and records created.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });