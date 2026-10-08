// Student Attendance Tracker — backend (Node + Express)
// 5 API endpoints | 3 models: User, Student, Attendance | OTP via MiniMoth
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const MINIMOTH_API_KEY = process.env.MINIMOTH_API_KEY || '';
const MINIMOTH_BASE_URL = process.env.MINIMOTH_BASE_URL || 'https://api.minimoth.dev';

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ---------- Tiny JSON file DB (3 collections = 3 models) ----------
const DB_FILE = path.join(__dirname, 'db.json');
function loadDb() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return { users: [], students: [], attendance: [] };
  }
}
function saveDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
// Model shapes:
// User:       { phone, otp, otpExpiry, verified }
// Student:    { id, name, rollNo }
// Attendance: { id, studentId, date (YYYY-MM-DD), present (bool) }

// ---------- Helpers ----------
const isMockMode = () =>
  !MINIMOTH_API_KEY || MINIMOTH_API_KEY.includes('paste_your_key_here');

const validPhone = (p) => /^\+?[0-9]{10,15}$/.test(String(p || '').trim());
const validDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
const today = () => new Date().toISOString().slice(0, 10);

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token. Login first.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

async function minimothSend(phone) {
  // Live mode: POST /v1/otp/send  (WhatsApp first, SMS fallback)
  const r = await fetch(`${MINIMOTH_BASE_URL}/v1/otp/send`, {
    method: 'POST',
    headers: { 'X-Api-Key': MINIMOTH_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || data.error || 'MiniMoth send failed');
  return data; // { otpId / otp_id, ... }
}

async function minimothVerify(phone, code) {
  // Live mode: POST /v1/otp/verify
  const r = await fetch(`${MINIMOTH_BASE_URL}/v1/otp/verify`, {
    method: 'POST',
    headers: { 'X-Api-Key': MINIMOTH_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || data.error || 'Invalid OTP');
  return data;
}

// ---------- 1/5: POST /api/auth/request-otp (registration + login) ----------
app.post('/api/auth/request-otp', async (req, res) => {
  const { phone } = req.body || {};
  if (!validPhone(phone)) return res.status(400).json({ error: 'Enter valid phone (10-15 digits, optional +).' });
  const db = loadDb();
  const clean = String(phone).trim();

  try {
    if (isMockMode()) {
      // MOCK: fixed code so workshop works without credits
      const code = '123456';
      const existing = db.users.find((u) => u.phone === clean);
      if (existing) { existing.otp = code; existing.otpExpiry = Date.now() + 5 * 60 * 1000; }
      else db.users.push({ phone: clean, otp: code, otpExpiry: Date.now() + 5 * 60 * 1000, verified: false });
      saveDb(db);
      console.log(`[MOCK OTP] ${clean} -> ${code}`);
      return res.json({ message: 'OTP sent (mock mode: use 123456).', mock: true });
    }
    const data = await minimothSend(clean);
    let u = db.users.find((x) => x.phone === clean);
    if (!u) { u = { phone: clean, verified: false }; db.users.push(u); }
    u.otpId = data.otpId || data.otp_id || null;
    saveDb(db);
    res.json({ message: 'OTP sent via WhatsApp/SMS.', otpId: u.otpId });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// ---------- 2/5: POST /api/auth/verify-otp -> returns JWT ----------
app.post('/api/auth/verify-otp', async (req, res) => {
  const { phone, code } = req.body || {};
  if (!validPhone(phone)) return res.status(400).json({ error: 'Invalid phone.' });
  if (!/^\d{4,8}$/.test(String(code || ''))) return res.status(400).json({ error: 'OTP must be 4-8 digits.' });
  const db = loadDb();
  const clean = String(phone).trim();
  const user = db.users.find((u) => u.phone === clean);
  if (!user) return res.status(400).json({ error: 'Request an OTP first.' });

  try {
    if (isMockMode()) {
      if (user.otp !== String(code) || Date.now() > user.otpExpiry)
        return res.status(400).json({ error: 'Invalid or expired OTP. Hint (mock): 123456.' });
    } else {
      await minimothVerify(clean, String(code));
    }
    user.verified = true; user.otp = null;
    saveDb(db);
    const token = jwt.sign({ phone: clean }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, phone: clean });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---------- 3/5: GET /api/students[?date=YYYY-MM-DD] ----------
// Without ?date -> plain list. With ?date -> each student + present flag (powers attendance view).
app.get('/api/students', auth, (req, res) => {
  const db = loadDb();
  const { date } = req.query;
  if (date && !validDate(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD.' });
  if (!date) return res.json(db.students);
  const marked = new Map(db.attendance.filter((a) => a.date === date).map((a) => [String(a.studentId), a.present]));
  res.json(db.students.map((s) => ({ ...s, present: marked.has(String(s.id)) ? marked.get(String(s.id)) : null })));
});

// ---------- 4/5: POST /api/students ----------
app.post('/api/students', auth, (req, res) => {
  const { name, rollNo } = req.body || {};
  if (!String(name || '').trim() || !String(rollNo || '').trim())
    return res.status(400).json({ error: 'name and rollNo are required.' });
  const db = loadDb();
  if (db.students.some((s) => s.rollNo === String(rollNo).trim()))
    return res.status(400).json({ error: 'rollNo already exists.' });
  const s = { id: Date.now().toString(), name: String(name).trim(), rollNo: String(rollNo).trim() };
  db.students.push(s);
  saveDb(db);
  res.status(201).json(s);
});

// ---------- 5/5: POST /api/attendance { date, records: [{studentId, present}] } ----------
app.post('/api/attendance', auth, (req, res) => {
  const { date = today(), records } = req.body || {};
  if (!validDate(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD.' });
  if (!Array.isArray(records) || records.length === 0)
    return res.status(400).json({ error: 'records must be a non-empty array.' });
  const db = loadDb();
  const ids = new Set(db.students.map((s) => String(s.id)));
  for (const r of records) {
    if (!ids.has(String(r.studentId))) return res.status(400).json({ error: `Unknown studentId: ${r.studentId}` });
    if (typeof r.present !== 'boolean') return res.status(400).json({ error: 'present must be boolean.' });
  }
  // Upsert per (studentId, date)
  db.attendance = db.attendance.filter((a) => a.date !== date || !records.some((r) => String(r.studentId) === String(a.studentId)));
  for (const r of records)
    db.attendance.push({ id: `${date}-${r.studentId}`, studentId: String(r.studentId), date, present: r.present });
  saveDb(db);
  const present = records.filter((r) => r.present).length;
  res.json({ date, total: records.length, present, absent: records.length - present });
});

app.get('/api/health', (req, res) => res.json({ ok: true, mock: isMockMode(), time: new Date().toISOString() }));

app.listen(PORT, () => console.log(`Backend on http://localhost:${PORT} (mock OTP: ${isMockMode()})`));
