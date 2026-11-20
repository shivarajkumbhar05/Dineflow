import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import ImageUpload from '../../components/ImageUpload';
import { Button, Card, Input } from '../../components/ui';

export default function Settings() {
  const { restaurant, setRestaurant } = useAuth();
  const [f, setF] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { if (restaurant) setF({ name: restaurant.name, phone: restaurant.phone || '', address: restaurant.address || '', taxPercent: restaurant.taxPercent, logo: restaurant.logo || '', banner: restaurant.banner || '' }); }, [restaurant]);
  if (!f) return null;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try { setRestaurant(await api('/api/restaurant', { method: 'PATCH', body: { ...f, taxPercent: Number(f.taxPercent) } })); toast.success('Settings saved'); }
    catch (x) { toast.error(x.message); } finally { setBusy(false); }
  };
  const link = `${window.location.origin}/r/${restaurant.slug}`;
  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="font-display text-3xl font-extrabold sm:text-4xl">Settings</h1><p className="mt-1 text-warm-dim">What guests see on your menu, and how bills are calculated.</p></div>
      <Card className="space-y-4">
        <h2 className="font-display text-xl font-bold">Restaurant</h2>
        <Input label="Name" required value={f.name} onChange={set('name')} />
        <div className="grid gap-4 sm:grid-cols-2"><Input label="Phone" value={f.phone} onChange={set('phone')} /><Input label="Tax on bills (%)" type="number" min="0" max="100" step="0.5" value={f.taxPercent} onChange={set('taxPercent')} /></div>
        <Input label="Address" value={f.address} onChange={set('address')} />
      </Card>
      <Card className="grid gap-4 sm:grid-cols-2">
        <ImageUpload kind="logo" label="Logo" value={f.logo} onChange={(url) => setF({ ...f, logo: url })} />
        <ImageUpload kind="banner" label="Menu banner" value={f.banner} onChange={(url) => setF({ ...f, banner: url })} />
      </Card>
      <Card>
        <h2 className="font-display text-xl font-bold">Public menu link</h2>
        <p className="mt-1 text-sm text-warm-dim">Guests normally arrive through a table QR code. Table codes add <span className="font-semibold">?t=</span> so orders reach the right table.</p>
        <div className="mt-3 flex gap-2"><code className="min-w-0 flex-1 truncate rounded-xl bg-ink/70 px-3 py-2.5 text-sm">{link}</code><Button type="button" variant="soft" onClick={() => { navigator.clipboard?.writeText(link); toast.success('Link copied'); }}><Copy className="h-4 w-4" />Copy</Button></div>
      </Card>
      <Button type="submit" size="lg" loading={busy}>Save changes</Button>
    </form>
  );
}
