const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const headers = () => {
  const t = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};

async function req(path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, { ...opts, headers: headers() });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  requestOtp: (phone) => req('/api/auth/request-otp', { method: 'POST', body: JSON.stringify({ phone }) }),
  verifyOtp: (phone, code) => req('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, code }) }),
  students: (date) => req(date ? `/api/students?date=${date}` : '/api/students'),
  addStudent: (name, rollNo) => req('/api/students', { method: 'POST', body: JSON.stringify({ name, rollNo }) }),
  markAttendance: (date, records) => req('/api/attendance', { method: 'POST', body: JSON.stringify({ date, records }) }),
};
