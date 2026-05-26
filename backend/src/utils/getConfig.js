// backend/src/utils/getConfig.js
// 从 Config 表读取系统配置；缺省或空值时回退到 configDefaults.js 中的默认值。
const { PrismaClient } = require('@prisma/client');
const { CONFIG_DEFAULTS, isEmptyConfigValue } = require('./configDefaults');

const prisma = new PrismaClient();

const POLICY_KEYS = ['BORROW_LIMIT', 'BORROW_DAYS', 'DAILY_FINE'];
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 读取单项配置（字符串）。
 * @param {string} key
 * @param {{ prisma?: import('@prisma/client').PrismaClient }} [options]
 */
async function getConfigString(key, options = {}) {
  const db = options.prisma || prisma;
  const fallback = CONFIG_DEFAULTS[key];

  const row = await db.config.findUnique({
    where: { key },
    select: { value: true },
  });

  if (!isEmptyConfigValue(row?.value)) {
    return String(row.value).trim();
  }

  if (fallback !== undefined) {
    return String(fallback);
  }

  return '';
}

/**
 * 读取单项配置并解析为数字；解析失败时回退默认值。
 * @param {string} key
 * @param {{ prisma?: import('@prisma/client').PrismaClient }} [options]
 */
async function getConfigNumber(key, options = {}) {
  const raw = await getConfigString(key, options);
  const parsed = Number(raw);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  const fallback = Number(CONFIG_DEFAULTS[key]);
  return Number.isFinite(fallback) ? fallback : 0;
}

/**
 * 借阅策略三项（供借还书等业务使用）。
 * @param {{ prisma?: import('@prisma/client').PrismaClient }} [options]
 * @returns {Promise<{ borrowLimit: number, borrowDays: number, dailyFine: number }>}
 */
async function getBorrowingPolicy(options = {}) {
  const [borrowLimit, borrowDays, dailyFine] = await Promise.all(
    POLICY_KEYS.map((key) => getConfigNumber(key, options))
  );

  return { borrowLimit, borrowDays, dailyFine };
}

/**
 * 统计用户当前未还借阅册数。
 */
async function countActiveLoans(userId, options = {}) {
  const db = options.prisma || prisma;
  return db.loan.count({
    where: { userId, returnDate: null },
  });
}

/**
 * 未达借阅上限则通过；否则抛出 statusCode 409 的 Error。
 */
async function assertWithinBorrowLimit(userId, options = {}) {
  const { borrowLimit } = await getBorrowingPolicy(options);
  const activeCount = await countActiveLoans(userId, options);
  if (activeCount >= borrowLimit) {
    const err = new Error(`Borrowing limit reached (maximum ${borrowLimit} active loans)`);
    err.statusCode = 409;
    throw err;
  }
  return { borrowLimit, activeCount };
}

/**
 * 按 BORROW_DAYS 计算应还日期。
 */
async function dueDateFromPolicy(checkoutDate = new Date(), options = {}) {
  const { borrowDays } = await getBorrowingPolicy(options);
  const base = checkoutDate instanceof Date ? checkoutDate : new Date(checkoutDate);
  return new Date(base.getTime() + borrowDays * DAY_MS);
}

/**
 * 逾期天数（未逾期为 0；与逾期名单一致，按整天向下取整）。
 */
function overdueDaysBetween(dueDate, asOfDate = new Date()) {
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  const asOf = asOfDate instanceof Date ? asOfDate : new Date(asOfDate);
  if (asOf <= due) return 0;
  return Math.floor((asOf.getTime() - due.getTime()) / DAY_MS);
}

/**
 * 还书时罚金：逾期天数 × DAILY_FINE；已豁免则金额为 0。
 * @returns {Promise<{ overdueDays: number, fineAmount: number }>}
 */
async function calculateReturnFine(loan, returnDate = new Date(), options = {}) {
  const overdueDays = overdueDaysBetween(loan.dueDate, returnDate);
  if (loan.fineForgiven) {
    return { overdueDays, fineAmount: 0 };
  }
  const { dailyFine } = await getBorrowingPolicy(options);
  const fineAmount = Math.round(overdueDays * dailyFine * 100) / 100;
  return { overdueDays, fineAmount };
}

module.exports = {
  getConfigString,
  getConfigNumber,
  getBorrowingPolicy,
  countActiveLoans,
  assertWithinBorrowLimit,
  dueDateFromPolicy,
  overdueDaysBetween,
  calculateReturnFine,
  POLICY_KEYS,
  DAY_MS,
};
