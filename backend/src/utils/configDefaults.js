// backend/src/utils/configDefaults.js

const CONFIG_DEFAULTS = {
  SYSTEM_NAME: 'Library Management System',
  LANGUAGE: 'English',
  TIMEZONE: 'UTC+8',
  BORROW_LIMIT: '5',
  BORROW_DAYS: '14',
  DAILY_FINE: '0.5',
};

function isEmptyConfigValue(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

/**
 * Ensure default config rows exist without duplicating or overwriting non-empty values.
 * - Missing key → create with default
 * - Empty value → update to default
 * - Non-empty value → leave unchanged
 */
async function ensureConfigDefaults(prisma) {
  for (const [key, defaultValue] of Object.entries(CONFIG_DEFAULTS)) {
    const existing = await prisma.config.findUnique({ where: { key } });

    if (!existing) {
      await prisma.config.create({ data: { key, value: defaultValue } });
    } else if (isEmptyConfigValue(existing.value)) {
      await prisma.config.update({ where: { key }, data: { value: defaultValue } });
    }
  }
}

module.exports = {
  CONFIG_DEFAULTS,
  isEmptyConfigValue,
  ensureConfigDefaults,
};
