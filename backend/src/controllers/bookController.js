// backend/src/controllers/bookController.js
const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');

const prisma = new PrismaClient();

/**
 * 1. 创建图书 (Create)
 * 验收标准：校验必填、ISBN、库存、查重
 */
/**
 * 1. 创建图书 (Create)
 * 验收标准：校验必填、ISBN、库存、查重
 */
exports.createBook = async (req, res, next) => {
    try {
      const { 
        title, author, isbn, genre, 
        description = "No description provided", 
        language = "English", 
        shelfLocation = "Unassigned",
        category, 
        stock = 1 
      } = req.body;
  
      // 必填校验（根据 schema，这些字段没有 ? 就是必填）
      if (!title || !author || !isbn || !genre) {
        return res.status(400).json(error('Missing required fields: title, author, isbn, genre', 400));
      }
  
      if (stock < 0) {
        return res.status(400).json(error('Stock cannot be negative', 400));
      }
  
      // ISBN 格式校验（10 或 13 位数字，可含连字符）
      const isbnClean = isbn.replace(/-/g, '');
      if (!/^\d{10}$|^\d{13}$/.test(isbnClean)) {
        return res.status(400).json(error('Invalid ISBN format', 400));
      }
  
      // 写入数据库（✅ 补全所有必填字段）
      const book = await prisma.book.create({
        data: { 
          title, 
          author, 
          isbn, 
          genre,
          description,      // ← 必填，给默认值或从请求取
          language,         // ← 必填，给默认值
          shelfLocation,    // ← 必填，给默认值
          category,         // ← 可选
          stock: parseInt(stock), 
          isDeleted: false  // ← 软删除标记
        },
      });
  
      res.status(201).json(success({ id: book.id, stock: book.stock }, 'Book created', 201));
    } catch (err) {
      next(err);
    }
  };

/**
 * 2. 获取图书列表 (Read/List)
 * 验收标准：关键词搜索、分页、隐藏已删除
 */
exports.listBooks = async (req, res, next) => {
  try {
    const { page = 1, size = 10, keyword } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(size);
    const take = parseInt(size);

    const where = { isDeleted: false }; // 默认不显示已删除图书
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { author: { contains: keyword } },
        { isbn: { contains: keyword } },
      ];
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.book.count({ where }),
    ]);

    res.json(success({ list: books, total }, 'Books retrieved'));
  } catch (err) {
    next(err);
  }
};

/**
 * 3. 获取图书详情 (Read/One)
 */
exports.getBookById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const book = await prisma.book.findUnique({ where: { id } });

    if (!book || book.isDeleted) return res.status(404).json(error('Book not found', 404));
    res.json(success(book));
  } catch (err) {
    next(err);
  }
};

/**
 * 4. 更新图书 (Update)
 * 验收标准：更新库存 (>=0)
 */
exports.updateBook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, author, stock, category } = req.body;

    if (stock !== undefined && stock < 0) {
      return res.status(400).json(error('Stock cannot be negative', 400));
    }

    const book = await prisma.book.update({
      where: { id },
      data: { title, author, stock: stock !== undefined ? parseInt(stock) : undefined, category },
    });

    res.json(success({ updated: true, stock: book.stock }, 'Book updated'));
  } catch (err) {
    next(err);
  }
};

/**
 * 5. 删除图书 (Delete - Soft)
 * 验收标准：软删除 (isDeleted=true)，保留历史借阅记录
 */
exports.deleteBook = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.book.update({
      where: { id },
      data: { isDeleted: true },
    });

    res.json(success({ deleted: true }, 'Book removed (soft delete)'));
  } catch (err) {
    next(err);
  }
};