const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

module.exports = function roleAuth(requiredRole) {
  return (req, res, next) => {
    try {
      const header = req.headers.authorization || '';
      const [type, token] = header.split(' ');
      if (type !== 'Bearer' || !token) return res.status(401).json(error('Unauthorized', 401));
      
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload.role !== requiredRole) return res.status(403).json(error('Forbidden: Insufficient role', 403));
      if (payload.status !== 'ACTIVE') return res.status(403).json(error('Forbidden: Account deactivated', 403));
      
      req.user = { id: payload.id, role: payload.role, status: payload.status };
      next();
    } catch (e) {
      res.status(401).json(error('Unauthorized', 401));
    }
  };
}