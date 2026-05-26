// backend/src/controllers/configController.js
const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');
// =======================================
// Feature 9: System Configuration
// Purpose: Configuration Audit Logging
// Impact: Settings module only
// =======================================
const { appendAuditRecord, getLatestAuditRecords } = require('../utils/configAuditLog');
const { resolveConfigAuditUser } = require('../utils/resolveConfigAuditUser');

const prisma = new PrismaClient();

const ALLOWED_KEYS = [
  'SYSTEM_NAME',
  'LANGUAGE',
  'TIMEZONE',
  'BORROW_LIMIT',
  'BORROW_DAYS',
  'DAILY_FINE',
];

/**
 * GET /api/config
 * Return all supported configuration items.
 */
exports.getAllConfigs = async (req, res, next) => {
  try {
    const rows = await prisma.config.findMany({
      where: { key: { in: ALLOWED_KEYS } },
      select: { key: true, value: true },
    });

    const valueByKey = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    const list = ALLOWED_KEYS.map((key) => ({
      key,
      value: valueByKey[key] ?? null,
    }));

    res.json(success({ list }, 'Configuration retrieved'));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/config/audit
 * Return the latest configuration change records (newest first).
 */
exports.getConfigAuditLog = async (req, res, next) => {
  try {
    const list = await getLatestAuditRecords(20);
    res.json(success({ list }, 'Configuration audit log retrieved'));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/config/:key
 * Update a single configuration value (upsert for supported keys).
 */
exports.updateConfig = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!ALLOWED_KEYS.includes(key)) {
      return res.status(400).json(error(`Unsupported configuration key: ${key}`, 400));
    }

    if (value === undefined || value === null || String(value).trim() === '') {
      return res.status(400).json(error('Configuration value cannot be empty', 400));
    }

    const normalizedValue = String(value).trim();

    const existing = await prisma.config.findUnique({
      where: { key },
      select: { value: true },
    });
    const oldValue = existing?.value ?? '';

    const updated = await prisma.config.upsert({
      where: { key },
      update: { value: normalizedValue },
      create: { key, value: normalizedValue },
    });

    // =======================================
    // Feature 9: System Configuration
    // Purpose: Configuration Audit Logging
    // Impact: Settings module only
    // =======================================
    if (oldValue !== normalizedValue) {
      const auditUser = await resolveConfigAuditUser(req, prisma);
      await appendAuditRecord({
        timestamp: new Date().toISOString(),
        user: auditUser,
        configKey: key,
        oldValue,
        newValue: normalizedValue,
      });
    }

    res.json(success({ key: updated.key, value: updated.value }, 'Configuration updated'));
  } catch (err) {
    next(err);
  }
};
