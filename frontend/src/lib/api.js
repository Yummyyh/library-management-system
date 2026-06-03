// frontend/src/lib/api.js

// [修改] 统一 API 根地址，避免各模块硬编码 localhost
const API_ORIGIN = 'http://localhost:3001';
const ADMIN_API_BASE = `${API_ORIGIN}/api/admin`;
// [修改] Settings 页使用的系统配置接口基址
const CONFIG_API_BASE = `${API_ORIGIN}/api/config`;
const STUDENT_API_BASE = `${API_ORIGIN}/api/student`;
const LIB_API_BASE = `${API_ORIGIN}/api/librarian`;

const getStudentToken = () => localStorage.getItem('student_token');
const getAdminToken = () => localStorage.getItem('admin_token');
const getLibToken = () => localStorage.getItem('librarian_token');

// [修改] 按 URL 前缀映射角色与 localStorage key，401 时只清当前角色，避免误删其他端 token
const ROLE_BY_URL_PREFIX = [
  { prefix: '/api/admin', tokenKey: 'admin_token', extraKeys: [] },
  { prefix: '/api/config', tokenKey: 'admin_token', extraKeys: [] },
  { prefix: '/api/librarian', tokenKey: 'librarian_token', extraKeys: [] },
  { prefix: '/api/student', tokenKey: 'student_token', extraKeys: ['student_info'] },
];

// [修改] 判断本次请求是否携带了 Bearer，用于区分「未登录」与「token 失效」
const bearerToken = (headers = {}) => {
  const auth = headers.Authorization || headers.authorization;
  if (!auth || typeof auth !== 'string') return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

// [修改] 根据请求 URL 解析应清除的 localStorage 键
const roleKeysForUrl = (url) => {
  const path = url.includes('://') ? new URL(url).pathname : url;
  const match = ROLE_BY_URL_PREFIX.find(({ prefix }) => path.startsWith(prefix));
  if (!match) return null;
  return [match.tokenKey, ...match.extraKeys];
};

// [修改] 仅清除与当前 API 路径对应角色的 session，不再清空全部 token
const clearRoleSession = (url) => {
  const keys = roleKeysForUrl(url);
  if (!keys) return;
  keys.forEach((key) => localStorage.removeItem(key));
};

// [修改] 管理员请求统一带头；无 token 时不伪造 Authorization，避免 401 被当成「已登录但过期」
const adminAuthHeaders = () => {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const libAuthHeaders = () => {
  const token = getLibToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const studentAuthHeaders = () => {
  const token = getStudentToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * [修改] 全局 fetch 封装
 * - 401 且本次带了 token：只清对应角色 token，可选跳转 /login（修复 Settings 误踢全站登录）
 * - 401 但未带 token：仅抛错，不跳转（例如漏传 Authorization 的配置接口）
 * - 403：权限不足，不清 token、不跳转
 * @param {RequestInit & { skipAuthRedirect?: boolean }} options skipAuthRedirect=true 时只清 token 不跳转
 */
export const request = async (base, endpoint, options = {}) => {
  const { skipAuthRedirect = false, ...fetchOptions } = options;
  const url = `${base}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...fetchOptions.headers };
  const sentToken = bearerToken(headers);

  try {
    const res = await fetch(url, { ...fetchOptions, headers });
    if (res.status === 204 || res.headers.get('content-length') === '0') return null;

    const json = await res.json();
    if (!res.ok) {
      // [修改] 仅在「曾发送有效 Bearer」时视为 session 失效，避免 /api/config/audit 无 token 时误删 admin_token
      if (res.status === 401 && sentToken) {
        clearRoleSession(url);
        if (!skipAuthRedirect) {
          window.location.href = '/login';
        }
        throw new Error(json.msg || 'Session expired. Please sign in again.');
      }
      if (res.status === 401) {
        throw new Error(json.msg || 'Unauthorized');
      }
      // [修改] 403 不再触发全局登出（原先 401/403 会清空所有角色 token）
      if (res.status === 403) {
        throw new Error(json.msg || 'Forbidden');
      }
      throw new Error(json.msg || `Request failed: ${res.status}`);
    }
    return json.data;
  } catch (err) {
    if (!(err instanceof Error && err.message.includes('Session expired'))) {
      console.error('API Error:', url, err.message);
    }
    throw err;
  }
};

// 🔐 管理员 API
export const userAPI = {
  list: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(ADMIN_API_BASE, `/users?${qs}`, {
      headers: { Authorization: `Bearer ${getAdminToken() || ''}` }
    });
  },
  create: (data) => request(ADMIN_API_BASE, '/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getAdminToken() || ''}` },
    body: JSON.stringify(data)
  }),
  update: (id, data) => request(ADMIN_API_BASE, `/users/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${getAdminToken() || ''}` },
    body: JSON.stringify(data)
  }),
  deactivate: (id) => request(ADMIN_API_BASE, `/users/${id}`, {
    method: 'DELETE',
    headers: adminAuthHeaders(),
  }),
};

