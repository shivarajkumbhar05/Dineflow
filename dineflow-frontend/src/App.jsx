import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { PageLoader } from './components/ui';
import StaffLayout from './components/StaffLayout';
import Landing from './pages/Landing';
import { Login, Register } from './pages/Auth';
import Dashboard from './pages/staff/Dashboard';
import Kitchen from './pages/staff/Kitchen';
import Floor from './pages/staff/Floor';
import Tables from './pages/staff/Tables';
import MenuManager from './pages/staff/MenuManager';
import Billing from './pages/staff/Billing';
import Team from './pages/staff/Team';
import Settings from './pages/staff/Settings';
import Menu from './pages/customer/Menu';
import Track from './pages/customer/Track';
import { ROLE_HOME } from './lib/format';

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role] || '/app'} replace />;
  return children;
}

const Gate = ({ roles, children }) => <Protected roles={roles}>{children}</Protected>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Customer QR flow: /r/<slug>?t=<qrToken> (matches the backend qrUrl) */}
      <Route path="/r/:slug" element={<Menu />} />
      <Route path="/r/:slug/track/:code" element={<Track />} />

      <Route path="/app" element={<Protected><StaffLayout /></Protected>}>
        <Route index element={<Gate roles={['owner', 'manager']}><Dashboard /></Gate>} />
        <Route path="kitchen" element={<Gate roles={['owner', 'manager', 'kitchen']}><Kitchen /></Gate>} />
        <Route path="floor" element={<Gate roles={['owner', 'manager', 'waiter']}><Floor /></Gate>} />
        <Route path="tables" element={<Gate roles={['owner', 'manager', 'cashier']}><Tables /></Gate>} />
        <Route path="menu" element={<Gate roles={['owner', 'manager']}><MenuManager /></Gate>} />
        <Route path="billing" element={<Gate roles={['owner', 'manager', 'cashier']}><Billing /></Gate>} />
        <Route path="team" element={<Gate roles={['owner', 'manager']}><Team /></Gate>} />
        <Route path="settings" element={<Gate roles={['owner', 'manager']}><Settings /></Gate>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
