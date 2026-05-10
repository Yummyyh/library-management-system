// backend/src/middleware/errorHandler.js
const { error } = require('../utils/response');

/**
 * 全局异常处理中间件
 * 捕获并标准化所有未处理的错误
 */
const errorHandler = (err, req, res, next) => {
  // 记录错误（生产环境可替换为日志服务）
  console.error('🔥 Error:', err.name, err.message);

  // Prisma 唯一约束冲突 (P2002)
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return res.status(409).json(error(`${field} already exists`, 409));
  }

  // Prisma 记录未找到 (P2025)
  if (err.code === 'P2025') {
    return res.status(404).json(error('Resource not found', 404));
  }

  // bcrypt 错误
  if (err.name === 'BcryptError') {
    return res.status(500).json(error('Password hashing failed', 500));
  }

  // 默认错误
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json(error(message, statusCode));
};

module.exports = errorHandler;