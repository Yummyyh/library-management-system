const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { success, error } = require('../utils/response');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Student registration.
 * Required fields: name, email, studentId, password
 * Prevent duplicate studentId.
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, studentId, password } = req.body || {};

    if (!name || !email || !studentId || !password) {
      return res.status(400).json(error('Missing required fields', 400));
    }
    if (!isValidEmail(email)) {
      return res.status(400).json(error('Invalid email format', 400));
    }
    if (String(password).length < 6) {
      return res.status(400).json(error('Password must be at least 6 characters', 400));
    }

    // App-level duplicate prevention (Prisma unique constraint still protects too).
    const existingByStudentId = await prisma.user.findUnique({
      where: { studentId: String(studentId) },
      select: { id: true },
    });
    if (existingByStudentId) {
      return res.status(409).json(error('studentId already exists', 409));
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await prisma.user.create({
      data: {
        name: String(name),
        email: String(email),
        studentId: String(studentId),
        passwordHash,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
      select: { id: true, name: true, email: true, studentId: true, role: true, status: true },
    });

    return res
      .status(201)
      .json(success({ student: user }, 'Registration successful', 201));
  } catch (e) {
    next(e);
  }
};

/**
 * Student login (studentId + password).
 * Returns JWT for subsequent student actions.
 */
exports.login = async (req, res, next) => {
  try {
    const { studentId, password } = req.body || {};
    if (!studentId || !password) {
      return res.status(400).json(error('Missing required fields', 400));
    }

    const user = await prisma.user.findUnique({
      where: { studentId: String(studentId) },
      select: { id: true, name: true, email: true, studentId: true, role: true, status: true, passwordHash: true },
    });

    if (!user || user.role !== 'STUDENT' || user.status !== 'ACTIVE') {
      return res.status(401).json(error('Invalid credentials', 401));
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json(error('Invalid credentials', 401));
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, studentId: user.studentId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const safeStudent = {
      id: user.id,
      name: user.name,
      email: user.email,
      studentId: user.studentId,
      role: user.role,
      status: user.status,
    };

    return res.json(success({ token, student: safeStudent }, 'Login successful'));
  } catch (e) {
    next(e);
  }
};

