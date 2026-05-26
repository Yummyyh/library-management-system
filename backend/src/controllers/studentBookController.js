// backend/src/controllers/studentBookController.js
const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');
const { toBookDetailPayload } = require('../utils/bookDetail');
const { assertWithinBorrowLimit, dueDateFromPolicy } = require('../utils/getConfig');
const prisma = new PrismaClient();

/** 书目查询字段（与搜索/浏览共用） */
const bookListSelect = {
  id: true,
  title: true,
  author: true,
  isbn: true,
  barcodes: {
    select: {
      barcode: true,
      status: true,
    },
  },
};

/**
 * 将 Prisma 记录转为前端列表项（含 availableCount / stock 兼容字段）
 * @param {object} b - book 含 barcodes
 */
function toBookListItem(b) {
  const availableCount = b.barcodes?.filter((bc) => bc.status === 'AVAILABLE').length ?? 0;
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    isbn: b.isbn,
    availableCount,
    stock: availableCount,
    availability: availableCount > 0 ? 'available' : 'borrowed',
    barcodes: b.barcodes || [],
  };
}

/**
 * 构建列表查询条件：未删除 + 可选关键词（标题/作者/ISBN）
 * @param {string} q - 关键词，可为空表示全量
 */
function buildBookListWhere(q) {
  const keyword = String(q || '').trim();
  const base = { isDeleted: false };
  if (!keyword) return base;
  return {
    ...base,
    OR: [
      { title: { contains: keyword } },
      { author: { contains: keyword } },
      { isbn: { contains: keyword } },
    ],
  };
}

/**
 * 0. 浏览书库（分页目录，关键词可选）
 * 进入页面即可拉取书目，无需强制关键词
 */
exports.listCatalog = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limitRaw = parseInt(String(req.query.limit || '12'), 10) || 12;
    const limit = Math.min(50, Math.max(1, limitRaw));
    const q = String(req.query.q || '').trim();

    const where = buildBookListWhere(q);
    const skip = (page - 1) * limit;

    const [total, books] = await Promise.all([
      prisma.book.count({ where }),
      prisma.book.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: bookListSelect,
        skip,
        take: limit,
      }),
    ]);

    const list = books.map(toBookListItem);
    return res.json(success({ list, page, limit, total }, 'Books retrieved'));
  } catch (e) {
    next(e);
  }
};

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

    const where = buildBookListWhere(q);

    const books = await prisma.book.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: bookListSelect,
      take: 50,
    });

    const list = books.map(toBookListItem);

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
      await assertWithinBorrowLimit(studentId, { prisma: tx });

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

      // 4. 创建借阅记录（关联 barcodeId）；借期来自 Config.BORROW_DAYS
      const now = new Date();
      const dueDate = await dueDateFromPolicy(now, { prisma: tx });

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

/**
 * 3. 学生查看自己的借阅记录 (getMyLoans STU-07)
 * 验收标准：返回书名、作者、借阅日期、应还日期、状态，支持已还/未还筛选
 */
exports.getMyLoans = async (req, res, next) => {
  try {
    const studentId = req.student.id; // 复用和 borrow 接口一样的登录学生 ID 获取方式
    const status = req.query.status; // 支持按状态筛选（可选参数）

    // 构建查询条件
    const where = {
      userId: studentId,
    };
    if (status === 'borrowed') {
      where.returnDate = null; // 未还的记录
    } else if (status === 'returned') {
      where.returnDate = { not: null }; // 已还的记录
    }

    // 关联查询：借阅记录 → 图书册 → 图书信息
    const loans = await prisma.loan.findMany({
      where,
      include: {
        barcode: {
          include: {
            book: {
              select: {
                title: true,
                author: true,
                isbn: true,
              },
            },
          },
        },
      },
      orderBy: {
        checkoutDate: 'desc', // 按借阅时间倒序，最新的在前
      },
    });

    // 格式化返回数据，适配前端展示
    const list = loans.map((loan) => {
      const book = loan.barcode.book;
      const isOverdue = loan.dueDate < new Date() && !loan.returnDate;

      return {
        loanId: loan.id,
        bookTitle: book.title,
        bookAuthor: book.author,
        bookIsbn: book.isbn,
        barcode: loan.barcode.barcode,
        checkoutDate: loan.checkoutDate,
        dueDate: loan.dueDate,
        returnDate: loan.returnDate,
        status: loan.returnDate ? 'returned' : (isOverdue ? 'overdue' : 'borrowed'),
      };
    });

    return res.json(success({ list }, 'Loans retrieved'));
  } catch (e) {
    next(e);
  }
};