import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Students() {
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [roll, setRoll] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    try { setList(await api.students()); } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    if (!name.trim() || !roll.trim()) return setErr('Name and roll number required.');
    try {
      await api.addStudent(name.trim(), roll.trim());
      setName(''); setRoll(''); setMsg('Student added.');
      load();
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="wrap">
      <div className="card">
        <h2>Add Student</h2>
        {err && <div className="err">{err}</div>}
        {msg && <div className="ok">{msg}</div>}
        <form onSubmit={add}>
          <div className="grid2">
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="Roll No" value={roll} onChange={(e) => setRoll(e.target.value)} />
          </div>
          <button className="btn" type="submit">Add</button>
        </form>
      </div>
      <div className="card">
        <h2>Students ({list.length})</h2>
        {list.map((s) => (
          <div className="row" key={s.id}><span><b>{s.rollNo}</b> — {s.name}</span></div>
        ))}
        {list.length === 0 && <p>No students yet.</p>}
      </div>
    </div>
  );
}
