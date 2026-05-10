// backend/src/routes/books.js
const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const roleAuth = require('../middleware/roleAuth');

// 🔑 Changed: ADMIN → LIBRARIAN
router.post('/', roleAuth('LIBRARIAN'), bookController.createBook);
router.get('/', roleAuth('LIBRARIAN'), bookController.listBooks);
router.get('/:id', roleAuth('LIBRARIAN'), bookController.getBookById);
router.put('/:id', roleAuth('LIBRARIAN'), bookController.updateBook);
router.delete('/:id', roleAuth('LIBRARIAN'), bookController.deleteBook);

module.exports = router;