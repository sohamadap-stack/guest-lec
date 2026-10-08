import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Students from './pages/Students';
import Attendance from './pages/Attendance';
import './styles.css';

const authed = () => !!localStorage.getItem('token');
const Guard = ({ children }) => (authed() ? children : <Navigate to="/" replace />);

function Nav() {
  const loc = useLocation();
  const nav = useNavigate();
  if (loc.pathname === '/') return null;
  return (
    <div className="nav">
      <b>Attendance</b>
      <Link to="/students" className={loc.pathname === '/students' ? 'active' : ''}>Students</Link>
      <Link to="/attendance" className={loc.pathname === '/attendance' ? 'active' : ''}>Attendance</Link>
      <button onClick={() => { localStorage.clear(); nav('/'); }}>Logout</button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/students" element={<Guard><Students /></Guard>} />
        <Route path="/attendance" element={<Guard><Attendance /></Guard>} />
      </Routes>
    </BrowserRouter>
  );
}
