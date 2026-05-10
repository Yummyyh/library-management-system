// backend/src/index.js
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

// 🚨 修改挂载路径（对齐 PM 规范）
const userRoutes = require('./routes/users');
const bookRoutes = require('./routes/books');
const loanRoutes = require('./routes/loans');

const app = express();

// 基础中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Library API is running' });
});

// 🚨 新增：挂载路由（必须在 404 中间件之前），添加 /admin 前缀（对齐 PM 规范）
app.use('/api/admin/users', userRoutes);   // → POST/GET/PUT/DELETE /api/users
app.use('/api/admin/books', bookRoutes);   // → POST/GET/PUT/DELETE /api/books
app.use('/api/admin/loans', loanRoutes);   // → GET /api/admin/loans /api/admin/loans/overdue

// 404 捕获中间件（必须在所有路由之后）
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.statusCode = 404;
  next(err);
});

// 全局错误处理（必须在最后）
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

//调试信息
// 调试：确认路由模块已加载
console.log('✅ userRoutes loaded:', typeof userRoutes);
console.log('✅ bookRoutes loaded:', typeof bookRoutes);


app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});