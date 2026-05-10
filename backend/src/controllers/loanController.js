// backend/src/controllers/loanController.js
const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');

const prisma = new PrismaClient();

/**
 * 获取逾期名单
 * 条件：returnDate 为空（未归还）且 dueDate 早于当前日期
 */
exports.getOverdueLoans = async (req, res, next) => {
  try {
    const { page = 1, size = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(size);
    const take = parseInt(size);

    const now = new Date();

    const [overdueLoans, total] = await Promise.all([
      prisma.loan.findMany({
        where: {
          returnDate: null, // 未归还
          dueDate: {
            lt: now, // 到期日期早于当前时间
          },
        },
        skip,
        take,
        orderBy: { dueDate: 'asc' }, // 按到期日期升序排列（最早到期的在前）
        include: {
          book: true, // 关联图书信息
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              studentId: true,
            },
          }, // 关联用户信息
        },
      }),
      prisma.loan.count({
        where: {
          returnDate: null,
          dueDate: { lt: now },
        },
      }),
    ]);

    // 计算逾期天数
    const result = overdueLoans.map(loan => {
      const overdueDays = Math.floor((now - new Date(loan.dueDate)) / (1000 * 60 * 60 * 24));
      return {
        ...loan,
        overdueDays,
      };
    });

    res.json(success({ list: result, total }, 'Overdue loans retrieved'));
  } catch (err) {
    next(err);
  }
};

/**
 * 获取所有借阅记录（包含已归还和未归还）
 */
exports.listLoans = async (req, res, next) => {
  try {
    const { page = 1, size = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(size);
    const take = parseInt(size);

    const where = {};
    if (status === 'returned') {
      where.returnDate = { not: null };
    } else if (status === 'borrowed') {
      where.returnDate = null;
    }

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        skip,
        take,
        orderBy: { checkoutDate: 'desc' },
        include: {
          book: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              studentId: true,
            },
          },
        },
      }),
      prisma.loan.count({ where }),
    ]);

    res.json(success({ list: loans, total }, 'Loans retrieved'));
  } catch (err) {
    next(err);
  }
};

/**
 * 获取单个借阅记录详情
 */
exports.getLoanById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        book: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
          },
        },
      },
    });

    if (!loan) return res.status(404).json(error('Loan not found', 404));
    res.json(success(loan));
  } catch (err) {
    next(err);
  }
};
