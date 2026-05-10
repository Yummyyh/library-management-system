const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { success, error } = require('../utils/response');
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json(error('Missing email or password', 400));

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== 'LIBRARIAN' || user.status !== 'ACTIVE') {
      return res.status(401).json(error('Invalid credentials', 401));
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json(error('Invalid credentials', 401));

    const token = jwt.sign(
      { id: user.id, role: user.role, status: user.status, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json(success({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } }, 'Librarian login successful'));
  } catch (e) { next(e); }
};