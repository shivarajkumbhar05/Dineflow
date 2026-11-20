import { useMemo, useState } from 'react';
import { Pencil, Plus, Soup, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks';
import { api } from '../../lib/api';
import ImageUpload from '../../components/ImageUpload';
import { Button, Card, Empty, Input, Modal, PageLoader, Select } from '../../components/ui';
import { cx, money } from '../../lib/format';

export const VegMark = ({ veg }) => (
  <span title={veg ? 'Vegetarian' : 'Non-vegetarian'} className={cx('inline-grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border-2', veg ? 'border-pista' : 'border-chili')}>
    <span className={cx('h-1.5 w-1.5 rounded-full', veg ? 'bg-pista' : 'bg-chili')} />
  </span>
);

const blank = (category = '') => ({ name: '', description: '', price: '', category, isVeg: true, prepTimeMins: 15, image: '', isAvailable: true });

export default function MenuManager() {
  const { restaurant } = useAuth();
  const cats = useAsync(() => api('/api/menu/categories'));
  const items = useAsync(() => api('/api/menu/items'));
  const [active, setActive] = useState('all');
  const [edit, setEdit] = useState(null); const [busy, setBusy] = useState(false);
  const [newCat, setNewCat] = useState('');
  const cur = restaurant?.currency;

  const shown = useMemo(() => (items.data || []).filter((i) => active === 'all' || i.category === active), [items.data, active]);
  if ((cats.loading && !cats.data) || (items.loading && !items.data)) return <PageLoader />;

  const addCat = async (e) => {
    e.preventDefault(); if (!newCat.trim()) return;
    try { await api('/api/menu/categories', { method: 'POST', body: { name: newCat.trim(), sortOrder: (cats.data || []).length + 1 } }); setNewCat(''); cats.reload(); } catch (x) { toast.error(x.message); }
  };
  const delCat = async (c) => { if (!window.confirm(`Delete the category “${c.name}”?`)) return; try { await api(`/api/menu/categories/${c._id}`, { method: 'DELETE' }); if (active === c._id) setActive('all'); cats.reload(); } catch (x) { toast.error(x.message); } };
  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    const body = { ...edit, price: Number(edit.price), prepTimeMins: Number(edit.prepTimeMins) }; delete body._id; delete body.restaurant; delete body.createdAt; delete body.updatedAt; delete body.__v;
    try {
      if (edit._id) await api(`/api/menu/items/${edit._id}`, { method: 'PATCH', body }); else await api('/api/menu/items', { method: 'POST', body });
      setEdit(null); items.reload(); toast.success('Saved');
    } catch (x) { toast.error(x.message); } finally { setBusy(false); }
  };
  const toggle = async (i) => { items.setData((cur2) => cur2.map((x) => (x._id === i._id ? { ...x, isAvailable: !x.isAvailable } : x))); try { await api(`/api/menu/items/${i._id}`, { method: 'PATCH', body: { isAvailable: !i.isAvailable } }); } catch (x) { toast.error(x.message); items.reload(); } };
  const del = async (i) => { if (!window.confirm(`Delete “${i.name}”?`)) return; try { await api(`/api/menu/items/${i._id}`, { method: 'DELETE' }); items.reload(); } catch (x) { toast.error(x.message); } };

  const catName = (id) => (cats.data || []).find((c) => c._id === id)?.name;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-display text-3xl font-extrabold sm:text-4xl">Menu</h1><p className="mt-1 text-warm-dim">Switch a dish off when it runs out and guests stop seeing it immediately.</p></div>
        <Button disabled={!(cats.data || []).length} onClick={() => setEdit(blank(active !== 'all' ? active : cats.data[0]?._id))}><Plus className="h-4 w-4" />Add dish</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit">
          <h2 className="mb-3 font-display text-lg font-bold">Categories</h2>
          <ul className="space-y-1">
            <li><button onClick={() => setActive('all')} className={cx('w-full rounded-lg px-3 py-2 text-left text-sm font-semibold', active === 'all' ? 'bg-saffron text-ink' : 'text-warm-dim hover:bg-white/8')}>All dishes <span className="num float-right">{(items.data || []).length}</span></button></li>
            {(cats.data || []).map((c) => (
              <li key={c._id} className="group flex items-center gap-1">
                <button onClick={() => setActive(c._id)} className={cx('flex-1 truncate rounded-lg px-3 py-2 text-left text-sm font-semibold', active === c._id ? 'bg-saffron text-ink' : 'text-warm-dim hover:bg-white/8')}>{c.name}</button>
                <button onClick={() => delCat(c)} aria-label={`Delete ${c.name}`} className="rounded-lg p-2 text-warm-faint hover:bg-chili/15 hover:text-chili"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
          <form onSubmit={addCat} className="mt-4 flex gap-2"><input aria-label="New category name" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category" className="min-w-0 flex-1 rounded-lg bg-ink/70 px-3 py-2 text-sm ring-1 ring-plum-line focus:outline-none focus:ring-2 focus:ring-saffron" /><Button size="sm" type="submit" aria-label="Add category"><Plus className="h-4 w-4" /></Button></form>
        </Card>

        <div>
          {(cats.data || []).length === 0 ? <Empty icon={Soup} title="Start with a category">Add one on the left, such as Starters or Main course, then add dishes to it.</Empty>
            : shown.length === 0 ? <Empty icon={Soup} title="No dishes here yet" action={<Button onClick={() => setEdit(blank(active !== 'all' ? active : cats.data[0]._id))}>Add a dish</Button>} />
            : (
              <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {shown.map((i) => (
                  <li key={i._id} className={cx('overflow-hidden rounded-2xl bg-plum ring-1 ring-plum-line/70 transition', !i.isAvailable && 'opacity-60')}>
                    <div className="h-36 bg-ink/60">{i.image ? <img src={i.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-warm-faint"><Soup className="h-8 w-8" /></div>}</div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2"><p className="flex items-center gap-2 font-display text-lg font-bold"><VegMark veg={i.isVeg} />{i.name}</p><p className="num font-bold text-saffron">{money(i.price, cur)}</p></div>
                      <p className="mt-0.5 text-xs text-warm-faint">{catName(i.category)} · {i.prepTimeMins} min</p>
                      <div className="mt-3 flex items-center gap-2">
                        <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm font-semibold text-warm-dim">
                          <input type="checkbox" className="peer sr-only" checked={i.isAvailable} onChange={() => toggle(i)} />
                          <span className="relative h-6 w-11 rounded-full bg-plum-line transition peer-checked:bg-pista peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-saffron after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-warm after:transition peer-checked:after:translate-x-5" />
                          {i.isAvailable ? 'Available' : 'Sold out'}
                        </label>
                        <Button variant="soft" size="sm" aria-label={`Edit ${i.name}`} onClick={() => setEdit({ ...i })}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="danger" size="sm" aria-label={`Delete ${i.name}`} onClick={() => del(i)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?._id ? 'Edit dish' : 'Add a dish'} wide>
        {edit && (
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-4">
              <Input label="Name" required maxLength={120} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              <Input label={`Price (${cur || 'INR'})`} type="number" min="0" step="0.5" required value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} />
              <Select label="Category" required value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{(cats.data || []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</Select>
              <Input label="Prep time (minutes)" type="number" min="1" value={edit.prepTimeMins} onChange={(e) => setEdit({ ...edit, prepTimeMins: e.target.value })} />
            </div>
            <div className="space-y-4">
              <ImageUpload kind="food" label="Dish photo" value={edit.image} onChange={(url) => setEdit({ ...edit, image: url })} />
              <label className="block"><span className="mb-1.5 block text-sm font-semibold text-warm-dim">Description</span><textarea rows={3} maxLength={500} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className="w-full rounded-xl bg-ink/70 px-3.5 py-3 ring-1 ring-plum-line focus:outline-none focus:ring-2 focus:ring-saffron" /></label>
              <div className="flex gap-2">{[true, false].map((v) => <button type="button" key={String(v)} onClick={() => setEdit({ ...edit, isVeg: v })} className={cx('flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold ring-1', edit.isVeg === v ? 'bg-white/12 ring-saffron' : 'ring-plum-line text-warm-dim')}><VegMark veg={v} />{v ? 'Veg' : 'Non-veg'}</button>)}</div>
            </div>
            <Button type="submit" className="sm:col-span-2" loading={busy}>Save dish</Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
