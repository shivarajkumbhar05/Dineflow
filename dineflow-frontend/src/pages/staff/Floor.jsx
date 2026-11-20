import { BellRing, Droplets, HandHelping, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useAsync, useLive, useTick } from '../../hooks';
import { api } from '../../lib/api';
import { Button, Card, Empty, PageLoader, Pill } from '../../components/ui';
import { timeAgo } from '../../lib/format';

const REASON = { assistance: { icon: HandHelping, text: 'Needs assistance' }, water: { icon: Droplets, text: 'Wants water' }, bill: { icon: Receipt, text: 'Asked for the bill' }, other: { icon: BellRing, text: 'Needs something' } };

export default function Floor() {
  const { socket, user } = useAuth();
  useTick(20000);
  const calls = useAsync(() => api('/api/waiter/calls'));
  useLive(socket, {
    'waiter:call': (c) => calls.setData((cur) => (cur && !cur.some((x) => x._id === c._id) ? [c, ...cur] : cur)),
    'waiter:call:updated': (c) => calls.setData((cur) => cur && (c.status === 'resolved' ? cur.filter((x) => x._id !== c._id) : cur.map((x) => (x._id === c._id ? c : x)))),
  });

  const setCall = async (c, status) => { try { await api(`/api/waiter/calls/${c._id}`, { method: 'PATCH', body: { status } }); } catch (e) { toast.error(e.message); } };

  if (calls.loading && !calls.data) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Waiter requests</h1>
        <p className="mt-1 text-warm-dim">Guest requests for water, help, bills or anything else.</p>
        {user.checkedInAt && <p className="mt-2 text-sm text-pista">Checked in at {new Date(user.checkedInAt).toLocaleString()}</p>}
      </div>
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold text-saffron"><BellRing className="h-5 w-5" />Open requests <span className="num text-warm-faint">{(calls.data || []).length}</span></h2>
        <div className="space-y-3">
          {(calls.data || []).length === 0 && <Empty icon={BellRing} title="No open requests">Guest requests will appear here as soon as they call.</Empty>}
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
  );
}
