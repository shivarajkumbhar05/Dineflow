import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Clock, StickyNote, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useOrders, useTick } from '../../hooks';
import { api } from '../../lib/api';
import { Button, Empty, PageLoader } from '../../components/ui';
import { cx, minutesSince, NEXT_LABEL, NEXT_STATUS, ORDER_STATUS, orderNumber } from '../../lib/format';

const COLS = [
  { key: 'placed', title: 'New orders', bar: 'bg-saffron' },
  { key: 'preparing', title: 'Cooking', bar: 'bg-chili' },
  { key: 'ready', title: 'Ready to serve', bar: 'bg-pista' },
];

function KitchenTicket({ o, onMove, busy }) {
  const mins = minutesSince(o.createdAt);
  const late = mins >= 15 && o.status !== 'ready';
  const next = NEXT_STATUS[o.status];
  return (
    <motion.li layout initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="ticket shadow-lift" style={{ '--notch': '52px' }}>
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <div><p className="font-display text-2xl font-extrabold">Table {o.tableNumber}</p><p className="text-xs font-semibold text-warm-faint">Order #{orderNumber(o._id)}</p></div>
        <span className={cx('num inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold', late ? 'bg-chili text-ink' : 'bg-white/10 text-warm-dim')}><Clock className="h-3.5 w-3.5" />{mins} min</span>
      </div>
      <div className="tear mx-3" />
      <ul className="space-y-2 px-4 py-3">
        {o.items.map((i, k) => (
          <li key={k}>
            <p className="font-semibold"><span className="num mr-2 inline-block min-w-[2ch] rounded-md bg-saffron px-1.5 text-center font-extrabold text-ink">{i.qty}</span>{i.name}</p>
            {i.notes && <p className="mt-1 flex items-start gap-1.5 text-sm text-saffron"><StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />{i.notes}</p>}
          </li>
        ))}
        {o.customerName && <li className="text-xs text-warm-faint">For {o.customerName}</li>}
      </ul>
      <div className="flex gap-2 px-4 pb-4">
        {next && <Button className="flex-1" variant={o.status === 'preparing' ? 'success' : 'primary'} loading={busy} onClick={() => onMove(o, next)}>{NEXT_LABEL[o.status]}</Button>}
        {['placed', 'accepted', 'preparing'].includes(o.status) && <Button variant="danger" aria-label="Cancel order" onClick={() => onMove(o, 'cancelled')}><X className="h-4 w-4" /></Button>}
      </div>
    </motion.li>
  );
}

export default function Kitchen() {
  const { socket } = useAuth();
  useTick(20000);
  const { data, setData, loading, error } = useOrders(socket);
  const [busy, setBusy] = useState(null);

  const move = async (o, status) => {
    if (status === 'cancelled' && !window.confirm(`Cancel the order for table ${o.tableNumber}?`)) return;
    setBusy(o._id);
    try {
      const u = await api(`/api/orders/${o._id}/status`, { method: 'PATCH', body: { status } });
      setData((cur) => cur.map((x) => (x._id === u._id ? u : x)));
    } catch (e) { toast.error(e.message); } finally { setBusy(null); }
  };

  if (loading && !data) return <PageLoader />;
  if (error) return <Empty icon={ChefHat} title="Could not load orders">{error}</Empty>;
  const orders = (data || []).filter((o) => ORDER_STATUS[o.status] && !['served', 'cancelled'].includes(o.status)).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const by = (k) => orders.filter((o) => k === 'preparing' ? ['accepted', 'preparing'].includes(o.status) : o.status === k);

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div><h1 className="font-display text-3xl font-extrabold sm:text-4xl">Kitchen</h1><p className="mt-1 text-warm-dim">Oldest tickets first. A ticket turns red after 15 minutes.</p></div>
        <p className="num font-display text-2xl font-extrabold text-saffron">{orders.length}<span className="ml-1.5 text-sm font-semibold text-warm-dim">open</span></p>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {COLS.map((c) => (
          <section key={c.key} aria-label={c.title}>
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><span className={cx('h-3 w-3 rounded-full', c.bar)} />{c.title}<span className="num text-warm-faint">{by(c.key).length}</span></h2>
            <ul className="space-y-4">
              <AnimatePresence initial={false}>{by(c.key).map((o) => <KitchenTicket key={o._id} o={o} onMove={move} busy={busy === o._id} />)}</AnimatePresence>
            </ul>
            {by(c.key).length === 0 && <p className="rounded-2xl border-2 border-dashed border-plum-line p-6 text-center text-sm text-warm-faint">Nothing here</p>}
          </section>
        ))}
      </div>
    </div>
  );
}
