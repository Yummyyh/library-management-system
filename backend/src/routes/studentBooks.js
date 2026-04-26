const express = require('express');
const router = express.Router();
const studentBookController = require('../controllers/studentBookController');
const studentAuth = require('../middleware/studentAuth');

// GET /api/student/books/search?q=...
router.get('/search', studentBookController.search);

// POST /api/student/books/:id/borrow (requires student auth)
router.post('/:id/borrow', studentAuth, studentBookController.borrow);

module.exports = router;