// [修改] 新增 configAPI：Settings 页此前 import 了但未定义；并统一携带 admin_token
export const configAPI = {
  /** GET /api/config — 加载系统配置表单 */
  getAll: () =>
    request(CONFIG_API_BASE, '', { headers: adminAuthHeaders() }),
  /** GET /api/config/audit — 配置变更审计日志 */
  getAuditLog: () =>
    request(CONFIG_API_BASE, '/audit', { headers: adminAuthHeaders() }),
  /** PUT /api/config/:key — 保存单项配置 */
  update: (key, value) =>
    request(CONFIG_API_BASE, `/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: adminAuthHeaders(),
      body: JSON.stringify({ value }),
    }),
};

// 🎓 学生 API
export const studentAuthAPI = {
  register: (data) => request(STUDENT_API_BASE, '/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request(STUDENT_API_BASE, '/auth/login', { method: 'POST', body: JSON.stringify(data) }),
};

export const studentBookAPI = {
  /** 分页浏览书库；q 为空则返回全部（分页） */
  listCatalog: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.page != null) qs.set('page', String(params.page));
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.q) qs.set('q', params.q);
    const tail = qs.toString() ? `?${qs.toString()}` : '';
    return request(STUDENT_API_BASE, `/books${tail}`);
  },
  search: (q) => {
    const qs = new URLSearchParams({ q }).toString();
    return request(STUDENT_API_BASE, `/books/search?${qs}`);
  },
  /** GET /api/student/books/:id — catalog book detail */
  getById: (bookId) =>
    request(STUDENT_API_BASE, `/books/${encodeURIComponent(bookId)}`),
  borrow: (bookId) => request(STUDENT_API_BASE, `/books/${bookId}/borrow`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getStudentToken() || ''}` },
  }),
  myLoans: (status = 'all') => {
    const qs = status && status !== 'all'
      ? `?${new URLSearchParams({ status }).toString()}`
      : '';
    return request(STUDENT_API_BASE, `/books/my-loans${qs}`, {
      headers: { Authorization: `Bearer ${getStudentToken() || ''}` },
    });
  },
  renew: (loanId) => request(STUDENT_API_BASE, `/loans/${loanId}/renew`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getStudentToken() || ''}` },
  }),

  // 查询罚款记录
  fines: (status = 'all') => {
    const qs = status && status !== 'all'
      ? `?${new URLSearchParams({ status }).toString()}`
      : '';
    return request(STUDENT_API_BASE, `/books/fine${qs}`, {
      headers: { Authorization: `Bearer ${getStudentToken() || ''}` },
    });
  },
  // 缴纳罚款
  payFine: (fineId) => {
    return request(STUDENT_API_BASE, `/books/fine/${fineId}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getStudentToken() || ''}` },
    });
  },

};

// 📬 学生通知 API
export const studentNotificationAPI = {
  getNotifications: () => request(STUDENT_API_BASE, '/notifications', {
    headers: { Authorization: `Bearer ${getStudentToken() || ''}` },
  }),
  clearNotifications: () => request(STUDENT_API_BASE, '/notifications', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getStudentToken() || ''}` },
  }),
  markAsRead: (id) => request(STUDENT_API_BASE, `/notifications/${id}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${getStudentToken() || ''}` },
  }),
};

// 📌 学生预约 API
export const studentHoldAPI = {
  create: (bookId) => request(STUDENT_API_BASE, '/holds', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getStudentToken() || ''}` },
    body: JSON.stringify({ bookId }),
  }),
  list: () => request(STUDENT_API_BASE, '/holds', {
    headers: { Authorization: `Bearer ${getStudentToken() || ''}` },
  }),
  cancel: (id) => request(STUDENT_API_BASE, `/holds/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getStudentToken() || ''}` },
  }),
};

// 📌 管理员预约 API
export const librarianHoldAPI = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(LIB_API_BASE, `/holds${qs ? '?' + qs : ''}`);
  },
  markReady: (id) => request(LIB_API_BASE, `/holds/${id}/ready`, { method: 'PUT' }),
  cancel: (id) => request(LIB_API_BASE, `/holds/${id}/cancel`, { method: 'PUT' }),
};

/** GET /api/librarian/books/:id — librarian book detail (auth required) */
export const librarianBookAPI = {
  getById: (bookId) =>
    request(LIB_API_BASE, `/books/${encodeURIComponent(bookId)}`, {
      headers: { Authorization: `Bearer ${getLibToken() || ''}` },
    }),
};

// 📖 馆员 API
// 🔹 [P1] 修改：统一封装馆员接口，自动携带 Token 并走统一 request 错误处理
export const librarianAPI = {
  students: () => request(LIB_API_BASE, '/students', {
    headers: { Authorization: `Bearer ${getLibToken() || ''}` }
  }),
  checkout: (data) => request(LIB_API_BASE, '/checkout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getLibToken() || ''}` },
    body: JSON.stringify(data)
  }),
  return: (data) => request(LIB_API_BASE, '/return', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getLibToken() || ''}` },
    body: JSON.stringify(data)
  }),
  overdueList: () =>
    request(LIB_API_BASE, '/overdue', {
      headers: { Authorization: `Bearer ${getLibToken() || ''}` },
    }),
  sendOverdueReminders: (loanIds = []) =>
    request(LIB_API_BASE, '/overdue/remind', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getLibToken() || ''}` },
      body: JSON.stringify({ loanIds }),
    }),
};

export const adminAuthAPI = {
  login: (data) => request('http://localhost:3001', '/api/admin/auth/login', {
    method: 'POST', body: JSON.stringify(data)
  }),
};

export const librarianAuthAPI = {
  login: (data) => request(LIB_API_BASE, '/auth/login', {
    method: 'POST', body: JSON.stringify(data)
  }),
};
