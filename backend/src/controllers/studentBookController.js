const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');

const prisma = new PrismaClient();

function toAvailability(stock) {
  return stock > 0 ? 'available' : 'borrowed';
}

/**
 * Book search (title/author/ISBN).
 * - Query param: q
 * - Returns key fields + availability
 */
exports.search = async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      // Keeping this strict to satisfy "student can enter ... to search".
      return res.status(400).json(error('Search keyword (q) is required', 400));
    }

    const where = {
      isDeleted: false,
      OR: [
        { title: { contains: q } },
        { author: { contains: q } },
        { isbn: { contains: q } },
      ],
    };

    const books = await prisma.book.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, author: true, isbn: true, stock: true },
      take: 50,
    });

    const list = books.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      stock: b.stock,
      availability: toAvailability(b.stock),
    }));

    return res.json(success({ list }, 'Books retrieved'));
  } catch (e) {
    next(e);
  }
};

/**
 * Borrow a book.
 * - Requires student auth
 * - Decrements stock and creates a Loan record atomically
 */
exports.borrow = async (req, res, next) => {
  try {
    const bookId = req.params.id;
    const studentId = req.student.id;

    const result = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({
        where: { id: bookId },
        select: { id: true, title: true, isDeleted: true, stock: true },
      });

      if (!book || book.isDeleted) {
        const err = new Error('Book not found');
        err.statusCode = 404;
        throw err;
      }

      if (book.stock <= 0) {
        const err = new Error('Book is already borrowed');
        err.statusCode = 409;
        throw err;
      }

      const now = new Date();
      const due = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      await tx.book.update({
        where: { id: bookId },
        data: { stock: { decrement: 1 } },
      });

      const loan = await tx.loan.create({
        data: {
          bookId,
          userId: studentId,
          checkoutDate: now,
          dueDate: due,
          returnDate: null,
          fineAmount: 0,
          finePaid: false,
          fineForgiven: false,
        },
        select: { id: true, checkoutDate: true, dueDate: true },
      });

      return { bookTitle: book.title, loan };
    });

    return res.json(
      success(
        { bookTitle: result.bookTitle, loan: result.loan },
        'Borrow successful'
      )
    );
  } catch (e) {
    // Convert "stock already 0" into a clean API error.
    if (e.statusCode) {
      return res.status(e.statusCode).json(error(e.message, e.statusCode));
    }
    next(e);
  }
};

