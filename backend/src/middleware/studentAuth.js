const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');

// JWT secret for dev. In production, set JWT_SECRET in environment.
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

/**
 * Student auth middleware.
 * - Expects `Authorization: Bearer <token>`
 * - Attaches `req.student` = { id, role, studentId }
 */
module.exports = function studentAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');

    if (type !== 'Bearer' || !token) {
      return res.status(401).json(error('Unauthorized', 401));
    }

    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload?.id || payload?.role !== 'STUDENT') {
      return res.status(403).json(error('Forbidden', 403));
    }

    req.student = { id: payload.id, role: payload.role, studentId: payload.studentId };
    next();
  } catch (e) {
    return res.status(401).json(error('Unauthorized', 401));
  }
};

