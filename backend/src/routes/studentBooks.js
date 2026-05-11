const express = require('express');
const router = express.Router();
const studentBookController = require('../controllers/studentBookController');
const studentAuth = require('../middleware/studentAuth');

// GET /api/student/books — 分页浏览目录（q 可选）
router.get('/', studentBookController.listCatalog);

// GET /api/student/books/search?q=... — 关键词搜索（最多 50 条，兼容旧前端）
router.get('/search', studentBookController.search);

// GET /api/student/books/my-loans — 查看我的借阅记录（需要登录）
// NOTE: Must be registered before "/:id" or "my-loans" is treated as a book id.
router.get('/my-loans', studentAuth, studentBookController.getMyLoans);

// GET /api/student/books/:id — catalog detail (no auth; same spirit as search)
router.get('/:id', studentBookController.getBookDetail);

// POST /api/student/books/:id/borrow (requires student auth)
router.post('/:id/borrow', studentAuth, studentBookController.borrow);

module.exports = router;

