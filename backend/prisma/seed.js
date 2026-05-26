// backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { ensureConfigDefaults } = require('../src/utils/configDefaults');
const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;

/** 创建在借记录，并标记条形码为 BORROWED */
async function seedActiveLoan({ barcodeStr, userId, checkoutDate, dueDate }) {
  const bc = await prisma.barcode.findUnique({ where: { barcode: barcodeStr } });
  if (!bc || !userId) return false;

  await prisma.loan.deleteMany({ where: { barcodeId: bc.id } });
  await prisma.barcode.update({ where: { id: bc.id }, data: { status: 'BORROWED' } });
  await prisma.loan.create({
    data: {
      barcodeId: bc.id,
      userId,
      checkoutDate,
      dueDate,
      returnDate: null,
      fineAmount: 0,
      finePaid: false,
      fineForgiven: false,
    },
  });
  return true;
}

/** 创建已还记录，条形码恢复 AVAILABLE */
async function seedReturnedLoan({ barcodeStr, userId, checkoutDate, dueDate, returnDate }) {
  const bc = await prisma.barcode.findUnique({ where: { barcode: barcodeStr } });
  if (!bc || !userId) return false;

  await prisma.loan.deleteMany({ where: { barcodeId: bc.id } });
  await prisma.barcode.update({ where: { id: bc.id }, data: { status: 'AVAILABLE' } });
  await prisma.loan.create({
    data: {
      barcodeId: bc.id,
      userId,
      checkoutDate,
      dueDate,
      returnDate,
      fineAmount: 0,
      finePaid: true,
      fineForgiven: false,
    },
  });
  return true;
}

function daysFromNow(days) {
  return new Date(Date.now() + days * DAY_MS);
}

