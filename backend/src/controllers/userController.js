// backend/src/controllers/userController.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { success, error } = require('../utils/response');

const prisma = new PrismaClient();

/**
 * 1. 创建用户 (Create)
 * 验收标准：校验必填、查重、密码哈希、默认 Active
 */
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, studentId, role, password } = req.body;

    // 基础校验
    if (!name || !email || !studentId || !role || !password) {
      return res.status(400).json(error('Missing required fields', 400));
    }

    // 邮箱格式简单校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json(error('Invalid email format', 400));
    }

    // 哈希密码
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        name,
        email,
        studentId,
        role: role.toUpperCase(), // 确保大写
        passwordHash,
        status: 'ACTIVE',
      },
    });

    res.status(201).json(success({ id: user.id, status: user.status }, 'User created successfully', 201));
  } catch (err) {
    next(err); // 交给 errorHandler 处理 (如 P2002 唯一性冲突)
  }
};

/**
 * 2. 获取用户列表 (Read/List)
 * 验收标准：分页、按角色/状态过滤
 */
exports.listUsers = async (req, res, next) => {
  try {
    const { page = 1, size = 10, role, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(size);
    const take = parseInt(size);

    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: { // 排除 passwordHash
          id: true, name: true, email: true, studentId: true, role: true, status: true, createdAt: true
        }
      }),
      prisma.user.count({ where }),
    ]);

    res.json(success({ list: users, total }, 'Users retrieved'));
  } catch (err) {
    next(err);
  }
};

/**
 * 3. 获取用户详情 (Read/One)
 */
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, studentId: true, role: true, status: true },
    });

    if (!user) return res.status(404).json(error('User not found', 404));
    res.json(success(user));
  } catch (err) {
    next(err);
  }
};

/**
 * 4. 更新用户 (Update)
 * 验收标准：修改资料/状态
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, status } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { name, email, role: role?.toUpperCase(), status },
    });

    res.json(success({ updated: true }, 'User updated'));
  } catch (err) {
    next(err);
  }
};

/**
 * 5. 停用/删除用户 (Delete - Soft)
 * 验收标准：软删除 (DEACTIVATED)
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    // 软删除逻辑：修改状态而非物理删除
    await prisma.user.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });

    res.json(success({ deleted: true }, 'User deactivated'));
  } catch (err) {
    next(err);
  }
};