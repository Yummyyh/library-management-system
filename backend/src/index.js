
// backend/src/index.js
const configRoutes = require('./routes/config');
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const { startOverdueCheckScheduler } = require('./utils/scheduler');

// Route imports
const userRoutes = require('./routes/users');
const bookRoutes = require('./routes/books');
const studentAuthRoutes = require('./routes/studentAuth');
const studentBookRoutes = require('./routes/studentBooks');
const dueNoticeRoutes = require('./routes/dueNotices');
const notificationRoutes = require('./routes/notifications');
const librarianRoutes = require('./routes/librarian.routes');
const externalRoutes = require('./routes/external.routes'); // ✅ 新增：外部 API 路由
const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Library API is running' });
});

// 🔐 Admin routes
app.use('/api/admin/config', configRoutes);
// 兼容既有 Settings 前端（/api/config），与 /api/admin/config 共用同一路由
app.use('/api/config', configRoutes);
app.use('/api/admin/users', userRoutes);

// 🔐 Auth routes (unified)
const adminAuthController = require('./controllers/adminAuthController');
const librarianAuthController = require('./controllers/librarianAuthController');
app.post('/api/admin/auth/login', adminAuthController.login);
app.post('/api/librarian/auth/login', librarianAuthController.login);

// 🔐 Librarian routes (including book management now)
app.use('/api/librarian/books', bookRoutes);
app.use('/api/librarian', librarianRoutes);

// 🔐 Hold/Reservation routes
const holdController = require('./controllers/holdController');
app.get('/api/librarian/holds', holdController.listAllHolds);
app.put('/api/librarian/holds/:id/ready', holdController.markReady);
app.put('/api/librarian/holds/:id/cancel', holdController.cancelHold);

// 🔐 Student routes
app.use('/api/student/auth', studentAuthRoutes);
app.use('/api/student/books', studentBookRoutes);
app.use('/api/student/due-notices', dueNoticeRoutes);
app.use('/api/student/notifications', notificationRoutes);

// Student hold routes
const studentAuth = require('./middleware/studentAuth');
const studentBookController = require('./controllers/studentBookController');
app.post('/api/student/loans/:id/renew', studentAuth, studentBookController.renewLoan);
app.post('/api/student/holds', studentAuth, holdController.createHold);
app.get('/api/student/holds', studentAuth, holdController.listMyHolds);
app.delete('/api/student/holds/:id', studentAuth, holdController.cancelMyHold);

// 📊 Dashboard / Statistics routes (ported from DASH BOARD)
const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

// 🔍 External API routes (ISBN Lookup, etc.) ✅ 新增
app.use('/api/external', externalRoutes);

// 404 & error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.statusCode = 404;
  next(err);
});
app.use(errorHandler);

// ⏰ 启动定时任务：每天凌晨4点检查逾期图书
startOverdueCheckScheduler();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
