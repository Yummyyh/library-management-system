// frontend/src/lib/api.js
const ADMIN_API_BASE = 'http://localhost:3001/api/admin';
const STUDENT_API_BASE = 'http://localhost:3001/api/student';
const LIB_API_BASE = 'http://localhost:3001/api/librarian';

const getStudentToken = () => localStorage.getItem('student_token');
const getAdminToken = () => localStorage.getItem('admin_token');
const getLibToken = () => localStorage.getItem('librarian_token');

// 🔹 [Phase 1.3] 全局 401/403 拦截
export const request = async (base, endpoint, options = {}) => {
  const url = `${base}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  try {
    const res = await fetch(url, { ...options, headers });
    if (res.status === 204 || res.headers.get('content-length') === '0') return null;
    
    const json = await res.json();
    if (!res.ok) {
      // 仅当请求携带了 Token 时，才把 401/403 视为会话失效（登录接口本身也会返回 401）
      const hadAuth = Boolean(options.headers?.Authorization);
      if ((res.status === 401 || res.status === 403) && hadAuth) {
        ['admin_token', 'librarian_token', 'student_token', 'student_info'].forEach(k => localStorage.removeItem(k));
        window.location.href = '/login';
        throw new Error('Session expired. Redirecting...');
      }
      throw new Error(json.msg || `Request failed: ${res.status}`);
    }
    return json.data;
  } catch (err) {
    console.error('API Error:', err.message);
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
    headers: { Authorization: `Bearer ${getAdminToken() || ''}` }
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