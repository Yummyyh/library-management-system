// backend/src/routes/external.routes.js
const express = require('express');
const router = express.Router();
const externalController = require('../controllers/externalController');
const roleAuth = require('../middleware/roleAuth');

/**
 * 🔍 ISBN 查询路由
 * GET /api/external/books/isbn/:isbn
 * 
 * 参数:
 *   - isbn: 10位或13位数字（支持带连字符/空格，控制器会自动清理）
 * 
 * 响应:
 *   - 200: { code, data: { title, author, publisher, publishYear, language, description, coverImage }, msg }
 *   - 400: ISBN 格式错误
 *   - 404: 未找到书籍
 *   - 502: 外部 API 不可用
 *   - 504: 请求超时
 * 
 * 权限: 仅馆员 (LIBRARIAN)
 */
router.get('/books/isbn/:isbn', roleAuth('LIBRARIAN'), externalController.getBookByISBN);

module.exports = router;