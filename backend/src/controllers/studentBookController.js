// backend/src/controllers/studentBookController.js
const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');
const { toBookDetailPayload } = require('../utils/bookDetail');
const prisma = new PrismaClient();

/**
 * 1. 图书搜索 (Search)
 * 验收标准：关键词搜索、隐藏已删除、返回 availableCount + barcodes + 兼容 stock
 */
exports.search = async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
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
      select: {
        id: true,
        title: true,
        author: true,
        isbn: true,
        // ✅ 返回条形码数组（含状态），供前端"查看条形码"功能使用
        barcodes: {
          select: {
            barcode: true,
            status: true,
          },
        },
      },
      take: 50,
    });

    const list = books.map((b) => {
      // 计算可用数量
      const availableCount = b.barcodes?.filter(bc => bc.status === 'AVAILABLE').length ?? 0;
      
      return {
        id: b.id,
        title: b.title,
        author: b.author,
        isbn: b.isbn,
        availableCount,           // ✅ 新字段：可用数
        stock: availableCount,    // ✅ 兼容旧字段：防止前端乐观更新报错
        availability: availableCount > 0 ? 'available' : 'borrowed',
        barcodes: b.barcodes || [], // ✅ 返回条形码详情（确保非 undefined）
      };
    });

    return res.json(success({ list }, 'Books retrieved'));
  } catch (e) {
    next(e);
  }
};

/**
 * 1b. 图书详情 (Read/One) — 与馆员端结构一致，供学生目录详情页使用
 * GET /api/student/books/:id
 */
exports.getBookDetail = async (req, res, next) => {
  try {
    const bookId = req.params.id && String(req.params.id).trim();
    if (!bookId) {
      return res.status(400).json(error('Book id is required', 400));
    }

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { barcodes: { orderBy: { barcode: 'asc' } } },
    });

    if (!book || book.isDeleted) {
      return res.status(404).json(error('Book not found', 404));
    }

    const payload = toBookDetailPayload(book, { includeBarcodes: true });
    return res.json(success(payload, 'Book retrieved'));
  } catch (e) {
    next(e);
  }
};

/**
 * 2. 学生借书 (Borrow)
 * 验收标准：按 bookId 自动分配首个 AVAILABLE 的 Barcode，事务内完成，错误码规范化
 */
exports.borrow = async (req, res, next) => {
  try {
    const bookId = req.params.id;
    const studentId = req.student.id; // 从中间件获取当前登录学生 ID

    const result = await prisma.$transaction(async (tx) => {
      // 1. 查书目是否存在且未删除
      const book = await tx.book.findUnique({
        where: { id: bookId },
        select: { id: true, title: true, isDeleted: true },
      });

      if (!book || book.isDeleted) {
        const err = new Error('Book not found or removed from catalog');
        err.statusCode = 404;
        throw err;
      }

      // 2. 查找该书名下第一个状态为 AVAILABLE 的 Barcode
      const barcode = await tx.barcode.findFirst({
        where: {
          bookId: book.id,
          status: 'AVAILABLE',
        },
        select: { id: true, barcode: true },
      });

      if (!barcode) {
        const err = new Error('No available copy for this book');
        err.statusCode = 409;
        throw err;
      }

      // 3. 更新 Barcode 状态为 BORROWED
      await tx.barcode.update({
        where: { id: barcode.id },
        data: { status: 'BORROWED' },
      });

      // 4. 创建借阅记录（关联 barcodeId）
      const now = new Date();
      const dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 默认借期 14 天

      const loan = await tx.loan.create({
        data: {
          barcodeId: barcode.id, // ✅ 精准绑定物理册
          userId: studentId,
          checkoutDate: now,
          dueDate: dueDate,
          returnDate: null,
          fineAmount: 0,
          finePaid: false,
          fineForgiven: false,
        },
      });

      return {
        bookTitle: book.title,
        loanId: loan.id,
        barcode: barcode.barcode,
      };
    });

    return res.json(
      success(
        {
          bookTitle: result.bookTitle,
          loan: { id: result.loanId, barcode: result.barcode },
        },
        'Borrow successful'
      )
    );
  } catch (e) {
    // 处理自定义错误码（404/409）
    if (e.statusCode) {
      return res.status(e.statusCode).json(error(e.message, e.statusCode));
    }
    next(e);
  }
};