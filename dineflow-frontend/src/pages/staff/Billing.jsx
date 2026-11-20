import { useState } from 'react';
import { Banknote, CreditCard, QrCode, Receipt, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useAsync, useLive } from '../../hooks';
import { api } from '../../lib/api';
import { payWithRazorpay } from '../../lib/razorpay';
import { Button, Empty, PageLoader, Pill } from '../../components/ui';
import { cx, money, timeAgo } from '../../lib/format';

function BillTicket({ b, cur, onChange, restaurantName, role }) {
  const [busy, setBusy] = useState('');
  const paid = b.status === 'paid';
  const offline = async (method) => {
    setBusy(method);
    try {
      const result = await api(`/api/billing/${b._id}/pay-offline`, { method: 'POST', body: { method } });
      toast.success(result.tableStatus === 'available'
        ? `${method === 'cash' ? 'Cash received' : 'Payment recorded'} for table ${b.tableNumber}. Table is now free.`
        : `${method === 'cash' ? 'Cash received' : 'Payment recorded'} for table ${b.tableNumber}.`);
      onChange();
    } catch (e) { toast.error(e.message); } finally { setBusy(''); }
  };
  const online = async () => {
    setBusy('razorpay');
    try {
      const o = await api('/api/payments/razorpay/order', { method: 'POST', body: { billId: b._id } });
      await payWithRazorpay(o, {
        name: restaurantName,
        description: `Table ${b.tableNumber}`,
        onPaid: (result) => {
          toast.success(result.tableStatus === 'available' ? `Table ${b.tableNumber} is now free.` : 'Payment verified.');
          onChange();
        },
        onDismiss: () => setBusy(''),
      });
    } catch (e) { toast.error(e.message); setBusy(''); }
  };
  return (
    <li className="ticket shadow-lift" style={{ '--notch': '60px' }}>
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <div><p className="font-display text-2xl font-extrabold">Table {b.tableNumber}</p><p className="text-xs text-warm-faint">{timeAgo(b.createdAt)}</p></div>
        {paid ? <Pill tone="good">Paid{b.paymentMethod ? ` by ${b.paymentMethod}` : ''}</Pill> : <Pill tone="warn">Unpaid</Pill>}
      </div>
      <div className="tear mx-4" />
      <ul className="space-y-1.5 px-5 py-4 text-sm">
        {b.items.map((i, k) => <li key={k} className="flex justify-between gap-3"><span className="text-warm-dim"><span className="num">{i.qty}</span> × {i.name}</span><span className="num">{money(i.price * i.qty, cur)}</span></li>)}
      </ul>
      <div className="tear mx-4" />
      <dl className="num space-y-1 px-5 py-4 text-sm">
        <div className="flex justify-between text-warm-dim"><dt>Subtotal</dt><dd>{money(b.subtotal, cur)}</dd></div>
        {b.discount > 0 && <div className="flex justify-between text-pista"><dt>Discount</dt><dd>-{money(b.discount, cur)}</dd></div>}
        <div className="flex justify-between text-warm-dim"><dt>Tax ({b.taxPercent}%)</dt><dd>{money(b.tax, cur)}</dd></div>
        <div className="flex justify-between pt-2 font-display text-2xl font-extrabold"><dt>Total</dt><dd className="text-saffron">{money(b.total, cur)}</dd></div>
      </dl>
      {!paid && role === 'cashier' && (
        <div className="px-5 pb-5">
          <Button className="w-full" variant="success" size="sm" loading={busy === 'cash'} onClick={() => offline('cash')}><Banknote className="h-4 w-4" />Confirm cash received</Button>
        </div>
      )}
      {!paid && role !== 'cashier' && (
        <div className="grid grid-cols-2 gap-2 px-5 pb-5">
          <Button variant="soft" size="sm" loading={busy === 'cash'} onClick={() => offline('cash')}><Banknote className="h-4 w-4" />Cash</Button>
          <Button variant="soft" size="sm" loading={busy === 'card'} onClick={() => offline('card')}><CreditCard className="h-4 w-4" />Card</Button>
          <Button variant="soft" size="sm" loading={busy === 'upi'} onClick={() => offline('upi')}><Smartphone className="h-4 w-4" />UPI at counter</Button>
          <Button size="sm" loading={busy === 'razorpay'} onClick={online}><QrCode className="h-4 w-4" />Pay online</Button>
        </div>
      )}
    </li>
  );
}

export default function Billing() {
  const { socket, restaurant, user } = useAuth();
  const [tab, setTab] = useState('unpaid');
  const { data, loading, reload } = useAsync(() => api('/api/billing'));
  useLive(socket, { 'billing:updated': () => reload() });
  if (loading && !data) return <PageLoader />;
  const list = (data || []).filter((b) => b.status === tab);
  const due = (data || []).filter((b) => b.status === 'unpaid').reduce((s, b) => s + b.total, 0);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-display text-3xl font-extrabold sm:text-4xl">Billing</h1><p className="mt-1 text-warm-dim">Bills are generated automatically when guests order. Cashiers confirm cash received here.</p></div>
        <p className="num text-right"><span className="block text-sm text-warm-dim">Waiting to be collected</span><span className="font-display text-3xl font-extrabold text-saffron">{money(due, restaurant?.currency)}</span></p>
      </div>
      <div className="flex gap-2">
        {['unpaid', 'paid'].map((t) => <button key={t} onClick={() => setTab(t)} className={cx('rounded-full px-5 py-2 text-sm font-bold capitalize ring-1', tab === t ? 'bg-saffron text-ink ring-saffron' : 'bg-plum text-warm-dim ring-plum-line')}>{t}</button>)}
      </div>
      {list.length === 0 ? <Empty icon={Receipt} title={tab === 'unpaid' ? 'No open bills' : 'No paid bills yet'}>{tab === 'unpaid' ? 'Bills appear here automatically after guests place orders.' : 'Paid bills will be listed here.'}</Empty> : (
        <ul className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">{list.map((b) => <BillTicket key={b._id} b={b} cur={restaurant?.currency} onChange={reload} restaurantName={restaurant?.name} role={user.role} />)}</ul>
      )}
    </div>
  );
}
