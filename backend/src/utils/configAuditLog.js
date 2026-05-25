// =======================================
// Feature 9: System Configuration
// Purpose: Configuration Audit Logging
// Impact: Settings module only
// =======================================

const fs = require('fs').promises;
const path = require('path');

const AUDIT_FILE = path.join(__dirname, '../../logs/config-audit.json');
const AUDIT_TMP = `${AUDIT_FILE}.tmp`;

/** Serialize writes so concurrent PUTs cannot interleave partial JSON. */
let writeQueue = Promise.resolve();

function queueWrite(task) {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => {});
  return next;
}

async function ensureAuditFile() {
  const dir = path.dirname(AUDIT_FILE);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(AUDIT_FILE);
  } catch {
    await writeAuditRecords([]);
  }
}

function normalizeRecords(parsed) {
  return Array.isArray(parsed) ? parsed : [];
}

async function readAuditRecords() {
  await ensureAuditFile();

  let raw;
  try {
    raw = await fs.readFile(AUDIT_FILE, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }

  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    return normalizeRecords(JSON.parse(trimmed));
  } catch (parseErr) {
    const backupPath = `${AUDIT_FILE}.corrupt-${Date.now()}.bak`;
    await fs.writeFile(backupPath, raw, 'utf8');
    console.warn(
      `[configAuditLog] Malformed audit JSON backed up to ${backupPath}:`,
      parseErr.message
    );
    await writeAuditRecords([]);
    return [];
  }
}

async function writeAuditRecords(records) {
  const payload = `${JSON.stringify(records, null, 2)}\n`;
  await fs.writeFile(AUDIT_TMP, payload, 'utf8');
  await fs.rename(AUDIT_TMP, AUDIT_FILE);
}

async function appendAuditRecord(record) {
  return queueWrite(async () => {
    const records = await readAuditRecords();
    records.push(record);
    await writeAuditRecords(records);
  });
}

async function getLatestAuditRecords(limit = 20) {
  const records = await readAuditRecords();
  return records
    .slice()
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

module.exports = {
  appendAuditRecord,
  getLatestAuditRecords,
};
