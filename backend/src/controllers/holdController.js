const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');

const prisma = new PrismaClient();

// GET /api/librarian/holds — 管理员查看所有预约（按预约时间升序）
exports.listAllHolds = async (req, res, next) => {
  try {
    const { page = 1, size = 10, status, bookId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(size);
    const take = parseInt(size);

    const where = {};
    if (status) where.status = status;
    if (bookId) where.bookId = bookId;

    const [holds, total] = await Promise.all([
      prisma.hold.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'asc' },
        include: {
          book: { select: { id: true, title: true, author: true, isbn: true } },
          user: { select: { id: true, name: true, email: true, studentId: true } },
        },
      }),
      prisma.hold.count({ where }),
    ]);

    res.json(success({ list: holds, total }, 'Holds retrieved'));
  } catch (err) {
    next(err);
  }
};

// PUT /api/librarian/holds/:id/ready — 标记可借阅，自动通知学生
exports.markReady = async (req, res, next) => {
  try {
    const { id } = req.params;

    const hold = await prisma.hold.findUnique({ where: { id }, include: { book: true } });
    if (!hold) return res.status(404).json(error('Hold not found', 404));
    if (hold.status !== 'WAITING') {
      return res.status(400).json(error(`Hold is ${hold.status}, cannot mark as ready`, 400));
    }

    const [updatedHold] = await prisma.$transaction([
      prisma.hold.update({ where: { id }, data: { status: 'READY' } }),
      prisma.notification.create({
        data: {
          userId: hold.userId,
          title: 'Reservation Ready',
          message: `"${hold.book.title}" is now available for pickup. Please visit the library.`,
          type: 'HOLD_READY',
        },
      }),
    ]);

    res.json(success(updatedHold, 'Hold marked ready, student notified'));
  } catch (err) {
    next(err);
  }
};

// PUT /api/librarian/holds/:id/cancel — 取消预约，自动通知
exports.cancelHold = async (req, res, next) => {
  try {
    const { id } = req.params;

    const hold = await prisma.hold.findUnique({ where: { id }, include: { book: true } });
    if (!hold) return res.status(404).json(error('Hold not found', 404));
    if (hold.status === 'CANCELLED') return res.status(400).json(error('Already cancelled', 400));

    const [updatedHold] = await prisma.$transaction([
      prisma.hold.update({ where: { id }, data: { status: 'CANCELLED' } }),
      prisma.notification.create({
        data: {
          userId: hold.userId,
          title: 'Reservation Cancelled',
          message: `Your reservation for "${hold.book.title}" has been cancelled.`,
          type: 'HOLD_CANCELLED',
        },
      }),
    ]);

    res.json(success(updatedHold, 'Hold cancelled, student notified'));
  } catch (err) {
    next(err);
  }
};

// POST /api/student/holds — 学生创建预约
exports.createHold = async (req, res, next) => {
  try {
    const { bookId } = req.body;
    const userId = req.student?.id;
    if (!userId) return res.status(401).json(error('Not authenticated', 401));
    if (!bookId) return res.status(400).json(error('bookId is required', 400));

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book || book.isDeleted) return res.status(404).json(error('Book not found', 404));

    const existing = await prisma.hold.findFirst({
      where: { bookId, userId, status: { not: 'CANCELLED' } },
    });
    if (existing) return res.status(409).json(error('You already have an active hold for this book', 409));

    const hold = await prisma.hold.create({
      data: { bookId, userId, status: 'WAITING' },
      include: { book: { select: { id: true, title: true, author: true } } },
    });

    res.status(201).json(success(hold, 'Hold created', 201));
  } catch (err) {
    next(err);
  }
};

// GET /api/student/holds — 学生查看自己的预约
exports.listMyHolds = async (req, res, next) => {
  try {
    const userId = req.student?.id;
    if (!userId) return res.status(401).json(error('Not authenticated', 401));

    const holds = await prisma.hold.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { book: { select: { id: true, title: true, author: true, isbn: true } } },
    });

    res.json(success({ list: holds }, 'My holds retrieved'));
  } catch (err) {
    next(err);
  }
};

// DELETE /api/student/holds/:id — 学生取消自己的预约
exports.cancelMyHold = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.student?.id;
    if (!userId) return res.status(401).json(error('Not authenticated', 401));

    const hold = await prisma.hold.findUnique({ where: { id } });
    if (!hold) return res.status(404).json(error('Hold not found', 404));
    if (hold.userId !== userId) return res.status(403).json(error('Forbidden', 403));
    if (hold.status === 'CANCELLED') return res.status(400).json(error('Already cancelled', 400));

    const updated = await prisma.hold.update({ where: { id }, data: { status: 'CANCELLED' } });
    res.json(success(updated, 'Hold cancelled'));
  } catch (err) {
    next(err);
  }
};
