import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { pub } from '../../lib/api';
import { connectSocket } from '../../lib/socket';
import { getTableToken } from '../../lib/guest';
import GuestActions from '../../components/GuestActions';
import { PageLoader, Empty } from '../../components/ui';
import { money, orderNumber } from '../../lib/format';

export default function Track() {
  const { slug, code } = useParams();
  const [order, setOrder] = useState(null); const [error, setError] = useState('');
  const token = getTableToken(slug);

  useEffect(() => {
    setOrder(null); setError('');
    const load = () => pub(slug).track(code).then((nextOrder) => { setOrder(nextOrder); setError(''); }).catch((e) => setError(e.message));
    load();
    const s = connectSocket();
    const join = () => s.emit('track:order', { trackingCode: code });
    const status = (p) => setOrder((o) => (o ? { ...o, status: p.status } : o));
    s.on('connect', join);
    s.on('order:status', status);
    const poll = setInterval(load, 30000); // safety net if the socket drops
    return () => { clearInterval(poll); s.off('connect', join); s.off('order:status', status); s.disconnect(); };
  }, [slug, code]);

  if (error) return <div className="grid min-h-dvh place-items-center p-6"><Empty icon={XCircle} title="Order not found">{error}</Empty></div>;
  if (!order) return <PageLoader />;
  const cancelled = order.status === 'cancelled';

  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      <Link to={`/r/${slug}`} className="text-sm font-bold text-saffron">Back to the menu</Link>
      <h1 className="mt-4 font-display text-4xl font-extrabold">{cancelled ? 'Order cancelled' : 'Order received'}</h1>
      <p className="mt-1 text-warm-dim">Table {order.tableNumber} · Order #{orderNumber(order._id)}</p>

      {cancelled && (
        <div className="mt-6 rounded-2xl bg-chili/15 p-5 text-chili ring-1 ring-chili/30"><p className="font-bold">The kitchen couldn’t make this order.</p><p className="mt-1 text-sm">Please call your waiter or place a new order.</p></div>
      )}

      <div className="ticket mt-8 shadow-lift" style={{ '--notch': '0px' }}>
        <ul className="space-y-1.5 p-5 text-sm">
          {order.items.map((i, k) => <li key={k} className="flex justify-between gap-3"><span className="text-warm-dim"><span className="num">{i.qty}</span> × {i.name}</span><span className="num">{money(i.price * i.qty, order.currency)}</span></li>)}
          <li className="tear mt-3 flex justify-between pt-3 font-display text-lg font-extrabold"><span>Subtotal</span><span className="num text-saffron">{money(order.subtotal, order.currency)}</span></li>
        </ul>
      </div>

      <div className="mt-6"><GuestActions slug={slug} token={token} restaurantName={order.restaurantName} /></div>
      <Link to={`/r/${slug}`} className="mt-3 block rounded-xl bg-saffron py-3.5 text-center font-bold text-ink">Order something else</Link>
    </div>
  );
}
