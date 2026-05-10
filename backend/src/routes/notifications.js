const express = require('express');
const router = express.Router();
const { getNotifications } = require('../utils/scheduler');
const { success } = require('../utils/response');
const studentAuth = require('../middleware/studentAuth');

// 🔹 获取学生通知 /api/student/notifications
router.get('/', studentAuth, (req, res) => {
  try {
    const userId = req.student.id;
    const notifications = getNotifications(userId);

    // 格式化通知
    const formattedNotifications = notifications.map((notif, index) => ({
      id: index,
      bookTitle: notif.bookTitle,
      overdueDay: notif.overdueDay,
      message: `${notif.bookTitle}已逾期${notif.overdueDay}天，请及时归还`,
    }));

    res.json(success({
      list: formattedNotifications,
      total: formattedNotifications.length,
    }, 'Notifications retrieved'));
  } catch (err) {
    res.status(500).json({ msg: 'Internal server error', data: null });
  }
});

module.exports = router;
