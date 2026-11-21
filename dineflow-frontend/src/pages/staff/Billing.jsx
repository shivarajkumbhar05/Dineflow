import { useState } from 'react';
import { Banknote, CreditCard, Printer, QrCode, Receipt, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useAsync, useLive } from '../../hooks';
import { api } from '../../lib/api';
import { payWithRazorpay } from '../../lib/razorpay';
import { Button, Empty, PageLoader, Pill } from '../../components/ui';
import { cx, money, timeAgo } from '../../lib/format';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

function printBill(bill, restaurantName, currency) {
  const win = window.open('', '_blank', 'width=520,height=720');
  if (!win) return toast.error('Allow pop-ups to print or save this bill.');
  const items = bill.items.map((item) => `
    <tr>
      <td><span class="qty">${escapeHtml(item.qty)} ×</span> ${escapeHtml(item.name)}</td>
      <td>${escapeHtml(money(item.price * item.qty, currency))}</td>
    </tr>
  `).join('');
  const issued = new Date(bill.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Bill ${escapeHtml(bill._id)}</title>
    <style>
      *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{margin:0;padding:28px;background:#fff6df;color:#24152f;font:14px/1.45 system-ui,sans-serif}
      main{max-width:720px;margin:auto;overflow:hidden;border:1px solid #edcf91;border-radius:18px;background:#fff;box-shadow:0 12px 40px rgba(87,54,18,.12)}
      .header{display:flex;align-items:center;justify-content:space-between;padding:24px 28px;background:linear-gradient(135deg,#ffb020 0%,#ff7a45 100%);color:#24152f}
      .brand{display:flex;align-items:center;gap:14px}
      .logo{display:grid;width:54px;height:54px;place-items:center;border:2px solid rgba(36,21,47,.18);border-radius:16px;background:#fff;font-size:25px;font-weight:900}
      h1{margin:0;font-size:25px;line-height:1.1}.eyebrow{margin:4px 0 0;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
      .status{padding:8px 12px;border-radius:999px;background:${bill.status === 'paid' ? '#24152f' : '#fff'};color:${bill.status === 'paid' ? '#fff' : '#a53a2a'};font-size:12px;font-weight:900;text-transform:uppercase}
      .content{padding:24px 28px}
      .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:22px}
      .meta-card{padding:12px 14px;border:1px solid #f0dfbb;border-radius:12px;background:#fffaf0}
      .label{display:block;margin-bottom:3px;color:#806e78;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
      .value{font-size:14px;font-weight:800}
      table{width:100%;border-collapse:collapse}thead th{padding:10px 12px;border-radius:8px;background:#2e173f;color:#fff;font-size:11px;text-align:left;text-transform:uppercase}thead th:last-child{text-align:right}
      tbody td{padding:13px 12px;border-bottom:1px solid #eee5d2;vertical-align:top}tbody td:last-child{text-align:right;white-space:nowrap;font-weight:800}
      .qty{display:inline-block;margin-right:5px;color:#c46a12;font-weight:900}
      .totals{width:270px;margin:18px 0 0 auto;padding:12px 14px;border-radius:12px;background:#fff6df}
      .totals table td{padding:5px 0;border:0;font-size:13px}.totals table td:last-child{text-align:right}.totals .grand td{padding-top:10px;border-top:2px solid #f0b84d;color:#24152f;font-size:19px;font-weight:900}
      footer{display:flex;align-items:center;justify-content:center;gap:8px;padding:16px;border-top:1px dashed #dfc98f;color:#806e78;font-size:12px;text-align:center}
      footer strong{color:#c36b12}
      @page{size:A4;margin:12mm}
      @media print{body{padding:0;background:#fff}main{max-width:none;border:0;border-radius:0;box-shadow:none}.header{border-radius:0}}
      @media(max-width:600px){body{padding:12px}.header,.content{padding:18px}.meta{grid-template-columns:1fr 1fr}.totals{width:100%}}
    </style></head><body><main>
      <header class="header">
        <div class="brand"><div class="logo">D</div><div><h1>${escapeHtml(restaurantName || 'Restaurant')}</h1><p class="eyebrow">Food &amp; beverage receipt</p></div></div>
        <span class="status">${bill.status === 'paid' ? 'Paid' : 'Unpaid'}</span>
      </header>
      <section class="content">
        <div class="meta">
          <div class="meta-card"><span class="label">Table</span><span class="value">${escapeHtml(bill.tableNumber)}</span></div>
          <div class="meta-card"><span class="label">Bill number</span><span class="value">#${escapeHtml(String(bill._id).slice(-6).toUpperCase())}</span></div>
          <div class="meta-card"><span class="label">Date &amp; time</span><span class="value">${escapeHtml(issued)}</span></div>
        </div>
        <table><thead><tr><th>Item</th><th>Amount</th></tr></thead><tbody>${items}</tbody></table>
        <div class="totals"><table>
        <tr><td>Subtotal</td><td>${escapeHtml(money(bill.subtotal, currency))}</td></tr>
        ${bill.discount > 0 ? `<tr><td>Discount</td><td>-${escapeHtml(money(bill.discount, currency))}</td></tr>` : ''}
        <tr><td>Tax (${escapeHtml(bill.taxPercent)}%)</td><td>${escapeHtml(money(bill.tax, currency))}</td></tr>
        ${bill.tip > 0 ? `<tr><td>Tip</td><td>${escapeHtml(money(bill.tip, currency))}</td></tr>` : ''}
        <tr class="grand"><td>Total</td><td>${escapeHtml(money(bill.total + (bill.tip || 0), currency))}</td></tr>
        ${bill.status === 'paid' && bill.paymentMethod ? `<tr><td>Payment</td><td>${escapeHtml(bill.paymentMethod)}</td></tr>` : ''}
      </table></div>
      </section>
      <footer><strong>Thank you!</strong><span>We hope to see you again soon.</span></footer>
    </main><script>window.onload=()=>window.print()</script></body></html>`);
  win.document.close();
}

function BillTicket({ b, cur, onChange, restaurantName, role }) {
  const [busy, setBusy] = useState('');
  const paid = b.status === 'paid';
  const onlineSupported = (cur || 'INR').toUpperCase() === 'INR';
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
        onError: (e) => { toast.error(`Payment verification failed: ${e.message}`); setBusy(''); },
      });
    } catch (e) { toast.error(e.message); setBusy(''); }
  };
  return (
    <li className="ticket shadow-lift" style={{ '--notch': '60px' }}>
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <div><p className="font-display text-2xl font-extrabold">Table {b.tableNumber}</p><p className="text-xs text-warm-faint">{timeAgo(b.createdAt)}</p></div>
        <div className="flex items-center gap-2">
          {paid ? <Pill tone="good">Paid{b.paymentMethod ? ` by ${b.paymentMethod}` : ''}</Pill> : <Pill tone="warn">Unpaid</Pill>}
          <Button variant="ghost" size="sm" aria-label="Print or save bill" title="Print or save as PDF" onClick={() => printBill(b, restaurantName, cur)}><Printer className="h-4 w-4" /></Button>
        </div>
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
        {b.tip > 0 && <div className="flex justify-between text-warm-dim"><dt>Tip</dt><dd>{money(b.tip, cur)}</dd></div>}
        <div className="flex justify-between pt-2 font-display text-2xl font-extrabold"><dt>Total</dt><dd className="text-saffron">{money(b.total + (b.tip || 0), cur)}</dd></div>
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
          {onlineSupported && <Button size="sm" loading={busy === 'razorpay'} onClick={online}><QrCode className="h-4 w-4" />Pay online</Button>}
        </div>
      )}
      {!paid && role !== 'cashier' && !onlineSupported && <p className="px-5 pb-5 text-xs text-warm-faint">Online payment is only available for INR bills. Please pay at the counter.</p>}
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
  const due = (data || []).filter((b) => b.status === 'unpaid').reduce((s, b) => s + b.total + (b.tip || 0), 0);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-display text-3xl font-extrabold sm:text-4xl">Billing</h1><p className="mt-1 text-warm-dim">Bills are generated automatically when guests order. Print a receipt or choose Save as PDF in the print dialog.</p></div>
        <p className="num text-right"><span className="block text-sm text-warm-dim">Waiting to be collected</span><span className="font-display text-3xl font-extrabold text-saffron">{money(due, restaurant?.currency)}</span></p>
      </div>
      <div className="flex gap-2">
        {['unpaid', 'paid'].map((t) => <button key={t} onClick={() => setTab(t)} className={cx('rounded-full px-5 py-2 text-sm font-bold capitalize ring-1', tab === t ? 'bg-saffron text-ink ring-saffron' : 'bg-plum text-warm-dim ring-plum-line')}>{t}</button>)}
      </div>
      {list.length === 0 ? <Empty icon={Receipt} title={tab === 'unpaid' ? 'No open bills' : 'No paid bills yet'}>{tab === 'unpaid' ? 'Bills appear here automatically after guests place orders.' : 'Paid bills will be listed here.'}</Empty> : (
        <ul className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">{list.map((b) => <BillTicket key={b._id} b={b} cur={b.currency || restaurant?.currency} onChange={reload} restaurantName={restaurant?.name} role={user.role} />)}</ul>
      )}
    </div>
  );
}
