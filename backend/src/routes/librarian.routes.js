const express = require('express');
const { PrismaClient } = require('@prisma/client');
const roleAuth = require('../middleware/roleAuth');
const { success, error } = require('../utils/response');
const prisma = new PrismaClient();
const router = express.Router();

// 🔹 获取学生列表（供借书时下拉选择）
router.get('/students', roleAuth('LIBRARIAN'), async (req, res, next) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true, name: true, studentId: true, role: true }
    });
    res.json(success(students, 'Students retrieved'));
  } catch (err) {
    next(err);
  }
});

// 🔹 借书接口 /checkout
// ✅ 修复：参数校验前置，事务内只写数据，移除 res 调用
router.post('/checkout', roleAuth('LIBRARIAN'), async (req, res, next) => {
  try {
    const { barcode, studentId, dueDate } = req.body;

    // 1. 参数显式拦截，防止空值触发 Prisma 500 异常
    if (!barcode || String(barcode).trim() === '') {
      return res.status(400).json(error('Barcode is required', 400));
    }
    if (!studentId || String(studentId).trim() === '') {
      return res.status(400).json(error('Student ID is required', 400));
    }
    if (!dueDate) {
      return res.status(400).json(error('Due date is required', 400));
    }

    // 2. 日期格式校验
    const due = new Date(dueDate);
    if (isNaN(due.getTime()) || due <= new Date()) {
      return res.status(400).json(error('Invalid due date', 400));
    }

    // 3. 状态校验（事务外执行只读查询）
    const bc = await prisma.barcode.findUnique({ where: { barcode }, include: { book: true } });
    
    // ✅ 修复：拦截已软删除的图书
    if (!bc || bc.book.isDeleted) {
      return res.status(404).json(error('Book not found or removed from catalog', 404));
    }
    if (bc.status !== 'AVAILABLE') {
      return res.status(409).json(error('Book not available', 409));
    }

    const user = await prisma.user.findUnique({ where: { studentId } });
    if (!user || user.role !== 'STUDENT' || user.status !== 'ACTIVE') {
      return res.status(400).json(error('Invalid student account', 400));
    }

    // 4. 事务内仅执行写操作
    const result = await prisma.$transaction(async (tx) => {
      await tx.barcode.update({ where: { id: bc.id }, data: { status: 'BORROWED' } });
      const loan = await tx.loan.create({
        data: {
          barcodeId: bc.id, // 关联具体条形码 ID
          userId: user.id,
          checkoutDate: new Date(),
          dueDate: due,
          returnDate: null,
          fineAmount: 0,
          finePaid: false,
          fineForgiven: false,
        },
      });
      return { 
        loanId: loan.id, 
        studentName: user.name, 
        bookTitle: bc.book.title, 
        barcode: bc.barcode 
      };
    });

    // 5. 成功响应（无条件返回）
    res.json(success(result, 'Checkout successful'));
  } catch (err) {
    // 兼容带 statusCode 的错误
    if (err.statusCode) {
      return res.status(err.statusCode).json(error(err.message, err.statusCode));
    }
    next(err);
  }
});

// 🔹 还书接口 /return
// ✅ 修复：查询也放入事务中，保证原子性
router.post('/return', roleAuth('LIBRARIAN'), async (req, res, next) => {
  try {
    const { barcode } = req.body;
    if (!barcode || String(barcode).trim() === '') {
      return res.status(400).json(error('Barcode is required', 400));
    }

    const result = await prisma.$transaction(async (tx) => {
      const bc = await tx.barcode.findUnique({ where: { barcode }, include: { book: true } });
      if (!bc) throw Object.assign(new Error('Barcode not found'), { statusCode: 400 });

      // 查找该书码对应的未还借阅记录
      const loan = await tx.loan.findFirst({ where: { barcodeId: bc.id, returnDate: null } });
      if (!loan) throw Object.assign(new Error('No active loan found for this barcode'), { statusCode: 400 });

      // 更新借阅记录
      await tx.loan.update({ where: { id: loan.id }, data: { returnDate: new Date() } });
      // 恢复条形码状态
      await tx.barcode.update({ where: { id: bc.id }, data: { status: 'AVAILABLE' } });
      
      return { barcode, bookTitle: bc.book.title };
    });

    res.json(success(result, 'Return successful'));
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json(error(err.message, err.statusCode));
    }
    next(err);
  }
});

// 🔹 查看逾期名单 /overdue
router.get('/overdue', roleAuth('LIBRARIAN'), async (req, res, next) => {
  try {
    const now = new Date();

    // 查询所有未归还且已逾期的借阅记录
    const overdueLoans = await prisma.loan.findMany({
      where: {
        returnDate: null,
        dueDate: {
          lt: now,  // dueDate < now
        },
      },
      include: {
        user: {
          select: { id: true, name: true, studentId: true },
        },
        barcode: {
          select: {
            book: {
              select: { id: true, title: true, author: true },
            },
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    // 格式化输出
    const list = overdueLoans.map((loan) => {
      const overdueDay = Math.floor((now.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        loanId: loan.id,
        student: {
          id: loan.user.id,
          name: loan.user.name,
          studentId: loan.user.studentId,
        },
        book: {
          id: loan.barcode.book.id,
          title: loan.barcode.book.title,
          author: loan.barcode.book.author,
        },
        dueDate: loan.dueDate,
        overdueDay,
      };
    });

    res.json(success({ list, total: list.length }, 'Overdue loans retrieved'));
  } catch (err) {
    next(err);
  }
});

module.exports = router;