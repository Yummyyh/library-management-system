const express = require('express');
const { PrismaClient } = require('@prisma/client');
const roleAuth = require('../middleware/roleAuth');
// 🔹 [P1] 修改：引入统一响应工具
const { success, error } = require('../utils/response');

const prisma = new PrismaClient();
const router = express.Router();

// 🔹 [P0] 修改：为学生列表接口添加 LIBRARIAN 鉴权
router.get('/students', roleAuth('LIBRARIAN'), async (req, res, next) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true, name: true, studentId: true, role: true }
    });
    // 🔹 [P1] 修改：使用统一 success 格式
    res.json(success(students, 'Students retrieved'));
  } catch (err) {
    next(err);
  }
});

router.post('/checkout', roleAuth('LIBRARIAN'), async (req, res, next) => {
  try {
    const { isbn, studentId, dueDate } = req.body;
    const due = new Date(dueDate);
    if (isNaN(due.getTime()) || due <= new Date()) {
      return res.status(400).json(error('Invalid due date', 400));
    }

    // 🔹 [P3] 修改：使用 Prisma 事务保证原子性，防并发超卖
    const result = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({ where: { isbn } });
      if (!book || book.isDeleted || book.stock <= 0) {
        throw new Error('Book not available');
      }

      const user = await tx.user.findUnique({ where: { studentId } });
      if (!user || user.role !== 'STUDENT' || user.status !== 'ACTIVE') {
        throw new Error('Invalid student account');
      }

      const loan = await tx.loan.create({
        data: {
          bookId: book.id,
          userId: user.id,
          checkoutDate: new Date(),
          dueDate: due,
          returnDate: null,
          fineAmount: 0,
          finePaid: false,
          fineForgiven: false,
        },
      });

      await tx.book.update({
        where: { id: book.id },
        data: { stock: { decrement: 1 } },
      });

      return { loanId: loan.id, studentName: user.name, bookTitle: book.title };
    });

    // 🔹 [P1] 修改：统一返回格式
    res.json(success(result, 'Checkout successful'));
  } catch (err) {
    next(err);
  }
});

router.post('/return', roleAuth('LIBRARIAN'), async (req, res, next) => {
  try {
    const { isbn, studentId } = req.body;
    const user = await prisma.user.findUnique({ where: { studentId } });
    const book = await prisma.book.findUnique({ where: { isbn } });

    if (!user || !book) return res.status(400).json(error('Student or Book not found', 400));

    const loan = await prisma.loan.findFirst({
      where: { bookId: book.id, userId: user.id, returnDate: null },
    });
    if (!loan) return res.status(400).json(error('No active loan found', 400));

    await prisma.$transaction(async (tx) => {
      await tx.loan.update({ where: { id: loan.id }, data: { returnDate: new Date() } });
      await tx.book.update({ where: { id: book.id }, data: { stock: { increment: 1 } } });
    });

    res.json(success({}, 'Return successful'));
  } catch (err) {
    next(err);
  }
});

module.exports = router;