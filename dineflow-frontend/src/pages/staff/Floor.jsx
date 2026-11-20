import { BellRing, CheckCheck, Droplets, HandHelping, Receipt, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useAsync, useLive, useOrders, useTick } from '../../hooks';
import { api } from '../../lib/api';
import { Button, Card, Empty, PageLoader, Pill } from '../../components/ui';
import { timeAgo } from '../../lib/format';

const REASON = { assistance: { icon: HandHelping, text: 'Needs assistance' }, water: { icon: Droplets, text: 'Wants water' }, bill: { icon: Receipt, text: 'Asked for the bill' }, other: { icon: BellRing, text: 'Needs something' } };

export default function Floor() {
  const { socket } = useAuth();
  useTick(20000);
  const calls = useAsync(() => api('/api/waiter/calls'));
  const orders = useOrders(socket, '?status=ready');
  useLive(socket, {
    'waiter:call': (c) => calls.setData((cur) => (cur && !cur.some((x) => x._id === c._id) ? [c, ...cur] : cur)),
    'waiter:call:updated': (c) => calls.setData((cur) => cur && (c.status === 'resolved' ? cur.filter((x) => x._id !== c._id) : cur.map((x) => (x._id === c._id ? c : x)))),
    'kitchen:ready': () => orders.reload(),
  });

  const setCall = async (c, status) => { try { await api(`/api/waiter/calls/${c._id}`, { method: 'PATCH', body: { status } }); } catch (e) { toast.error(e.message); } };
  const serve = async (o) => {
    try { await api(`/api/orders/${o._id}/status`, { method: 'PATCH', body: { status: 'served' } }); orders.setData((cur) => cur.filter((x) => x._id !== o._id)); }
    catch (e) { toast.error(e.message); }
  };

  if (calls.loading && !calls.data) return <PageLoader />;
  const ready = (orders.data || []).filter((o) => o.status === 'ready');

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-extrabold sm:text-4xl">Floor</h1><p className="mt-1 text-warm-dim">Pick up what is ready and answer your tables.</p></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold text-pista"><UtensilsCrossed className="h-5 w-5" />Ready to serve <span className="num text-warm-faint">{ready.length}</span></h2>
          <div className="space-y-3">
            {ready.length === 0 && <Empty icon={UtensilsCrossed} title="Nothing waiting at the pass">Ready orders show up here with a chime.</Empty>}
            {ready.map((o) => (
              <Card key={o._id} className="flex items-center gap-4 ring-pista/40">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-pista font-display text-2xl font-extrabold text-ink">{o.tableNumber}</div>
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</p><p className="text-xs text-warm-faint">Ready {timeAgo(o.updatedAt || o.createdAt)}</p></div>
                <Button variant="success" onClick={() => serve(o)}><CheckCheck className="h-4 w-4" />Served</Button>
              </Card>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold text-saffron"><BellRing className="h-5 w-5" />Table requests <span className="num text-warm-faint">{(calls.data || []).length}</span></h2>
          <div className="space-y-3">
            {(calls.data || []).length === 0 && <Empty icon={BellRing} title="No open requests">When a guest taps “Call waiter”, it lands here instantly.</Empty>}
            {(calls.data || []).map((c) => {
              const R = REASON[c.reason] || REASON.other;
              return (
                <Card key={c._id} className="flex items-center gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-saffron font-display text-2xl font-extrabold text-ink">{c.tableNumber}</div>
                  <div className="min-w-0 flex-1"><p className="flex items-center gap-2 font-semibold"><R.icon className="h-4 w-4 text-saffron" />{R.text}</p><p className="mt-0.5 text-xs text-warm-faint">{timeAgo(c.createdAt)} {c.status === 'acknowledged' && <Pill tone="info">On the way</Pill>}</p></div>
                  {c.status === 'pending' && <Button variant="soft" size="sm" onClick={() => setCall(c, 'acknowledged')}>On my way</Button>}
                  <Button size="sm" onClick={() => setCall(c, 'resolved')}>Done</Button>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
