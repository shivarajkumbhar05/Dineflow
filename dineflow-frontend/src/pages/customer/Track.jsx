import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ClipboardCheck, CookingPot, UtensilsCrossed, XCircle } from 'lucide-react';
import { pub } from '../../lib/api';
import { connectSocket } from '../../lib/socket';
import { getTableToken } from '../../lib/guest';
import GuestActions from '../../components/GuestActions';
import { PageLoader, Empty } from '../../components/ui';
import { cx, money, orderNumber } from '../../lib/format';

const STEPS = [
  { key: 'placed', label: 'Order sent', note: 'The kitchen has your ticket.', icon: ClipboardCheck },
  { key: 'preparing', label: 'Cooking', note: 'Your food is on the stove.', icon: CookingPot },
  { key: 'ready', label: 'Ready', note: 'Coming to your table now.', icon: UtensilsCrossed },
  { key: 'served', label: 'Served', note: 'Enjoy your meal!', icon: Check },
];

export default function Track() {
  const { slug, code } = useParams();
  const [order, setOrder] = useState(null); const [error, setError] = useState('');
  const token = getTableToken(slug);

  useEffect(() => {
    const load = () => pub(slug).track(code).then(setOrder).catch((e) => setError(e.message));
    load();
    const s = connectSocket();
    const join = () => s.emit('track:order', { trackingCode: code });
    s.on('connect', join);
    s.on('order:status', (p) => setOrder((o) => (o ? { ...o, status: p.status } : o)));
    const poll = setInterval(load, 30000); // safety net if the socket drops
    return () => { clearInterval(poll); s.off('connect', join); s.disconnect(); };
  }, [slug, code]);

  if (error) return <div className="grid min-h-dvh place-items-center p-6"><Empty icon={XCircle} title="Order not found">{error}</Empty></div>;
  if (!order) return <PageLoader />;
  const status = order.status === 'accepted' ? 'preparing' : order.status;
  const idx = STEPS.findIndex((s) => s.key === status);
  const cancelled = order.status === 'cancelled';

  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      <Link to={`/r/${slug}`} className="text-sm font-bold text-saffron">Back to the menu</Link>
      <h1 className="mt-4 font-display text-4xl font-extrabold">{cancelled ? 'Order cancelled' : order.status === 'served' ? 'Bon appétit' : 'Cooking up your order'}</h1>
      <p className="mt-1 text-warm-dim">Table {order.tableNumber} · Order #{orderNumber(order._id)}. This page updates on its own.</p>

      {cancelled ? (
        <div className="mt-6 rounded-2xl bg-chili/15 p-5 text-chili ring-1 ring-chili/30"><p className="font-bold">The kitchen couldn’t make this order.</p><p className="mt-1 text-sm">Please call your waiter or place a new order.</p></div>
      ) : (
        <ol className="mt-8">
          {STEPS.map((s, i) => {
            const done = i < idx; const now = i === idx;
            return (
              <li key={s.key} className="relative flex gap-4 pb-7 last:pb-0">
                {i < STEPS.length - 1 && <span className={cx('absolute left-5 top-11 h-[calc(100%-2.75rem)] w-0.5', done ? 'bg-pista' : 'bg-plum-line')} />}
                <motion.span animate={now ? { scale: [1, 1.12, 1] } : {}} transition={{ repeat: Infinity, duration: 1.8 }}
                  className={cx('z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full ring-2', done ? 'bg-pista text-ink ring-pista' : now ? 'bg-saffron text-ink shadow-glow ring-saffron' : 'bg-plum text-warm-faint ring-plum-line')}>
                  {done ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                </motion.span>
                <div className="pt-1.5"><p className={cx('font-display text-lg font-bold', i > idx && 'text-warm-faint')}>{s.label}</p>{now && <p className="text-sm text-warm-dim">{s.note}</p>}</div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="ticket mt-8 shadow-lift" style={{ '--notch': '0px' }}>
        <ul className="space-y-1.5 p-5 text-sm">
          {order.items.map((i, k) => <li key={k} className="flex justify-between gap-3"><span className="text-warm-dim"><span className="num">{i.qty}</span> × {i.name}</span><span className="num">{money(i.price * i.qty)}</span></li>)}
          <li className="tear mt-3 flex justify-between pt-3 font-display text-lg font-extrabold"><span>Subtotal</span><span className="num text-saffron">{money(order.subtotal)}</span></li>
        </ul>
      </div>

      <div className="mt-6"><GuestActions slug={slug} token={token} restaurantName="DineFlow" /></div>
      <Link to={`/r/${slug}`} className="mt-3 block rounded-xl bg-saffron py-3.5 text-center font-bold text-ink">Order something else</Link>
    </div>
  );
}
