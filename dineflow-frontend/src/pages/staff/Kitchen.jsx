import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, StickyNote } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrders, useTick } from '../../hooks';
import { Empty, PageLoader } from '../../components/ui';
import { orderNumber } from '../../lib/format';

function KitchenOrder({ order }) {
  return (
    <motion.li layout initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="ticket shadow-lift" style={{ '--notch': '52px' }}>
      <div className="px-4 pb-3 pt-4">
        <div>
          <p className="font-display text-2xl font-extrabold">Table {order.tableNumber}</p>
          <p className="text-xs font-semibold text-warm-faint">Order #{orderNumber(order._id)}</p>
        </div>
      </div>
      <div className="tear mx-3" />
      <ul className="space-y-2 px-4 py-3">
        {order.items.map((item, index) => (
          <li key={index}>
            <p className="font-semibold"><span className="num mr-2 inline-block min-w-[2ch] rounded-md bg-saffron px-1.5 text-center font-extrabold text-ink">{item.qty}</span>{item.name}</p>
            {item.notes && <p className="mt-1 flex items-start gap-1.5 text-sm text-saffron"><StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />{item.notes}</p>}
          </li>
        ))}
      </ul>
    </motion.li>
  );
}

export default function Kitchen() {
  const { socket } = useAuth();
  useTick(20000);
  const { data, loading, error } = useOrders(socket, '?view=kitchen');

  if (loading && !data) return <PageLoader />;
  if (error) return <Empty icon={ChefHat} title="Could not load orders">{error}</Empty>;
  const orders = (data || [])
    .filter((order) => !['served', 'cancelled'].includes(order.status))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Kitchen orders</h1>
          <p className="mt-1 text-warm-dim">New tickets appear automatically and paid tickets leave the board.</p>
        </div>
        <p className="num font-display text-2xl font-extrabold text-saffron">{orders.length}<span className="ml-1.5 text-sm font-semibold text-warm-dim">open</span></p>
      </div>
      {orders.length === 0 ? (
        <Empty icon={ChefHat} title="No open orders">New orders will appear here as soon as guests place them.</Empty>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          <AnimatePresence initial={false}>{orders.map((order) => <KitchenOrder key={order._id} order={order} />)}</AnimatePresence>
        </ul>
      )}
    </div>
  );
}
