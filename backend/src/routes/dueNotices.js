const express = require('express');
const router = express.Router();

const dueNoticeController = require('../controllers/dueNoticeController');
const studentAuth = require('../middleware/studentAuth');

router.get('/', studentAuth, dueNoticeController.listDueNotices);

module.exports = router;