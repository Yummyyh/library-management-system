// backend/src/routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

const roleAuth = require('../middleware/roleAuth');
// 将下方所有 checkAdminAuth 替换为 roleAuth('ADMIN')
router.post('/', roleAuth('ADMIN'), userController.createUser);
router.get('/', roleAuth('ADMIN'), userController.listUsers);
router.get('/:id', roleAuth('ADMIN'), userController.getUserById);
router.put('/:id', roleAuth('ADMIN'), userController.updateUser);
router.delete('/:id', roleAuth('ADMIN'), userController.deleteUser);



module.exports = router;