// backend/src/controllers/bookController.js
const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');
const prisma = new PrismaClient();

/**
 * 1. 创建图书 (Create)
 * 验收标准：校验必填、ISBN 格式、copyCount >= 1
 * 核心逻辑：
 *   - 若同 ISBN 记录已软删除 → 恢复并更新元数据 + 重新生成条形码
 *   - 若同 ISBN 记录未删除 → 返回 409 冲突
 *   - 若不存在 → 创建新书 + 批量生成条形码
 *   - ISBN 统一存纯数字，与条形码前缀一致
 */
exports.createBook = async (req, res, next) => {
  try {
    const {
      title, author, isbn, genre,
      description = "No description provided",
      language = "English",
      shelfLocation = "Unassigned",
      category,
      copyCount = 1
    } = req.body;

    // 必填校验
    if (!title || !author || !isbn || !genre) {
      return res.status(400).json(error('Missing required fields: title, author, isbn, genre', 400));
    }
    if (copyCount < 1) {
      return res.status(400).json(error('Copy count must be at least 1', 400));
    }

    // ✅ 统一 ISBN 格式（移除连字符），与 seed/条形码前缀保持一致
    const isbnClean = isbn.replace(/-/g, '');
    if (!/^\d{10}$|^\d{13}$/.test(isbnClean)) {
      return res.status(400).json(error('Invalid ISBN format', 400));
    }

    // ✅ 修复：检查是否存在同 ISBN 的记录（无论是否软删除）
    const existingBook = await prisma.book.findUnique({
      where: { isbn: isbnClean },
    });

    if (existingBook) {
      if (existingBook.isDeleted) {
        // 🔄 情况1：书已软删除 → 恢复并更新
        const restored = await prisma.book.update({
          where: { id: existingBook.id },
          data: {
            title, author, genre, description, language,
            shelfLocation, category, isDeleted: false
          }
        });
        
        // 事务内：删除旧条形码 + 创建新条形码
        await prisma.$transaction(async (tx) => {
          await tx.barcode.deleteMany({ where: { bookId: restored.id } });
          const barcodes = Array.from({ length: copyCount }, (_, i) => ({
            barcode: `${isbnClean}-${String(i + 1).padStart(3, '0')}`,
            bookId: restored.id,
            status: 'AVAILABLE'
          }));
          await tx.barcode.createMany({ data: barcodes });
        });
        
        return res.status(200).json(
          success({ id: restored.id, copyCount, restored: true }, 'Book restored and updated', 200)
        );
      } else {
        // ❌ 情况2：书已存在且未删除 → 返回冲突
        return res.status(409).json(error('ISBN already exists', 409));
      }
    }

    // ✅ 情况3：全新创建 → 事务内创建 Book + Barcodes
    const result = await prisma.$transaction(async (tx) => {
      const book = await tx.book.create({
        data: {
          title, author,
          isbn: isbnClean,  // ✅ 关键：存纯数字
          genre, description, language, shelfLocation,
          category, isDeleted: false
        },
      });

      const barcodes = Array.from({ length: copyCount }, (_, i) => ({
        barcode: `${isbnClean}-${String(i + 1).padStart(3, '0')}`,
        bookId: book.id,
        status: 'AVAILABLE'
      }));

      await tx.barcode.createMany({ data: barcodes });
      return book;
    });

    res.status(201).json(success({ id: result.id, copyCount }, 'Book created', 201));
  } catch (err) {
    next(err);
  }
};

/**
 * 2. 获取图书列表 (Read/List)
 * 验收标准：关键词搜索、分页、隐藏已删除、返回 availableCount
 */
exports.listBooks = async (req, res, next) => {
  try {
    const { page = 1, size = 10, keyword } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(size);
    const take = parseInt(size);

    const where = { isDeleted: false }; // ✅ 默认过滤已删除
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { author: { contains: keyword } },
        { isbn: { contains: keyword } },
      ];
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { barcodes: true } // 加载条形码用于计算可用数
      }),
      prisma.book.count({ where }),
    ]);

    // ✅ 修复：内存计算 availableCount，移除冗余 barcodes 字段
    const list = books.map(b => ({
      ...b,
      availableCount: b.barcodes.filter(bc => bc.status === 'AVAILABLE').length,
      barcodes: undefined // 清理明细，避免前端误用
    }));

    res.json(success({ list, total }, 'Books retrieved'));
  } catch (err) {
    next(err);
  }
};

/**
 * 3. 获取图书详情 (Read/One)
 * ✅ 修复：返回 barcodes 数组供前端"查看条形码"弹窗使用
 */
exports.getBookById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const book = await prisma.book.findUnique({
      where: { id },
      include: { barcodes: true } // ✅ 关键：包含条形码数据
    });

    if (!book || book.isDeleted) {
      return res.status(404).json(error('Book not found', 404));
    }

    // 计算可用数量
    const availableCount = book.barcodes.filter(bc => bc.status === 'AVAILABLE').length;

    // ✅ 修复：返回 barcodes 数组（不删除），供前端弹窗显示
    res.json(success({ ...book, availableCount }));
  } catch (err) {
    next(err);
  }
};

/**
 * 4. 更新图书 (Update)
 * 验收标准：仅更新元数据，不涉及库存/条形码
 */
exports.updateBook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, author, category, genre, description, language, shelfLocation } = req.body;

    // ✅ 修复：移除 stock 更新逻辑，仅更新元数据字段
    const book = await prisma.book.update({
      where: { id },
      data: {
        title, author, category, genre, description, language, shelfLocation
        // ⚠️ 注意：ISBN 不允许更新（唯一约束），barcode 需单独管理
      },
    });

    res.json(success({ updated: true }, 'Book updated'));
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