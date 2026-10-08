import { useEffect, useState } from 'react';
import { api } from '../api';

const today = () => new Date().toISOString().slice(0, 10);

export default function Attendance() {
  const [date, setDate] = useState(today());
  const [list, setList] = useState([]);
  const [state, setState] = useState({}); // id -> true/false
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = async (d) => {
    setErr(''); setMsg('');
    try {
      const rows = await api.students(d);
      setList(rows);
      const m = {};
      rows.forEach((r) => { m[r.id] = r.present === null ? true : r.present; });
      setState(m);
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(date); }, [date]);

  const save = async () => {
    setErr(''); setMsg('');
    try {
      const records = list.map((s) => ({ studentId: s.id, present: !!state[s.id] }));
      const d = await api.markAttendance(date, records);
      setMsg(`${d.date}: ${d.present}/${d.total} present.`);
      load(date);
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="wrap">
      <div className="card">
        <h2>Mark Attendance</h2>
        {err && <div className="err">{err}</div>}
        {msg && <div className="ok">{msg}</div>}
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        {list.map((s) => (
          <div className="row" key={s.id}>
            <span><b>{s.rollNo}</b> — {s.name}</span>
            <div className="toggle">
              <button className={state[s.id] ? 'on-p' : ''} onClick={() => setState({ ...state, [s.id]: true })}>P</button>
              <button className={!state[s.id] ? 'on-a' : ''} onClick={() => setState({ ...state, [s.id]: false })}>A</button>
            </div>
          </div>
        ))}
        {list.length === 0 && <p>No students. Add them first.</p>}
        {list.length > 0 && <button className="btn" onClick={save} style={{ marginTop: 12 }}>Save {date}</button>}
      </div>
    </div>
  );
}
