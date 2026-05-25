// =======================================
// Feature 9: System Configuration
// Purpose: Configuration Audit Logging
// Impact: Settings module only
// =======================================

function decodeJwtPayload(token) {
  try {
    const part = String(token).split('.')[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

async function lookupAdminIdentity(prisma, userId) {
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, studentId: true, email: true, role: true },
  });

  if (!user || user.role !== 'ADMIN') return null;
  return user.studentId || user.email || user.id;
}

function identityFromUserObject(user) {
  if (!user || typeof user !== 'object') return null;
  return user.studentId || user.email || user.id || user.name || null;
}

function identityFromTokenPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.role && payload.role !== 'ADMIN') return null;
  return payload.studentId || payload.email || payload.id || payload.name || null;
}

/**
 * Resolve the administrator identity for audit records.
 * Priority: req.user -> Bearer JWT payload -> X-Admin-User header -> "Admin"
 */
async function resolveConfigAuditUser(req, prisma) {
  const fromReqUser = identityFromUserObject(req.user);
  if (fromReqUser) {
    const lookedUp = await lookupAdminIdentity(prisma, req.user.id);
    return lookedUp || String(fromReqUser);
  }

  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (token) {
    const payload = decodeJwtPayload(token);
    if (payload?.id) {
      const lookedUp = await lookupAdminIdentity(prisma, payload.id);
      if (lookedUp) return lookedUp;
    }
    const fromPayload = identityFromTokenPayload(payload);
    if (fromPayload) return String(fromPayload);
  }

  const adminHeader = req.headers['x-admin-user'];
  if (adminHeader && String(adminHeader).trim()) {
    return String(adminHeader).trim();
  }

  return 'Admin';
}

module.exports = {
  resolveConfigAuditUser,
};
