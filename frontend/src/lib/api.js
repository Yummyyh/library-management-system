// frontend/src/lib/api.js
const ADMIN_API_BASE = 'http://localhost:3001/api/admin';
const STUDENT_API_BASE = 'http://localhost:3001/api/student';

const getStudentToken = () => localStorage.getItem('student_token');

export const request = async (base, endpoint, options = {}) => {
  const url = `${base}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  try {
    const res = await fetch(url, { ...options, headers });
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.msg || `Request failed: ${res.status}`);
    }

    return json.data;
  } catch (err) {
    console.error('API Error:', err.message);
    throw err;
  }
};

export const userAPI = {
  list: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(ADMIN_API_BASE, `/users?${qs}`);
  },
  create: (data) => request(ADMIN_API_BASE, '/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(ADMIN_API_BASE, `/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deactivate: (id) => request(ADMIN_API_BASE, `/users/${id}`, { method: 'DELETE' }),
};

export const bookAPI = {
  list: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(ADMIN_API_BASE, `/books?${qs}`);
  },
  create: (data) => request(ADMIN_API_BASE, '/books', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(ADMIN_API_BASE, `/books/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(ADMIN_API_BASE, `/books/${id}`, { method: 'DELETE' }),
};

export const studentAuthAPI = {
  register: (data) =>
    request(STUDENT_API_BASE, '/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) =>
    request(STUDENT_API_BASE, '/auth/login', { method: 'POST', body: JSON.stringify(data) }),
};

export const studentBookAPI = {
  search: (q) => {
    const qs = new URLSearchParams({ q }).toString();
    return request(STUDENT_API_BASE, `/books/search?${qs}`);
  },
  borrow: (bookId) =>
    request(STUDENT_API_BASE, `/books/${bookId}/borrow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getStudentToken() || ''}` },
    }),
};