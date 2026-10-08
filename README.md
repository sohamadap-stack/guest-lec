# Student Attendance Tracker (45-min workshop)

Very small full-stack: **React (Vite) + Node (Express) + MiniMoth OTP**. Limits respected: **3 pages, 5 APIs, 3 models**.

## Scope
- **Pages (3):** `/` Login (OTP) · `/students` Students · `/attendance` Mark/View
- **APIs (5):** `POST /api/auth/request-otp` · `POST /api/auth/verify-otp` · `GET /api/students[?date=]` · `POST /api/students` · `POST /api/attendance`
- **Models (3):** `User {phone, otp, otpExpiry}` · `Student {id, name, rollNo}` · `Attendance {studentId, date, present}` (stored in `backend/db.json`)

## Setup (5 min)
```bash
npm run install:all        # install backend + frontend
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# edit backend/.env → set MINIMOTH_API_KEY=mm_live_... (or leave placeholder for MOCK mode: OTP 123456)
npm run dev:backend         # http://localhost:5001
npm run dev:frontend        # http://localhost:5173 (in another terminal)
```

## MiniMoth OTP
- Key loaded from `backend/.env` (`MINIMOTH_API_KEY`), sent as `X-Api-Key` header.
- Live: `POST https://api.minimoth.dev/v1/otp/send {phone}` → WhatsApp first, SMS fallback; `POST /v1/otp/verify {phone, code}`.
- Mock (no key): server logs OTP, accept `123456`. Check `GET /api/health → {mock:true/false}`.

## Validation & errors
- Phone `^\+?[0-9]{10,15}$`, OTP 4–8 digits, name/rollNo non-empty + unique rollNo, date `YYYY-MM-DD`, attendance `records` non-empty with known studentIds + boolean `present`. All failures return `400 {error}`; auth failures `401`; MiniMoth failures `502`.
