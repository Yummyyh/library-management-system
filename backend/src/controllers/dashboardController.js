// backend/src/controllers/dashboardController.js
// Ported from DASH BOARD/backend/src/dashboardService.js + mockData.js
// Adapted to current Prisma schema (Barcode-based, Loan→Barcode→Book)
// All labels, mock data, and fallback values use English only.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const dayMs = 24 * 60 * 60 * 1000;

// ── Utility helpers ──────────────────────────────────────────
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay   = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
const dateKey    = (date) => date.toISOString().slice(0, 10);
const inRange    = (date, start, end) => date && new Date(date) >= start && new Date(date) <= end;
const groupCount = (items, keyGetter) => items.reduce((acc, item) => {
  const key = keyGetter(item) || 'Uncategorized';
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});
const toSeries   = (record) => Object.entries(record).map(([name, value]) => ({ name, value }));
const sum        = (items, getter) => items.reduce((total, item) => total + Number(getter(item) || 0), 0);

// ── Built-in Mock Data (English labels only) ─────────────────
const now = new Date();
const daysAgo = (n) => new Date(now.getTime() - n * dayMs);
const daysFromNow = (n) => new Date(now.getTime() + n * dayMs);

const mockUsers = [
  { id: 'u1', role: 'STUDENT',   status: 'ACTIVE',      createdAt: daysAgo(1)  },
  { id: 'u2', role: 'STUDENT',   status: 'ACTIVE',      createdAt: daysAgo(2)  },
  { id: 'u3', role: 'STUDENT',   status: 'DEACTIVATED', createdAt: daysAgo(20) },
  { id: 'u4', role: 'LIBRARIAN', status: 'ACTIVE',      createdAt: daysAgo(3)  },
  { id: 'u5', role: 'ADMIN',     status: 'ACTIVE',      createdAt: daysAgo(40) },
  { id: 'u6', role: 'STUDENT',   status: 'ACTIVE',      createdAt: daysAgo(0)  },
];

const mockBooks = [
  { id: 'b1', title: 'Introduction to Algorithms',              author: 'Thomas H. Cormen',   category: 'Computer Science', genre: 'Computer Science' },
  { id: 'b2', title: 'Computer Systems: A Programmer\'s Perspective', author: 'Randal E. Bryant', category: 'Computer Science', genre: 'Computer Science' },
  { id: 'b3', title: 'Sapiens: A Brief History of Humankind',   author: 'Yuval Noah Harari',  category: 'History',          genre: 'History'          },
  { id: 'b4', title: 'To Live',                                  author: 'Yu Hua',             category: 'Literature',       genre: 'Literature'       },
  { id: 'b5', title: 'Principles of Economics',                 author: 'N. Gregory Mankiw',  category: 'Economics',        genre: 'Economics'        },
  { id: 'b6', title: 'Selected Ancient Texts',                  author: 'Anonymous',          category: 'Classics',         genre: 'Classics'         },
  { id: 'b7', title: 'Gardening Basics',                        author: 'Green Lee',          category: 'Lifestyle',        genre: 'Lifestyle'        },
];

// Simulated barcode count per book (acts as stock)
const mockStockMap = { b1: 8, b2: 6, b3: 5, b4: 10, b5: 4, b6: 3, b7: 2 };

