// backend/src/routes/loans.js
const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');

const checkAdminAuth = (req, res, next) => {
  next(); // 暂时放行，实际项目中应验证角色
};

// 路由定义
router.get('/', checkAdminAuth, loanController.listLoans);           // GET /api/admin/loans - 获取所有借阅记录
router.get('/overdue', checkAdminAuth, loanController.getOverdueLoans); // GET /api/admin/loans/overdue - 获取逾期名单
router.get('/:id', checkAdminAuth, loanController.getLoanById);      // GET /api/admin/loans/:id - 获取单个借阅记录详情

module.exports = router;
