// backend/src/utils/scheduler.js
const schedule = require('node-schedule');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 存储通知的内存map: userId -> [通知对象]
const notificationsMap = new Map();

/**
 * 获取用户的所有通知
 * @param {string} userId
 * @returns {Array} 通知列表
 */
exports.getNotifications = (userId) => {
  return notificationsMap.get(userId) || [];
};

/**
 * 清空用户的所有通知
 * @param {string} userId
 */
exports.clearNotifications = (userId) => {
  notificationsMap.delete(userId);
};

/**
 * Append in-memory notifications for a user (e.g. librarian-triggered reminders).
 */
exports.appendNotifications = (userId, notifications = []) => {
  if (!userId || !Array.isArray(notifications) || notifications.length === 0) {
    return;
  }
    const existing = notificationsMap.get(userId) || [];
  notificationsMap.set(userId, [...existing, ...notifications]);
};

/**
 * 定时任务：每天凌晨4点查询逾期图书并生成通知
 */
exports.startOverdueCheckScheduler = () => {
  // ⏰ 每天凌晨4点执行
  schedule.scheduleJob('0 4 * * *', async () => {
    try {
      console.log('[Scheduler] 开始检查逾期图书...');
      
      // 1. 查询所有未归还且已逾期的借阅记录
      const now = new Date();
      const overdueLoans = await prisma.loan.findMany({
        where: {
          returnDate: null,
          dueDate: {
            lt: now,  // dueDate < now
          },
        },
        include: {
          user: {
            select: { id: true, name: true },
          },
          barcode: {
            select: {
              book: {
                select: { id: true, title: true },
              },
            },
          },
        },
      });

      console.log(`[Scheduler] 发现 ${overdueLoans.length} 条逾期记录`);

      // 2. 按用户分组，为每个用户生成通知
      const notificationsByUser = {};
      for (const loan of overdueLoans) {
        const userId = loan.user.id;
        const overdayDays = Math.floor((now.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (!notificationsByUser[userId]) {
          notificationsByUser[userId] = [];
        }

        notificationsByUser[userId].push({
          bookId: loan.barcode.book.id,
          bookTitle: loan.barcode.book.title,
          overdueDay: overdayDays,
          dueDate: loan.dueDate,
          notifiedAt: now,
        });
      }

      // 3. 将通知存储到内存map中
      for (const [userId, notifications] of Object.entries(notificationsByUser)) {
        notificationsMap.set(userId, notifications);
        console.log(`[Scheduler] 为用户 ${userId} 生成了 ${notifications.length} 条通知`);
      }

      console.log('[Scheduler] 逾期检查完成');
    } catch (err) {
      console.error('[Scheduler] 错误：', err.message);
    }
  });

  console.log('[Scheduler] 逾期检查定时任务已启动（每天凌晨4点）');
};