const mockLoans = [
  { id: 'l1',  bookId: 'b1', userId: 'u1', checkoutDate: daysAgo(6),  dueDate: daysFromNow(8),  returnDate: null,         fineAmount: 0,  finePaid: false, fineForgiven: false, createdAt: daysAgo(6)  },
  { id: 'l2',  bookId: 'b1', userId: 'u2', checkoutDate: daysAgo(3),  dueDate: daysFromNow(11), returnDate: null,         fineAmount: 0,  finePaid: false, fineForgiven: false, createdAt: daysAgo(3)  },
  { id: 'l3',  bookId: 'b2', userId: 'u1', checkoutDate: daysAgo(2),  dueDate: daysFromNow(12), returnDate: daysAgo(0),   fineAmount: 0,  finePaid: true,  fineForgiven: false, createdAt: daysAgo(2)  },
  { id: 'l4',  bookId: 'b3', userId: 'u3', checkoutDate: daysAgo(10), dueDate: daysAgo(1),      returnDate: null,         fineAmount: 8,  finePaid: false, fineForgiven: false, createdAt: daysAgo(10) },
  { id: 'l5',  bookId: 'b4', userId: 'u4', checkoutDate: daysAgo(1),  dueDate: daysFromNow(13), returnDate: null,         fineAmount: 0,  finePaid: false, fineForgiven: false, createdAt: daysAgo(1)  },
  { id: 'l6',  bookId: 'b4', userId: 'u5', checkoutDate: daysAgo(5),  dueDate: daysAgo(2),      returnDate: daysAgo(1),   fineAmount: 12, finePaid: true,  fineForgiven: false, createdAt: daysAgo(5)  },
  { id: 'l7',  bookId: 'b5', userId: 'u6', checkoutDate: daysAgo(0),  dueDate: daysFromNow(14), returnDate: null,         fineAmount: 0,  finePaid: false, fineForgiven: false, createdAt: daysAgo(0)  },
  { id: 'l8',  bookId: 'b2', userId: 'u6', checkoutDate: daysAgo(0),  dueDate: daysFromNow(14), returnDate: null,         fineAmount: 0,  finePaid: false, fineForgiven: false, createdAt: daysAgo(0)  },
  { id: 'l9',  bookId: 'b1', userId: 'u3', checkoutDate: daysAgo(4),  dueDate: daysFromNow(10), returnDate: daysAgo(2),   fineAmount: 0,  finePaid: true,  fineForgiven: false, createdAt: daysAgo(4)  },
  { id: 'l10', bookId: 'b3', userId: 'u2', checkoutDate: daysAgo(7),  dueDate: daysAgo(3),      returnDate: daysAgo(3),   fineAmount: 6,  finePaid: false, fineForgiven: false, createdAt: daysAgo(7)  },
];

// ── Data readers ─────────────────────────────────────────────
async function readDbData() {
  const [users, books, barcodes, loans] = await Promise.all([
    prisma.user.findMany(),
    prisma.book.findMany({ where: { isDeleted: false } }),
    prisma.barcode.findMany(),
    prisma.loan.findMany({ include: { barcode: { include: { book: true } } } }),
  ]);
  // Build stock map from barcode count per book
  const stockMap = {};
  barcodes.forEach((bc) => {
    stockMap[bc.bookId] = (stockMap[bc.bookId] || 0) + 1;
  });
  return { users, books, loans, stockMap, source: 'database' };
}

function readMockData() {
  const bookMap = new Map(mockBooks.map((b) => [b.id, b]));
  // Enrich mock loans with a virtual { barcode: { bookId, book } } for uniform access
  const enrichedLoans = mockLoans.map((loan) => ({
    ...loan,
    barcode: { bookId: loan.bookId, book: bookMap.get(loan.bookId) },
  }));
  return { users: mockUsers, books: mockBooks, loans: enrichedLoans, stockMap: { ...mockStockMap }, source: 'mock' };
}

