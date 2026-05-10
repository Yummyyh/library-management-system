// backend/src/controllers/externalController.js
const { success, error } = require('../utils/response');
const axios = require('axios'); // ✅ 新增：使用项目已有的 axios

// 内存缓存：10分钟TTL
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

exports.getBookByISBN = async (req, res, next) => {
  try {
    const { isbn } = req.params;
    const cleanISBN = isbn.replace(/[-\s]/g, '');

    if (!/^\d{10}$|^\d{13}$/.test(cleanISBN)) {
      return res.status(400).json(error('Invalid ISBN format', 400));
    }

    // 检查缓存
    const cached = cache.get(cleanISBN);
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      return res.json(success(cached.data, 'Book metadata retrieved from cache'));
    }

    // ✅ 改用 axios 调用 OpenLibrary API（8秒超时）
    const url = `https://openlibrary.org/api/volumes/brief/isbn/${cleanISBN}.json`;
    const response = await axios.get(url, { timeout: 15000 });

    // ✅ 修复：API 返回结构是 `records` 不是 `items`
    if (!response.data || !response.data.records) {
      return res.status(404).json(error('Book not found', 404));
    }

    // 取第一个 record（records 是对象，需转数组）
    const records = Object.values(response.data.records);
    if (records.length === 0) {
      return res.status(404).json(error('Book not found', 404));
    }

    const record = records[0];
    const bookData = record.data || {};

    // ✅ 修复：authors 提取（兼容字符串数组或对象数组）
    const authors = bookData.authors
      ? bookData.authors.map(a => typeof a === 'string' ? a : a.name).filter(Boolean).join(', ')
      : '';

    // ✅ 修复：publishers 提取（兼容字符串数组或对象数组）
    const publishers = bookData.publishers
      ? bookData.publishers.map(p => typeof p === 'string' ? p : p.name).filter(Boolean).join(', ')
      : '';

    // 提取出版年份
    let publishYear = '';
    if (record.publishDates && record.publishDates.length > 0) {
      const yearMatch = record.publishDates[0].match(/\d{4}/);
      if (yearMatch) publishYear = yearMatch[0];
    }

    // 提取描述
    let description = '';
    if (bookData.descriptions && bookData.descriptions.length > 0) {
      const desc = bookData.descriptions[0];
      description = typeof desc === 'string' ? desc : (desc.value || '');
    }

    // ✅ 修复：language 简单映射
    const langCode = bookData.languages?.[0] || '';
    const languageMap = { eng: 'English', chi: 'Chinese', zho: 'Chinese', jpn: 'Japanese' };
    const language = languageMap[langCode.toLowerCase()] || langCode || 'English';

    const result = {
      title: bookData.title || '',
      author: authors,
      publisher: publishers,
      publishYear: publishYear,
      language: language,
      description: description,
      coverImage: record.thumbnail_url || ''
    };

    // 存入缓存
    cache.set(cleanISBN, { data: result, time: Date.now() });

    res.json(success(result, 'Book metadata retrieved successfully'));

} catch (err) {
    // 🔥 调试：打印完整错误堆栈
    console.error('🔍 ISBN API Error:', {
      message: err.message,
      code: err.code,
      status: err.response?.status,
      data: err.response?.data,
      config: {
        url: err.config?.url,
        method: err.config?.method,
        timeout: err.config?.timeout
      },
      stack: err.stack
    });
  
    // ✅ axios 超时
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
      return res.status(504).json(error('Request timeout', 504));
    }
    // ✅ axios 404
    if (err.response?.status === 404) {
      return res.status(404).json(error('Book not found', 404));
    }
    // ✅ 网络不可达
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      return res.status(502).json(error(`External API unreachable`, 502));
    }
    // ✅ axios 其他 HTTP 错误（如 429, 500）
    if (err.response?.status) {
      return res.status(502).json(error(`External API returned ${err.response.status}`, 502));
    }
    next(err);
  }

};
