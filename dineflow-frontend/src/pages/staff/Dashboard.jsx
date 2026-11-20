import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, CircleDollarSign, ConciergeBell, Armchair } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsync, useLive, useOrders, useTick } from '../../hooks';
import { api } from '../../lib/api';
import { Card, PageLoader, StatusPill, Empty } from '../../components/ui';
import { money, orderNumber, timeAgo } from '../../lib/format';

const isToday = (d) => d && new Date(d).toDateString() === new Date().toDateString();

export default function Dashboard() {
  const { restaurant, user, socket } = useAuth();
  useTick(30000);
  const orders = useOrders(socket);
  const bills = useAsync(() => api('/api/billing'));
  const tables = useAsync(() => api('/api/tables'));
  const calls = useAsync(() => api('/api/waiter/calls'));
  useLive(socket, {
    'billing:updated': () => bills.reload(), 'table:updated': () => tables.reload(),
    'waiter:call': () => calls.reload(), 'waiter:call:updated': () => calls.reload(),
  });

  const d = useMemo(() => {
    const o = orders.data || []; const b = bills.data || []; const t = tables.data || [];
    const paidToday = b.filter((x) => x.status === 'paid' && isToday(x.paidAt));
    const hours = Array.from({ length: 24 }, () => 0);
    paidToday.forEach((x) => { hours[new Date(x.paidAt).getHours()] += x.total; });
    const dish = new Map();
    o.filter((x) => isToday(x.createdAt) && x.status !== 'cancelled').forEach((x) => x.items.forEach((i) => dish.set(i.name, (dish.get(i.name) || 0) + i.qty)));
    return {
      revenue: paidToday.reduce((s, x) => s + x.total, 0), billsPaid: paidToday.length,
      active: o.filter((x) => ['placed', 'accepted', 'preparing'].includes(x.status)).length,
      occupied: t.filter((x) => x.status !== 'available').length, tableCount: t.length,
      hours, peak: Math.max(...hours, 1), top: [...dish.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
      unpaid: b.filter((x) => x.status === 'unpaid').reduce((s, x) => s + x.total, 0),
    };
  }, [orders.data, bills.data, tables.data]);

  if (orders.loading && !orders.data) return <PageLoader />;
  const cur = restaurant?.currency;
  const stats = [
    { icon: CircleDollarSign, label: 'Collected today', value: money(d.revenue, cur), sub: `${d.billsPaid} bills paid`, tone: 'text-pista' },
    { icon: ChefHat, label: 'In the kitchen', value: d.active, sub: 'orders being prepared', tone: 'text-chili' },
    { icon: Armchair, label: 'Tables in use', value: `${d.occupied}/${d.tableCount}`, sub: `${money(d.unpaid, cur)} still unpaid`, tone: 'text-sky' },
    { icon: ConciergeBell, label: 'Waiting on a waiter', value: (calls.data || []).length, sub: 'open requests', tone: 'text-saffron' },
  ];
  const recent = (orders.data || []).slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user.name.split(' ')[0]}</h1>
        <p className="mt-1 text-warm-dim">Here is what is happening at {restaurant?.name} right now.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ icon: Icon, label, value, sub, tone }) => (
          <Card key={label} className="flex items-start gap-4">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/8 ${tone}`}><Icon className="h-5 w-5" /></span>
            <div className="min-w-0"><p className="text-sm font-semibold text-warm-dim">{label}</p><p className="num font-display text-3xl font-extrabold">{value}</p><p className="truncate text-xs text-warm-faint">{sub}</p></div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="font-display text-xl font-bold">Collections by hour</h2>
          <div className="mt-5 flex h-44 items-end gap-1" role="img" aria-label="Revenue per hour today">
            {d.hours.map((v, h) => (
              <div key={h} className="group relative flex h-full flex-1 flex-col justify-end">
                <div className={`rounded-t-md ${v ? 'bg-gradient-to-t from-saffron-deep to-saffron' : 'bg-plum-line/50'}`} style={{ height: `${Math.max((v / d.peak) * 100, v ? 6 : 3)}%` }} />
                <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-0.5 text-xs group-hover:block">{h}:00 · {money(v, cur)}</span>
              </div>
            ))}
          </div>
          <div className="num mt-2 flex justify-between text-xs text-warm-faint"><span>12 am</span><span>6 am</span><span>12 pm</span><span>6 pm</span><span>11 pm</span></div>
        </Card>
        <Card>
          <h2 className="font-display text-xl font-bold">Best sellers today</h2>
          {d.top.length === 0 ? <p className="mt-4 text-sm text-warm-dim">No orders yet today. Dishes will rank here as they sell.</p> : (
            <ol className="mt-4 space-y-3">
              {d.top.map(([name, qty], i) => (
                <li key={name} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/8 text-sm font-bold">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
                  <span className="num text-warm-dim">{qty} sold</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl font-bold">Latest orders</h2><Link to="/app/kitchen" className="text-sm font-bold text-saffron">Open kitchen board</Link></div>
        {recent.length === 0 ? <Empty icon={ChefHat} title="No orders yet">Print a table QR code and place a test order to see it appear here live.</Empty> : (
          <ul className="divide-y divide-plum-line/60">
            {recent.map((o) => (
              <li key={o._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <span className="font-display text-lg font-bold">Table {o.tableNumber}</span>
                <span className="text-xs font-semibold text-warm-faint">Order #{orderNumber(o._id)}</span>
                <StatusPill status={o.status} />
                <span className="min-w-0 flex-1 truncate text-sm text-warm-dim">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</span>
                <span className="num text-sm font-semibold">{money(o.subtotal, cur)}</span>
                <span className="w-20 text-right text-xs text-warm-faint">{timeAgo(o.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
