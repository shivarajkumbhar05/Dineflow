import { useState } from 'react';
import { Copy, Pencil, Plus, Printer, QrCode, ReceiptText, Trash2, Users } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAsync, useLive } from '../../hooks';
import { api } from '../../lib/api';
import { Button, Card, Empty, Input, Modal, PageLoader } from '../../components/ui';
import { cx } from '../../lib/format';

const STATUS = {
  available: { label: 'Free', ring: 'ring-pista/50', dot: 'bg-pista' },
  occupied: { label: 'Seated', ring: 'ring-saffron/60', dot: 'bg-saffron' },
  reserved: { label: 'Reserved', ring: 'ring-sky/60', dot: 'bg-sky' },
  billing: { label: 'Billing', ring: 'ring-chili/60', dot: 'bg-chili' },
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

function printQr(t, restaurantName) {
  const source = document.getElementById(`qr-${t._id}`);
  if (!source) return toast.error('The QR code is not ready to print. Please try again.');
  const qr = source.cloneNode(true);
  qr.setAttribute('width', '320');
  qr.setAttribute('height', '320');
  qr.setAttribute('style', 'display:block;width:320px;height:320px;max-width:100%;margin:0 auto');
  const w = window.open('', '_blank', 'width=520,height=700');
  if (!w) return toast.error('Allow pop-ups to print the QR code.');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Table ${escapeHtml(t.number)}</title></head><body style="font-family:system-ui;text-align:center;padding:40px"><h1 style="font-size:28px;margin:0">${escapeHtml(restaurantName)}</h1><p style="font-size:18px;color:#555">Scan with your Android or iPhone camera to order</p><div style="width:100%;margin:24px auto">${qr.outerHTML}</div><h2 style="font-size:64px;margin:0">Table ${escapeHtml(t.number)}</h2><p style="font-size:12px;word-break:break-all">${escapeHtml(t.qrUrl)}</p></body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
}

export default function Tables() {
  const { socket, can, restaurant } = useAuth();
  const nav = useNavigate();
  const { data, setData, loading, reload } = useAsync(() => api('/api/tables'));
  const [adding, setAdding] = useState(false); const [form, setForm] = useState({ number: '', seats: 4 }); const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState(null);
  const [editing, setEditing] = useState(null); const [editForm, setEditForm] = useState({ number: '', seats: 4 });
  const [filter, setFilter] = useState('all');
  const manage = can('owner', 'manager');

  useLive(socket, { 'table:updated': ({ tableId, ...updates }) => setData((cur) => cur && cur.map((t) => (t._id === tableId ? { ...t, ...updates } : t))) });

  const add = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api('/api/tables', { method: 'POST', body: { number: form.number, seats: Number(form.seats) } }); setAdding(false); setForm({ number: '', seats: 4 }); reload(); toast.success('Table added'); }
    catch (x) { toast.error(x.message); } finally { setBusy(false); }
  };
  const edit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await api(`/api/tables/${editing._id}`, { method: 'PATCH', body: { number: editForm.number, seats: Number(editForm.seats) } });
      setEditing(null); reload(); toast.success('Table details updated');
    } catch (x) { toast.error(x.message); } finally { setBusy(false); }
  };
  const startEdit = (table) => { setEditing(table); setEditForm({ number: table.number, seats: table.seats }); };
  const setStatus = async (t, status) => { try { await api(`/api/tables/${t._id}/status`, { method: 'PATCH', body: { status } }); } catch (e) { toast.error(e.message); } };
  const bill = async (t) => { try { await api(`/api/billing/table/${t._id}`, { method: 'POST', body: {} }); toast.success(`Bill created for table ${t.number}`); nav('/app/billing'); } catch (e) { toast.error(e.message); } };
  const remove = async (t) => { if (!window.confirm(`Delete table ${t.number}? Its printed QR code will stop working.`)) return; try { await api(`/api/tables/${t._id}`, { method: 'DELETE' }); reload(); } catch (e) { toast.error(e.message); } };

  if (loading && !data) return <PageLoader />;
  const shownTables = (data || []).filter((table) => filter === 'all' || table.status === filter);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-display text-3xl font-extrabold sm:text-4xl">Tables</h1><p className="mt-1 text-warm-dim">Each table has its own QR code. Colours update live as guests sit, order and pay.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Filter tables by status" value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl bg-ink/70 px-3 py-2.5 text-sm font-semibold ring-1 ring-plum-line focus:outline-none focus:ring-2 focus:ring-saffron">
            <option value="all">All tables ({(data || []).length})</option>
            {Object.entries(STATUS).map(([key, value]) => <option key={key} value={key}>{value.label} ({(data || []).filter((table) => table.status === key).length})</option>)}
          </select>
          {manage && <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Add table</Button>}
        </div>
      </div>

      {(data || []).length === 0 ? <Empty icon={QrCode} title="No tables yet" action={manage && <Button onClick={() => setAdding(true)}>Add your first table</Button>}>Create a table to get a QR code you can print and stick on it.</Empty> : shownTables.length === 0 ? <Empty icon={QrCode} title="No tables in this status">Choose another status to see more tables.</Empty> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {shownTables.map((t) => {
            const s = STATUS[t.status] || STATUS.available;
            return (
              <Card key={t._id} className={cx('ring-2 transition', s.ring)}>
                <div className="flex items-start justify-between">
                  <div><p className="text-sm font-semibold text-warm-dim">Table</p><p className="font-display text-5xl font-extrabold leading-none">{t.number}</p></div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-sm font-bold"><span className={cx('h-2.5 w-2.5 rounded-full', s.dot)} />{s.label}</span>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-warm-dim"><Users className="h-4 w-4" />{t.seats} seats</p>
                {manage && <select aria-label={`Status of table ${t.number}`} value={t.status} onChange={(e) => setStatus(t, e.target.value)} className="mt-4 w-full rounded-xl bg-ink/70 px-3 py-2 text-sm font-semibold ring-1 ring-plum-line focus:outline-none focus:ring-2 focus:ring-saffron">
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>}
                <div className="mt-3 flex gap-2">
                  <Button variant="soft" size="sm" className="flex-1" onClick={() => setQr(t)}><QrCode className="h-4 w-4" />QR code</Button>
                  {manage && <Button variant="soft" size="sm" aria-label={`Edit table ${t.number}`} onClick={() => startEdit(t)}><Pencil className="h-4 w-4" /></Button>}
                  {manage && <Button variant="soft" size="sm" className="flex-1" onClick={() => bill(t)}><ReceiptText className="h-4 w-4" />Bill</Button>}
                  {manage && <Button variant="danger" size="sm" aria-label={`Delete table ${t.number}`} onClick={() => remove(t)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a table">
        <form onSubmit={add} className="space-y-4">
          <Input label="Table number or name" required autoFocus value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="e.g. 6 or Patio 2" />
          <Input label="Seats" type="number" min="1" required value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
          <Button type="submit" className="w-full" loading={busy}>Add table</Button>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit table details">
        <form onSubmit={edit} className="space-y-4">
          <Input label="Table number or name" required autoFocus value={editForm.number} onChange={(e) => setEditForm({ ...editForm, number: e.target.value })} />
          <Input label="Seats" type="number" min="1" step="1" required value={editForm.seats} onChange={(e) => setEditForm({ ...editForm, seats: e.target.value })} />
          <Button type="submit" className="w-full" loading={busy}>Save changes</Button>
        </form>
      </Modal>

      <Modal open={!!qr} onClose={() => setQr(null)} title={qr ? `Table ${qr.number} QR code` : ''}>
        {qr && (
          <div className="text-center">
            <div className="mx-auto w-fit rounded-2xl bg-white p-4"><QRCodeSVG id={`qr-${qr._id}`} value={qr.qrUrl} size={220} level="M" /></div>
            <p className="mt-3 text-sm text-warm-dim">Scan with your Android or iPhone camera. No app is needed.</p>
            <p className="mt-4 break-all rounded-lg bg-ink/70 px-3 py-2 text-xs text-warm-dim">{qr.qrUrl}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="soft" className="flex-1" onClick={async () => {
                try {
                  if (!navigator.clipboard) throw new Error('Clipboard access is unavailable in this browser.');
                  await navigator.clipboard.writeText(qr.qrUrl);
                  toast.success('Link copied');
                } catch (e) { toast.error(e.message || 'Could not copy the link.'); }
              }}><Copy className="h-4 w-4" />Copy link</Button>
              <Button className="flex-1" onClick={() => printQr(qr, restaurant?.name)}><Printer className="h-4 w-4" />Print</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
