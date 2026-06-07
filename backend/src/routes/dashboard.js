// backend/src/routes/dashboard.js
const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');

/** GET /api/dashboard/summary — 图书馆运营数据总览 */
router.get('/summary', async (req, res, next) => {
  try {
    const data = await getDashboardStats();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
