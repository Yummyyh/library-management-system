export const studentSession = {
  getToken: () => localStorage.getItem('student_token'),
  setToken: (token) => localStorage.setItem('student_token', token),
  clear: () => {
    localStorage.removeItem('student_token');
    localStorage.removeItem('student_info');
  },
  getStudent: () => {
    try {
      const raw = localStorage.getItem('student_info');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setStudent: (student) => localStorage.setItem('student_info', JSON.stringify(student)),
};

