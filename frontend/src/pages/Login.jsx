import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const nav = useNavigate();

  const send = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    if (!/^\+?[0-9]{10,15}$/.test(phone.trim())) return setErr('Enter valid phone (10-15 digits).');
    try { const d = await api.requestOtp(phone.trim()); setMsg(d.message); setStep(2); }
    catch (e) { setErr(e.message); }
  };
  const verify = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    if (!/^\d{4,8}$/.test(code.trim())) return setErr('OTP must be 4-8 digits.');
    try {
      const d = await api.verifyOtp(phone.trim(), code.trim());
      localStorage.setItem('token', d.token);
      localStorage.setItem('phone', d.phone);
      nav('/students');
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="wrap">
      <div className="card">
        <h2>Login / Register via OTP</h2>
        <p style={{ color: '#64748b' }}>OTP sent by MiniMoth (WhatsApp → SMS fallback). Mock mode: use <b>123456</b>.</p>
        {err && <div className="err">{err}</div>}
        {msg && <div className="ok">{msg}</div>}
        {step === 1 ? (
          <form onSubmit={send}>
            <input placeholder="+919876543210" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button className="btn" type="submit">Send OTP</button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input placeholder="6-digit OTP" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" />
            <button className="btn" type="submit">Verify & Login</button>
            <p><a href="#" onClick={(e) => { e.preventDefault(); setStep(1); }}>Change number</a></p>
          </form>
        )}
      </div>
    </div>
  );
}
