import { useState } from 'react';
import { Banknote, BellRing, CheckCircle2, Droplets, HandHelping, Receipt, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { pub } from '../lib/api';
import { payWithRazorpay } from '../lib/razorpay';
import { Button, Modal, Pill } from './ui';
import { money } from '../lib/format';

const REASONS = [
  { key: 'assistance', label: 'I need help', icon: HandHelping },
  { key: 'water', label: 'Water please', icon: Droplets },
  { key: 'bill', label: 'Bring the bill', icon: Receipt },
  { key: 'other', label: 'Something else', icon: BellRing },
];

/** Call-waiter sheet + pay-bill button, shared by the menu and tracking pages. */
export default function GuestActions({ slug, token, restaurantName }) {
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState('');
  const [billOpen, setBillOpen] = useState(false); const [bill, setBill] = useState(null);
  const call = async (reason) => {
    setBusy(reason);
    try { await pub(slug).call({ tableToken: token, reason }); toast.success('Your waiter has been notified'); setOpen(false); } catch (e) { toast.error(e.message); } finally { setBusy(''); }
  };
  const viewBill = async () => {
    setBusy('bill');
    try {
      const currentBill = await pub(slug).bill({ tableToken: token });
      setBill(currentBill); setBillOpen(true);
    } catch (e) {
      toast.error(e.status === 404 ? 'There is no bill available for this table yet.' : e.message);
    } finally { setBusy(''); }
  };
  const pay = async () => {
    if (!bill || bill.status === 'paid') return;
    if ((bill.currency || 'INR').toUpperCase() !== 'INR') {
      toast.error('Online payments are only available for INR bills. Please pay at the counter.');
      return;
    }
    setBusy('pay');
    try {
      const o = await pub(slug).pay({ tableToken: token, billId: bill._id });
      await payWithRazorpay(o, {
        name: restaurantName,
        description: `Bill for table ${bill.tableNumber}`,
        onPaid: () => {
          setBill((current) => current && { ...current, status: 'paid', paymentMethod: 'razorpay' });
          toast.success('Payment received. Thank you!');
          setBusy('');
        },
        onDismiss: () => setBusy(''),
        onError: (e) => {
          toast.error(`Payment could not be confirmed. Please check with staff before trying again: ${e.message}`);
          setBusy('');
        },
      });
    } catch (e) {
      toast.error(e.message === 'No orders to bill for this table' ? 'There are no orders to pay for this table yet.' : e.message);
      setBusy('');
    }
  };
  if (!token) return null;
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="soft" disabled={!!busy} onClick={() => setOpen(true)}><BellRing className="h-4 w-4" />Call waiter</Button>
        <Button variant="soft" loading={busy === 'bill'} disabled={!!busy && busy !== 'bill'} onClick={viewBill}><Receipt className="h-4 w-4" />View bill</Button>
      </div>
      <p className="mt-2 text-center text-xs text-warm-faint">Review your itemized bill before paying online or at the counter.</p>
      <Modal open={open} onClose={() => setOpen(false)} title="How can we help?">
        <div className="space-y-2">
          {REASONS.map(({ key, label, icon: Icon }) => (
            <button key={key} disabled={!!busy} onClick={() => call(key)} className="flex w-full items-center gap-3 rounded-2xl bg-ink/70 px-4 py-4 text-left font-semibold ring-1 ring-plum-line transition hover:ring-saffron active:scale-[.98] disabled:opacity-50">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-saffron/15 text-saffron"><Icon className="h-5 w-5" /></span>{label}
            </button>
          ))}
        </div>
      </Modal>
      <Modal open={billOpen} onClose={() => setBillOpen(false)} title="Your bill" wide>
        {bill && (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-semibold">Table {bill.tableNumber}</p><p className="text-xs text-warm-faint">Bill #{String(bill._id).slice(-6).toUpperCase()}</p></div>
              {bill.status === 'paid' ? <Pill tone="good"><CheckCircle2 className="h-3.5 w-3.5" />Paid</Pill> : <Pill tone="warn">Payment due</Pill>}
            </div>
            <ul className="divide-y divide-plum-line/60">
              {bill.items.map((item, index) => (
                <li key={`${item.name}-${index}`} className="flex justify-between gap-3 py-2.5 text-sm">
                  <span className="text-warm-dim">{item.qty} × {item.name}</span>
                  <span className="num shrink-0">{money(item.price * item.qty, bill.currency)}</span>
                </li>
              ))}
            </ul>
            <dl className="num mt-4 space-y-2 border-t border-plum-line pt-4 text-sm">
              <div className="flex justify-between text-warm-dim"><dt>Subtotal</dt><dd>{money(bill.subtotal, bill.currency)}</dd></div>
              {bill.discount > 0 && <div className="flex justify-between text-pista"><dt>Discount</dt><dd>-{money(bill.discount, bill.currency)}</dd></div>}
              <div className="flex justify-between text-warm-dim"><dt>Tax ({bill.taxPercent}%)</dt><dd>{money(bill.tax, bill.currency)}</dd></div>
              <div className="flex justify-between pt-2 font-display text-xl font-extrabold"><dt>Total</dt><dd className="text-saffron">{money(bill.total, bill.currency)}</dd></div>
            </dl>
            {bill.status === 'paid' ? (
              <p className="mt-4 rounded-xl bg-pista/15 p-3 text-center text-sm font-semibold text-pista">Payment received. Thank you!</p>
            ) : (
              <div className="mt-5 space-y-2">
                {(bill.currency || 'INR').toUpperCase() === 'INR'
                  ? <Button className="w-full" loading={busy === 'pay'} disabled={!!busy && busy !== 'pay'} onClick={pay}><Wallet className="h-4 w-4" />Pay {money(bill.total, bill.currency)} online</Button>
                  : <p className="rounded-xl bg-saffron/10 p-3 text-center text-sm text-warm-dim">Online payment is unavailable for this currency. Please pay at the counter.</p>}
                <p className="flex items-center justify-center gap-1.5 text-center text-xs text-warm-faint"><Banknote className="h-3.5 w-3.5" />You can also pay cash at the counter.</p>
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
