import { useState } from 'react';
import { BellRing, Droplets, HandHelping, Receipt, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { pub } from '../lib/api';
import { payWithRazorpay } from '../lib/razorpay';
import { Button, Modal } from './ui';

const REASONS = [
  { key: 'assistance', label: 'I need help', icon: HandHelping },
  { key: 'water', label: 'Water please', icon: Droplets },
  { key: 'bill', label: 'Bring the bill', icon: Receipt },
  { key: 'other', label: 'Something else', icon: BellRing },
];

/** Call-waiter sheet + pay-bill button, shared by the menu and tracking pages. */
export default function GuestActions({ slug, token, restaurantName }) {
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState('');
  const call = async (reason) => {
    setBusy(reason);
    try { await pub(slug).call({ tableToken: token, reason }); toast.success('Your waiter has been notified'); setOpen(false); } catch (e) { toast.error(e.message); } finally { setBusy(''); }
  };
  const pay = async () => {
    setBusy('pay');
    try {
      const o = await pub(slug).pay({ tableToken: token });
      await payWithRazorpay(o, { name: restaurantName, description: 'Table bill', onPaid: () => { toast.success('Payment received. Thank you!'); setBusy(''); }, onDismiss: () => setBusy('') });
    } catch (e) { toast.error(e.status === 404 ? 'There is no bill yet. Ask your waiter to prepare it.' : e.message); setBusy(''); }
  };
  if (!token) return null;
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="soft" onClick={() => setOpen(true)}><BellRing className="h-4 w-4" />Call waiter</Button>
        <Button variant="soft" loading={busy === 'pay'} onClick={pay}><Wallet className="h-4 w-4" />Pay bill</Button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="How can we help?">
        <div className="space-y-2">
          {REASONS.map(({ key, label, icon: Icon }) => (
            <button key={key} disabled={!!busy} onClick={() => call(key)} className="flex w-full items-center gap-3 rounded-2xl bg-ink/70 px-4 py-4 text-left font-semibold ring-1 ring-plum-line transition hover:ring-saffron active:scale-[.98] disabled:opacity-50">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-saffron/15 text-saffron"><Icon className="h-5 w-5" /></span>{label}
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
