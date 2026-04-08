// backend/src/routes/books.js
const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

const checkAdminAuth = (req, res, next) => {
  next(); // 暂时放行
};

// 路由定义
router.post('/', checkAdminAuth, bookController.createBook);      // POST /api/books
router.get('/', checkAdminAuth, bookController.listBooks);        // GET /api/books
router.get('/:id', checkAdminAuth, bookController.getBookById);   // GET /api/books/:id
router.put('/:id', checkAdminAuth, bookController.updateBook);    // PUT /api/books/:id
router.delete('/:id', checkAdminAuth, bookController.deleteBook); // DELETE /api/books/:id

module.exports = router;