async function main() {
  // ================= 1. 创建用户 (保持不变) =================
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const librarianPasswordHash = await bcrypt.hash('lib123', 10);
  const student1PasswordHash = await bcrypt.hash('stud123', 10);
  const student2PasswordHash = await bcrypt.hash('stud456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@library.com' },
    update: {},
    create: {
      name: 'Admin User', email: 'admin@library.com', passwordHash: adminPasswordHash,
      studentId: 'ADMIN001', role: 'ADMIN', status: 'ACTIVE',
    },
  });
  const librarian = await prisma.user.upsert({
    where: { email: 'librarian@library.com' },
    update: {},
    create: {
      name: 'Librarian User', email: 'librarian@library.com', passwordHash: librarianPasswordHash,
      studentId: 'LIB001', role: 'LIBRARIAN', status: 'ACTIVE',
    },
  });
  const student1 = await prisma.user.upsert({
    where: { email: 'student1@university.edu' },
    update: {},
    create: {
      name: 'Alice Zhang', email: 'student1@university.edu', passwordHash: student1PasswordHash,
      studentId: 'STU2023001', role: 'STUDENT', status: 'ACTIVE',
    },
  });
  const student2 = await prisma.user.upsert({
    where: { email: 'student2@university.edu' },
    update: {},
    create: {
      name: 'Bob Li', email: 'student2@university.edu', passwordHash: student2PasswordHash,
      studentId: 'STU2023002', role: 'STUDENT', status: 'ACTIVE',
    },
  });

  // Clear loans first so barcode deleteMany in the book loop never violates FK constraints.
  await prisma.loan.deleteMany({});

  // ================= 2. 创建图书与条形码（方案3核心逻辑） =================
  const bookSeeds = [
    { title: "Clean Code: A Handbook of Agile Software Craftsmanship", author: "Robert C. Martin", isbn: "9780132350884", genre: "Technology", description: "Classic guide to writing clean, maintainable code.", language: "English", shelfLocation: "Tech-A1", category: "Software Engineering", publisher: "Prentice Hall", publishedAt: new Date("2008-08-01") },
    { title: "The Pragmatic Programmer", author: "Andrew Hunt & David Thomas", isbn: "9780201616224", genre: "Technology", description: "Tips for software developers to improve daily work.", language: "English", shelfLocation: "Tech-A2", category: "Software Engineering", publisher: "Addison-Wesley", publishedAt: new Date("1999-10-20") },
    { title: "To Kill a Mockingbird", author: "Harper Lee", isbn: "9780061120084", genre: "Fiction", description: "Pulitzer Prize-winning novel of racial injustice.", language: "English", shelfLocation: "Fic-B1", category: "Classic", publisher: "Harper Perennial", publishedAt: new Date("2006-05-23") },
    { title: "A Brief History of Time", author: "Stephen Hawking", isbn: "9780553380163", genre: "Science", description: "Cosmology for the masses, by a renowned physicist.", language: "English", shelfLocation: "Sci-C1", category: "Physics", publisher: "Bantam", publishedAt: new Date("1998-09-01") },
    { title: "Sapiens: A Brief History of Humankind", author: "Yuval Noah Harari", isbn: "9780062316097", genre: "History", description: "The ascent of Homo sapiens.", language: "English", shelfLocation: "His-D2", category: "Anthropology", publisher: "Harper", publishedAt: new Date("2015-02-10") },
    { title: "The Lean Startup", author: "Eric Ries", isbn: "9780307887894", genre: "Management", description: "How today's entrepreneurs use continuous innovation.", language: "English", shelfLocation: "Man-E1", category: "Business", publisher: "Crown Business", publishedAt: new Date("2011-09-13") },
  ];

  for (const bookData of bookSeeds) {
    // ✅ 修复：统一入库 ISBN 格式（移除连字符），与 barcode 前缀保持一致
    const isbnClean = bookData.isbn.replace(/-/g, '');
    
    // ✅ 修复：upsert 的 where 也用 isbnClean，避免格式不一致导致重复创建
    const book = await prisma.book.upsert({
      where: { isbn: isbnClean }, // ✅ 关键修复：用纯数字查询
      update: {
        title: bookData.title, author: bookData.author, genre: bookData.genre,
        description: bookData.description, language: bookData.language,
        shelfLocation: bookData.shelfLocation, category: bookData.category,
        publisher: bookData.publisher, publishedAt: bookData.publishedAt,
        isDeleted: false,
      },
      create: { 
        ...bookData, 
        isbn: isbnClean,  // ✅ 存纯数字
        isDeleted: false 
      },
    });

    const copyCount = bookData.isbn === "9780132350884" ? 3 : 1;
    const barcodesToCreate = [];
    for (let i = 1; i <= copyCount; i++) {
      // ✅ 条形码前缀也用 isbnClean，保持与书目层一致
      const barcodeStr = `${isbnClean}-${String(i).padStart(3, '0')}`;
      barcodesToCreate.push({ barcode: barcodeStr, bookId: book.id, status: 'AVAILABLE' });
    }

    if (barcodesToCreate.length > 0) {
      // ✅ 修复：SQLite 不支持 skipDuplicates，改用「先删后建」策略
      // 先删除该书名下所有旧 barcode（seed 场景可接受）
      await prisma.barcode.deleteMany({ where: { bookId: book.id } });
      // 再批量创建新 barcode
      await prisma.barcode.createMany({ data: barcodesToCreate });
      console.log(`✅ Created book "${book.title}" with ${copyCount} barcode(s)`);
    }
  }

  // ================= 3. 系统配置（与 Admin Settings 键一致） =================
  await ensureConfigDefaults(prisma);

  // ================= 4. 演示借阅（仅 STU2023001） =================

  if (student1) {
    // Alice：在借，未逾期（应还约 20 天后）
    await seedActiveLoan({
      barcodeStr: '9780132350884-001',
      userId: student1.id,
      checkoutDate: daysFromNow(-10),
      dueDate: daysFromNow(20),
    });
    // Alice：在借，即将到期（约 4 天后到期）
    await seedActiveLoan({
      barcodeStr: '9780061120084-001',
      userId: student1.id,
      checkoutDate: daysFromNow(-26),
      dueDate: daysFromNow(4),
    });
    // Alice：已还历史（不影响当前在借上限）
    await seedReturnedLoan({
      barcodeStr: '9780201616224-001',
      userId: student1.id,
      checkoutDate: daysFromNow(-40),
      dueDate: daysFromNow(-12),
      returnDate: daysFromNow(-11),
    });
    // 逾期样例（The Lean Startup），供读者/馆员逾期演示
    await seedActiveLoan({
      barcodeStr: '9780307887894-001',
      userId: student1.id,
      checkoutDate: daysFromNow(-25),
      dueDate: daysFromNow(-5),
    });
    console.log(`✅ Seeded demo loans for ${student1.studentId}: 2 on-time/due soon, 1 overdue, 1 returned`);
  }

  console.log('🌱 Seeding completed successfully!');
  console.log('📊 Summary:');
  console.log('   - Users: 4 (1 admin, 1 librarian, 2 students)');
  console.log('   - Books: 6 titles (ISBN layer)');
  console.log('   - Barcodes: 8 entities (1 title × 3 + 5 titles × 1)');
  console.log('   - Config: defaults via ensureConfigDefaults');
  console.log('   - STU2023001: 3 active (2 normal + 1 overdue) + 1 returned');
  console.log('   - STU2023002: no demo loans');
}

main()
  .catch((e) => { 
    console.error('❌ Seeding failed:', e); 
    process.exit(1); 
  })
  .finally(async () => { 
    await prisma.$disconnect(); 
  });