// ── Main exported function ───────────────────────────────────
async function getDashboardStats() {
  let data;
  try {
    data = await readDbData();
  } catch (error) {
    console.warn('⚠ Dashboard DB read failed, falling back to mock data:', error.message);
    data = readMockData();
  }

  const nowDate = new Date();
  const todayStart      = startOfDay(nowDate);
  const todayEnd        = endOfDay(nowDate);
  const sevenDaysAgo    = startOfDay(new Date(nowDate.getTime() - 6 * dayMs));
  const longNoBorrowStart = new Date(nowDate.getTime() - 90 * dayMs);

  const { users, books, loans, stockMap, source } = data;

  // Extract bookId from a loan — unified for both real (barcode.bookId) and mock (bookId)
  const loanBookId = (loan) => loan.barcode?.bookId || loan.bookId;

  const activeLoans   = loans.filter((loan) => !loan.returnDate);
  const overdueLoans  = activeLoans.filter((loan) => new Date(loan.dueDate) < nowDate);
  const todayBorrowed = loans.filter((loan) => inRange(loan.checkoutDate, todayStart, todayEnd));
  const todayReturned = loans.filter((loan) => inRange(loan.returnDate, todayStart, todayEnd));
  const newUsers      = users.filter((user) => inRange(user.createdAt, sevenDaysAgo, todayEnd));

  const bookMap           = new Map(books.map((book) => [book.id, book]));
  const borrowCountByBook = groupCount(loans, (loan) => loanBookId(loan));

  // Hot books — TOP5 by borrow count
  const hotBooks = [...books]
    .map((book) => ({ id: book.id, title: book.title, author: book.author, count: borrowCountByBook[book.id] || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Cold books — 0 borrows or last borrow > 90 days ago
  const coldBooks = books
    .map((book) => {
      const relatedLoans = loans.filter((loan) => loanBookId(loan) === book.id);
      const lastBorrowAt = relatedLoans.length
        ? new Date(Math.max(...relatedLoans.map((loan) => new Date(loan.checkoutDate).getTime())))
        : null;
      return { id: book.id, title: book.title, author: book.author, count: relatedLoans.length, lastBorrowAt };
    })
    .filter((book) => book.count === 0 || !book.lastBorrowAt || book.lastBorrowAt < longNoBorrowStart)
    .sort((a, b) => a.count - b.count)
    .slice(0, 5);

  // 7-day borrow/return trend
  const trend = Array.from({ length: 7 }, (_, index) => {
    const date  = startOfDay(new Date(nowDate.getTime() - (6 - index) * dayMs));
    const start = startOfDay(date);
    const end   = endOfDay(date);
    return {
      date: dateKey(date),
      borrow: loans.filter((loan) => inRange(loan.checkoutDate, start, end)).length,
      return: loans.filter((loan) => inRange(loan.returnDate, start, end)).length,
    };
  });

  // Category share (from loan → book) — fallback key is now English "Uncategorized"
  const categoryCount = groupCount(loans, (loan) => {
    const book = bookMap.get(loanBookId(loan));
    return book?.category || book?.genre || 'Uncategorized';
  });

  // Total copies = sum of barcode counts across all books
  const totalCopies = Object.values(stockMap).reduce((a, b) => a + b, 0);

  // Fines
  const totalFine   = sum(loans, (loan) => loan.fineAmount);
  const todayFine   = sum(
    loans.filter((loan) => inRange(loan.createdAt || loan.checkoutDate, todayStart, todayEnd)),
    (loan) => loan.fineAmount,
  );
  const unpaidFine  = sum(
    loans.filter((loan) => loan.fineAmount > 0 && !loan.finePaid && !loan.fineForgiven),
    (loan) => loan.fineAmount,
  );
  const settledFine = sum(
    loans.filter((loan) => loan.fineAmount > 0 && (loan.finePaid || loan.fineForgiven)),
    (loan) => loan.fineAmount,
  );

  return {
    source,
    generatedAt: nowDate.toISOString(),
    users: {
      total: users.length,
      newIn7Days: newUsers.length,
      byRole: toSeries(groupCount(users, (user) => user.role)),
      byStatus: toSeries(groupCount(users, (user) => user.status)),
    },
    books: {
      totalTitles: books.length,
      totalCopies,
      activeBorrowed: activeLoans.length,
      overdue: overdueLoans.length,
      todayBorrowed: todayBorrowed.length,
      todayReturned: todayReturned.length,
    },
    fines: {
      total: Number(totalFine.toFixed(2)),
      todayNew: Number(todayFine.toFixed(2)),
      unpaid: Number(unpaidFine.toFixed(2)),
      settled: Number(settledFine.toFixed(2)),
    },
    rankings: {
      hotBooks,
      coldBooks,
      longNoBorrowCount: coldBooks.length,
    },
    charts: {
      sevenDayTrend: trend,
      categoryBorrowShare: toSeries(categoryCount),
    },
  };
}

module.exports = { getDashboardStats };
