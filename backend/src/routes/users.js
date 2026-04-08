// backend/src/routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// 🔒 简单的权限校验占位符（R1 阶段可先放行，R2 可接入 JWT）
const checkAdminAuth = (req, res, next) => {
  // 这里假设所有请求都是管理员，或者检查 req.headers 中的 token
  // 为了 R1 开发方便，暂时放行，实际项目中应验证角色
  next();
};

// 路由定义
router.post('/', checkAdminAuth, userController.createUser);      // POST /api/users
router.get('/', checkAdminAuth, userController.listUsers);        // GET /api/users
router.get('/:id', checkAdminAuth, userController.getUserById);   // GET /api/users/:id
router.put('/:id', checkAdminAuth, userController.updateUser);    // PUT /api/users/:id
router.delete('/:id', checkAdminAuth, userController.deleteUser); // DELETE /api/users/:id

module.exports = router;