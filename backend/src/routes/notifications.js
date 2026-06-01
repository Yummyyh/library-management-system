const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const { getNotifications, clearNotifications } = require('../utils/scheduler');
const { success } = require('../utils/response');
const studentAuth = require('../middleware/studentAuth');

const prisma = new PrismaClient();

// 🔹 获取学生通知 /api/student/notifications
router.get('/', studentAuth, async (req, res) => {
  try {
    const userId = req.student.id;

    // 内存中的逾期通知
    const schedulerNotifs = getNotifications(userId).map((notif, index) => ({
      id: `overdue-${index}`,
      title: 'Overdue Reminder',
      message: `${notif.bookTitle} is ${notif.overdueDay} day(s) overdue. Please return it.`,
      type: 'OVERDUE',
      isRead: false,
      createdAt: new Date().toISOString(),
    }));

    // 数据库中的通知（预约、管理员消息等）
    const dbNotifs = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const all = [...schedulerNotifs, ...dbNotifs];
    res.json(success({ list: all, total: all.length }, 'Notifications retrieved'));
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ msg: 'Internal server error', data: null });
  }
});

// 标记单条通知为已读
router.put('/:id/read', studentAuth, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.student.id },
      data: { isRead: true },
    });
    res.json(success({ updated: true }, 'Notification marked as read'));
  } catch (err) {
    res.status(500).json({ msg: 'Internal server error', data: null });
  }
});

// 学生确认通知后清空内存中的通知，标记DB通知为已读
router.delete('/', studentAuth, async (req, res) => {
  try {
    clearNotifications(req.student.id);
    await prisma.notification.updateMany({
      where: { userId: req.student.id, isRead: false },
      data: { isRead: true },
    });
    res.json(success(null, 'Notifications cleared'));
  } catch (err) {
    res.status(500).json({ msg: 'Internal server error', data: null });
  }
});

module.exports = router;
