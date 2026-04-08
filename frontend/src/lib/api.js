// frontend/src/lib/api.js
const API_BASE = 'http://localhost:3001/api/admin';

export const request = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
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
    return request(`/users?${qs}`);
  },
  create: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deactivate: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};

export const bookAPI = {
  list: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/books?${qs}`);
  },
  create: (data) => request('/books', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/books/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/books/${id}`, { method: 'DELETE' }),
};