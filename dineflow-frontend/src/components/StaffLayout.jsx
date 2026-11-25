import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BellRing, ChefHat, CreditCard, LayoutDashboard, LogOut, Moon, QrCode, Settings as Cog, Soup, Sun, Users, Wifi, WifiOff, ConciergeBell, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLive } from '../hooks';
import { api } from '../lib/api';
import { Logo } from './ui';
import { cx, ding, unlockDing } from '../lib/format';

const NAV = [
  { to: '/app', end: true, label: 'Overview', icon: LayoutDashboard, roles: ['owner', 'manager'] },
  { to: '/app/kitchen', label: 'Kitchen', icon: ChefHat, roles: ['owner', 'manager', 'kitchen'] },
  { to: '/app/floor', label: 'Floor', icon: ConciergeBell, roles: ['owner', 'manager', 'waiter'] },
  { to: '/app/tables', label: 'Tables', icon: QrCode, roles: ['owner', 'manager', 'cashier'] },
  { to: '/app/billing', label: 'Billing', icon: CreditCard, roles: ['owner', 'manager', 'cashier'] },
  { to: '/app/menu', label: 'Menu', icon: Soup, roles: ['owner', 'manager'] },
  { to: '/app/team', label: 'Team', icon: Users, roles: ['owner', 'manager'] },
  { to: '/app/settings', label: 'Settings', icon: Cog, roles: ['owner', 'manager'] },
];

export default function StaffLayout() {
  const { user, restaurant, socket, logout } = useAuth();
  const nav = useNavigate();
  const [online, setOnline] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('dineflow-sound-enabled') === 'true');
  const [theme, setTheme] = useState(() => localStorage.getItem('dineflow-theme') === 'light' ? 'light' : 'dark');
  const items = NAV.filter((n) => n.roles.includes(user.role));
  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark');
  const signOut = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
      logout();
      nav('/login');
    } catch (e) { toast.error(`Could not record check-out: ${e.message}`); }
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('dineflow-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!socket) return undefined;
    const up = () => setOnline(true); const down = () => setOnline(false);
    socket.on('connect', up); socket.on('disconnect', down); setOnline(socket.connected);
    return () => { socket.off('connect', up); socket.off('disconnect', down); };
  }, [socket]);

  const enableSound = async () => {
    const unlocked = await unlockDing();
    if (unlocked) {
      setSoundEnabled(true);
      localStorage.setItem('dineflow-sound-enabled', 'true');
      ding(880);
      toast.success('Alert sound enabled');
    } else {
      toast.error('Your browser blocked sound. Use the button again to enable alerts.');
    }
  };

  // App-wide alerts: they fire on every page so nobody misses a ticket or a call.
  const kitchenSide = ['owner', 'manager', 'kitchen'].includes(user.role);
  const floorSide = ['owner', 'manager', 'waiter'].includes(user.role);
  useLive(socket, {
    'order:new': (o) => {
      if (kitchenSide || user.role === 'waiter') {
        const items = (o.items || []).map((i) => `${i.qty}× ${i.name}`).join(', ');
        const detail = [o.customerName, items].filter(Boolean).join(' · ');
        ding(880);
        toast(`New order for table ${o.tableNumber}`, { icon: '🧾', description: detail || `${o.items?.length || 0} items` });
      }
    },
    'order:status': (p) => { if (user.role === 'waiter' && p.status === 'preparing') { ding(760); toast(`Table ${p.tableNumber}: order is cooking`); } },
    'kitchen:ready': (p) => { if (floorSide) { ding(660); toast.success(`Table ${p.tableNumber}: order is ready to serve`); } },
    'waiter:call': (c) => { if (floorSide) { ding(520); toast(`Table ${c.tableNumber} needs ${c.reason === 'bill' ? 'the bill' : c.reason === 'water' ? 'water' : 'a waiter'}`, { icon: '🔔' }); } },
    'payment:confirmed': (p) => {
      if (soundEnabled) ding(720);
      toast.success(p.tableStatus === 'available'
        ? `Payment received for table ${p.tableNumber}. Table is now free.`
        : `Payment received for table ${p.tableNumber}.`);
    },
  });

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-plum-line/70 bg-ink/60 p-5 backdrop-blur lg:flex">
        <div className="flex items-center justify-between gap-2"><Logo /><button type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} className="rounded-lg p-2 text-warm-dim hover:bg-white/10 hover:text-warm">{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button></div>
        <p className="mt-5 truncate font-display text-sm font-bold text-warm-dim">{restaurant?.name}</p>
        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition', isActive ? 'bg-saffron text-ink shadow-glow' : 'text-warm-dim hover:bg-white/8 hover:text-warm')}>
              <Icon className="h-5 w-5" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="rounded-2xl bg-plum p-3 ring-1 ring-plum-line">
          <p className="truncate text-sm font-bold">{user.name}</p>
          <p className="text-xs capitalize text-warm-dim">{user.role}</p>
          <button type="button" onClick={enableSound} className={cx('mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ring-1', soundEnabled ? 'bg-pista/15 text-pista ring-pista/30' : 'bg-saffron/15 text-saffron ring-saffron/30')}>
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {soundEnabled ? 'Sound enabled' : 'Enable alert sound'}
          </button>
          <div className="mt-3 flex items-center justify-between">
            <span className={cx('inline-flex items-center gap-1.5 text-xs font-semibold', online ? 'text-pista' : 'text-chili')}>
              {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}{online ? 'Live' : 'Reconnecting'}
            </span>
            <button onClick={signOut} aria-label="Sign out" className="rounded-lg p-1.5 text-warm-dim hover:bg-white/10 hover:text-warm"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-plum-line/70 bg-ink/80 px-4 py-3 backdrop-blur lg:hidden">
          <Logo className="text-lg" />
          <div className="flex items-center gap-3">
            <button type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} className="rounded-lg p-1.5 text-warm-dim"><Sun className={cx('h-4 w-4', theme === 'light' && 'hidden')} /><Moon className={cx('h-4 w-4', theme === 'dark' && 'hidden')} /></button>
            <button type="button" onClick={enableSound} aria-label={soundEnabled ? 'Test alert sound' : 'Enable alert sound'} className={cx('rounded-lg p-1.5', soundEnabled ? 'text-pista' : 'text-saffron')}>
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <span className={cx('inline-flex items-center gap-1 text-xs font-semibold', online ? 'text-pista' : 'text-chili')}><BellRing className="h-3.5 w-3.5" />{online ? 'Live' : 'Offline'}</span>
            <button onClick={signOut} aria-label="Sign out" className="rounded-lg p-1.5 text-warm-dim"><LogOut className="h-5 w-5" /></button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 flex gap-1 overflow-x-auto border-t border-plum-line bg-ink/95 px-2 pt-2 backdrop-blur lg:hidden" aria-label="Main">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('flex min-w-[68px] flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-semibold', isActive ? 'bg-saffron text-ink' : 'text-warm-dim')}>
            <Icon className="h-5 w-5" />{label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
