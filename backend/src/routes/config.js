// backend/src/routes/config.js
const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

router.get('/', configController.getAllConfigs);
router.get('/audit', configController.getConfigAuditLog);
router.put('/:key', configController.updateConfig);

module.exports = router;
