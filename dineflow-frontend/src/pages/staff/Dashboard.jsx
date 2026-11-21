import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, CircleDollarSign, ConciergeBell, Armchair } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsync, useLive, useOrders, useTick } from '../../hooks';
import { api } from '../../lib/api';
import { Card, PageLoader, StatusPill, Empty } from '../../components/ui';
import { money, orderNumber, timeAgo } from '../../lib/format';

const isToday = (d) => d && new Date(d).toDateString() === new Date().toDateString();

function reportUrl(period) {
  const now = new Date();
  const from = new Date(now);
  if (period === 'day') from.setHours(0, 0, 0, 0);
  if (period === 'week') {
    from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
    from.setHours(0, 0, 0, 0);
  }
  if (period === 'year') {
    from.setMonth(0, 1);
    from.setHours(0, 0, 0, 0);
  }
  const params = new URLSearchParams({
    period,
    from: from.toISOString(),
    to: now.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });
  return `/api/billing/summary?${params}`;
}

function incomeBuckets(report, period) {
  const values = new Map((report?.buckets || []).map((bucket) => [bucket.key, bucket.total]));
  const now = new Date();
  if (period === 'day') {
    return Array.from({ length: 24 }, (_, hour) => ({
      label: `${hour % 12 || 12}${hour < 12 ? ' am' : ' pm'}`,
      value: values.get(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(hour).padStart(2, '0')}`) || 0,
    }));
  }
  if (period === 'week') {
    const monday = new Date(now);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return { label: date.toLocaleDateString('en-IN', { weekday: 'short' }), value: values.get(key) || 0 };
    });
  }
  return Array.from({ length: 12 }, (_, index) => ({
    label: new Date(now.getFullYear(), index, 1).toLocaleDateString('en-IN', { month: 'short' }),
    value: values.get(`${now.getFullYear()}-${String(index + 1).padStart(2, '0')}`) || 0,
  }));
}

export default function Dashboard() {
  const { restaurant, user, socket } = useAuth();
  const [period, setPeriod] = useState('day');
  useTick(30000);
  const orders = useOrders(socket);
  const bills = useAsync(() => api('/api/billing'));
  const report = useAsync(() => api(reportUrl(period)), [period]);
  const todayIncome = useAsync(() => api(reportUrl('day')));
  const tables = useAsync(() => api('/api/tables'));
  const calls = useAsync(() => api('/api/waiter/calls'));
  useLive(socket, {
    'billing:updated': () => { bills.reload(); report.reload(); todayIncome.reload(); }, 'table:updated': () => tables.reload(),
    'waiter:call': () => calls.reload(), 'waiter:call:updated': () => calls.reload(),
  });

  const d = useMemo(() => {
    const o = orders.data || []; const b = bills.data || []; const t = tables.data || [];
    const dish = new Map();
    o.filter((x) => isToday(x.createdAt) && x.status !== 'cancelled').forEach((x) => x.items.forEach((i) => dish.set(i.name, (dish.get(i.name) || 0) + i.qty)));
    return {
      active: o.filter((x) => ['placed', 'accepted', 'preparing'].includes(x.status)).length,
      occupied: t.filter((x) => x.status !== 'available').length, tableCount: t.length,
      top: [...dish.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
      unpaid: b.filter((x) => x.status === 'unpaid').reduce((s, x) => s + x.total, 0),
    };
  }, [orders.data, bills.data, tables.data]);

  if (orders.loading && !orders.data) return <PageLoader />;
  const cur = restaurant?.currency;
  const chart = incomeBuckets(report.data, period);
  const chartPeak = Math.max(...chart.map((bucket) => bucket.value), 1);
  const stats = [
    { icon: CircleDollarSign, label: 'Collected today', value: money(todayIncome.data?.total ?? 0, cur), sub: todayIncome.error ? 'Income summary unavailable' : `${todayIncome.data?.count ?? 0} bills paid`, tone: 'text-pista' },
    { icon: ChefHat, label: 'In the kitchen', value: d.active, sub: 'orders being prepared', tone: 'text-chili' },
    { icon: Armchair, label: 'Tables in use', value: `${d.occupied}/${d.tableCount}`, sub: `${money(d.unpaid, cur)} still unpaid`, tone: 'text-sky' },
    { icon: ConciergeBell, label: 'Waiting on a waiter', value: (calls.data || []).length, sub: 'open requests', tone: 'text-saffron' },
  ];
  const recent = [...(orders.data || [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-display text-xl font-bold">{period === 'day' ? 'Income today' : period === 'week' ? 'Income this week' : 'Income this year'}</h2><p className="mt-1 text-sm text-warm-dim">{money(report.data?.total ?? 0, cur)} collected · {report.data?.count ?? 0} paid bills</p></div>
            <select aria-label="Income reporting period" value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-xl bg-ink/70 px-3 py-2 text-sm font-semibold ring-1 ring-plum-line focus:outline-none focus:ring-2 focus:ring-saffron">
              <option value="day">Today</option><option value="week">This week</option><option value="year">This year</option>
            </select>
          </div>
          {report.error && <p role="alert" className="mt-3 text-sm text-chili">Could not load income report: {report.error}</p>}
          <div className="mt-5 flex h-44 items-end gap-1" role="img" aria-label={`Income for ${period === 'day' ? 'today by hour' : period === 'week' ? 'this week by day' : 'this year by month'}`}>
            {chart.map(({ label, value }) => (
              <div key={label} className="group relative flex h-full flex-1 flex-col justify-end">
                <div className={`rounded-t-md ${value ? 'bg-gradient-to-t from-saffron-deep to-saffron' : 'bg-plum-line/50'}`} style={{ height: `${Math.max((value / chartPeak) * 100, value ? 6 : 3)}%` }} />
                <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-plum-raised px-2 py-0.5 text-xs group-hover:block">{label} · {money(value, cur)}</span>
              </div>
            ))}
          </div>
          <div className="num mt-2 flex justify-between text-xs text-warm-faint">
            {period === 'day' ? <><span>12 am</span><span>6 am</span><span>12 pm</span><span>6 pm</span><span>11 pm</span></>
              : chart.filter((_, i) => period === 'week' ? i % 2 === 0 : i % 3 === 0).map((bucket) => <span key={bucket.label}>{bucket.label}</span>)}
          </div>
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
