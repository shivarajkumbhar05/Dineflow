import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, QrCode, Search, ShoppingBag, Soup, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { pub } from '../../lib/api';
import { addOrderCode, getOrderCodes, getTableToken, saveTableToken } from '../../lib/guest';
import GuestActions from '../../components/GuestActions';
import { Button, Empty, Input, Modal, PageLoader } from '../../components/ui';
import { VegMark } from '../staff/MenuManager';
import { cx, money } from '../../lib/format';

const Stepper = ({ qty, onAdd, onSub, label }) => qty ? (
  <div className="inline-flex items-center rounded-xl bg-saffron text-ink shadow-glow" role="group" aria-label={label}>
    <button onClick={onSub} aria-label="Remove one" className="p-2.5"><Minus className="h-4 w-4" /></button>
    <span className="num min-w-[1.6rem] text-center font-extrabold">{qty}</span>
    <button onClick={onAdd} aria-label="Add one" className="p-2.5"><Plus className="h-4 w-4" /></button>
  </div>
) : <Button size="sm" variant="soft" onClick={onAdd} aria-label={`Add ${label}`} className="!rounded-xl !px-4 !py-2 !font-bold !text-saffron">Add</Button>;

export default function Menu() {
  const { slug } = useParams(); const [sp] = useSearchParams(); const nav = useNavigate();
  const [data, setData] = useState(null); const [error, setError] = useState('');
  const [cart, setCart] = useState({}); // itemId -> { qty, notes }
  const [open, setOpen] = useState(false); const [name, setName] = useState(''); const [busy, setBusy] = useState(false);
  const [q, setQ] = useState(''); const [vegOnly, setVegOnly] = useState(false); const [cat, setCat] = useState('');

  const urlToken = sp.get('t');
  useEffect(() => { if (urlToken) saveTableToken(slug, urlToken); }, [slug, urlToken]);
  const token = urlToken || getTableToken(slug);

  useEffect(() => { pub(slug).menu().then((d) => { setData(d); setCat(d.categories[0]?._id || ''); }).catch((e) => setError(e.message)); }, [slug]);

  const items = useMemo(() => (data?.items || []).filter((i) => (!vegOnly || i.isVeg) && (!q || `${i.name} ${i.description}`.toLowerCase().includes(q.toLowerCase()))), [data, q, vegOnly]);
  const sections = useMemo(() => (data?.categories || []).map((c) => ({ ...c, items: items.filter((i) => i.category === c._id) })).filter((c) => c.items.length), [data, items]);

  // Highlight the category chip for the section currently in view.
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(`cat-${s._id}`)).filter(Boolean);
    if (!els.length) return undefined;
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setCat(e.target.id.replace('cat-', ''))), { rootMargin: '-120px 0px -65% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [sections]);

  if (error) return <div className="grid min-h-dvh place-items-center p-6"><Empty icon={QrCode} title="We couldn’t open this menu">{error}. Please scan the QR code on your table again.</Empty></div>;
  if (!data) return <PageLoader />;

  const { restaurant } = data; const cur = restaurant.currency;
  const byId = new Map(data.items.map((i) => [i._id, i]));
  const lines = Object.entries(cart).filter(([id]) => byId.has(id)).map(([id, v]) => ({ item: byId.get(id), ...v }));
  const count = lines.reduce((s, l) => s + l.qty, 0); const total = lines.reduce((s, l) => s + l.qty * l.item.price, 0);
  const add = (id) => setCart((c) => ({ ...c, [id]: { qty: Math.min((c[id]?.qty || 0) + 1, 20), notes: c[id]?.notes || '' } }));
  const sub = (id) => setCart((c) => { const n = { ...c }; if ((n[id]?.qty || 0) <= 1) delete n[id]; else n[id] = { ...n[id], qty: n[id].qty - 1 }; return n; });
  const lastOrder = getOrderCodes(slug)[0];

  const place = async () => {
    setBusy(true);
    try {
      const r = await pub(slug).order({ tableToken: token, customerName: name, items: lines.map((l) => ({ menuItem: l.item._id, qty: l.qty, notes: l.notes })) });
      addOrderCode(slug, r.trackingCode); setCart({}); setOpen(false);
      nav(`/r/${slug}/track/${r.trackingCode}`);
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const jump = (id) => { setCat(id); document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return (
    <div className="mx-auto max-w-2xl pb-36">
      <div className="relative">
        <div className="h-44 overflow-hidden bg-gradient-to-br from-chili/40 via-plum-raised to-saffron/30">{restaurant.banner && <img src={restaurant.banner} alt="" className="h-full w-full object-cover" />}</div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        <div className="absolute -bottom-1 left-0 right-0 flex items-end gap-4 px-5">
          {restaurant.logo && <img src={restaurant.logo} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-ink" />}
          <div className="pb-3"><h1 className="font-display text-3xl font-extrabold leading-none">{restaurant.name}</h1></div>
        </div>
      </div>

      <div className="space-y-3 px-5 pt-5">
        {!token ? <p className="rounded-2xl bg-saffron/15 px-4 py-3 text-sm font-semibold text-saffron ring-1 ring-saffron/30">You’re browsing the menu. Scan the QR code on your table to place an order.</p> : <GuestActions slug={slug} token={token} restaurantName={restaurant.name} />}
        {lastOrder && <Link to={`/r/${slug}/track/${lastOrder}`} className="block rounded-2xl bg-pista/15 px-4 py-3 text-center text-sm font-bold text-pista ring-1 ring-pista/30">Track your last order</Link>}
      </div>

      <div className="sticky top-0 z-20 mt-4 space-y-3 bg-ink/90 px-5 py-3 backdrop-blur">
        <div className="flex gap-2">
          <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-faint" /><input aria-label="Search the menu" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes" className="w-full rounded-xl bg-plum py-2.5 pl-9 pr-3 ring-1 ring-plum-line placeholder:text-warm-faint focus:outline-none focus:ring-2 focus:ring-saffron" /></div>
          <button aria-pressed={vegOnly} onClick={() => setVegOnly(!vegOnly)} className={cx('flex items-center gap-2 rounded-xl px-3.5 text-sm font-bold ring-1', vegOnly ? 'bg-pista/15 text-pista ring-pista' : 'bg-plum text-warm-dim ring-plum-line')}><VegMark veg />Veg</button>
        </div>
        <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Categories">
          {sections.map((s) => <button key={s._id} onClick={() => jump(s._id)} className={cx('shrink-0 rounded-full px-4 py-1.5 text-sm font-bold ring-1 transition', cat === s._id ? 'bg-saffron text-ink ring-saffron' : 'bg-plum text-warm-dim ring-plum-line')}>{s.name}</button>)}
        </nav>
      </div>

      <div className="px-5">
        {sections.length === 0 && <div className="mt-6"><Empty icon={Soup} title="No dishes match">Try a different search or turn off the veg filter.</Empty></div>}
        {sections.map((s) => (
          <section key={s._id} id={`cat-${s._id}`} className="scroll-mt-40 pt-6">
            <h2 className="font-display text-2xl font-extrabold">{s.name}</h2>
            <ul className="mt-3 divide-y divide-plum-line/60">
              {s.items.map((i) => (
                <li key={i._id} className="flex gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-display text-lg font-bold"><VegMark veg={i.isVeg} /><span>{i.name}</span></p>
                    <p className="num mt-0.5 font-bold text-saffron">{money(i.price, cur)}</p>
                    {i.description && <p className="mt-1.5 line-clamp-2 text-sm text-warm-dim">{i.description}</p>}
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-warm-faint"><Timer className="h-3.5 w-3.5" />{i.prepTimeMins} min</p>
                  </div>
                  <div className="flex w-28 shrink-0 flex-col items-center gap-2">
                    <div className="h-24 w-28 overflow-hidden rounded-2xl bg-plum">{i.image ? <img src={i.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-warm-faint"><Soup className="h-7 w-7" /></div>}</div>
                    {token && <Stepper qty={cart[i._id]?.qty} onAdd={() => add(i._id)} onSub={() => sub(i._id)} label={i.name} />}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <AnimatePresence>
        {count > 0 && (
          <motion.div initial={{ y: 90 }} animate={{ y: 0 }} exit={{ y: 90 }} transition={{ type: 'spring', damping: 24, stiffness: 300 }} className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-2xl px-4">
            <button onClick={() => setOpen(true)} className="flex w-full items-center justify-between rounded-2xl bg-saffron px-5 py-4 text-ink shadow-glow active:scale-[.98]">
              <span className="flex items-center gap-3 font-extrabold"><span className="relative"><ShoppingBag className="h-6 w-6" /><span className="num absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] text-saffron">{count}</span></span>View your order</span>
              <span className="num font-display text-xl font-extrabold">{money(total, cur)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={open} onClose={() => setOpen(false)} title="Your order">
        <ul className="divide-y divide-plum-line/60">
          {lines.map((l) => (
            <li key={l.item._id} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="flex min-w-0 items-center gap-2 font-semibold"><VegMark veg={l.item.isVeg} /><span className="truncate">{l.item.name}</span></p>
                <Stepper qty={l.qty} onAdd={() => add(l.item._id)} onSub={() => sub(l.item._id)} label={l.item.name} />
              </div>
              <div className="mt-2 flex items-center gap-3">
                <input aria-label={`Note for ${l.item.name}`} maxLength={200} placeholder="Add a note, e.g. less spicy" value={l.notes} onChange={(e) => setCart((c) => ({ ...c, [l.item._id]: { ...c[l.item._id], notes: e.target.value } }))} className="min-w-0 flex-1 rounded-lg bg-ink/70 px-3 py-1.5 text-sm ring-1 ring-plum-line placeholder:text-warm-faint focus:outline-none focus:ring-2 focus:ring-saffron" />
                <span className="num text-sm font-bold">{money(l.qty * l.item.price, cur)}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-4">
          <Input label="Your name (optional)" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex items-baseline justify-between"><span className="text-warm-dim">Subtotal. Tax is added on the bill.</span><span className="num font-display text-2xl font-extrabold text-saffron">{money(total, cur)}</span></div>
          <Button size="lg" className="w-full" loading={busy} onClick={place}>Place order</Button>
        </div>
      </Modal>
    </div>
  );
}
