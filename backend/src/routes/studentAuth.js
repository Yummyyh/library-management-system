const express = require('express');
const router = express.Router();
const studentAuthController = require('../controllers/studentAuthController');

// POST /api/student/auth/register
router.post('/register', studentAuthController.register);

// POST /api/student/auth/login
router.post('/login', studentAuthController.login);

module.exports = router;

