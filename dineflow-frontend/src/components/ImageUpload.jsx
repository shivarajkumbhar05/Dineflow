import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Spinner } from './ui';

/** Uploads to POST /api/uploads/:kind (Cloudinary) and returns the hosted URL. */
export default function ImageUpload({ kind, value, onChange, label = 'Photo' }) {
  const ref = useRef(); const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append('file', file); setBusy(true);
    try { const r = await api(`/api/uploads/${kind}`, { method: 'POST', form: fd }); onChange(r.url); }
    catch (x) { toast.error(x.message); } finally { setBusy(false); e.target.value = ''; }
  };
  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-warm-dim">{label}</span>
      <button type="button" onClick={() => ref.current.click()} className="relative grid h-36 w-full place-items-center overflow-hidden rounded-xl bg-ink/70 ring-1 ring-plum-line hover:ring-saffron">
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-1 text-sm text-warm-dim"><ImagePlus className="h-6 w-6" />Upload an image</span>}
        {busy && <span className="absolute inset-0 grid place-items-center bg-ink/70"><Spinner /></span>}
      </button>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} />
    </div>
  );
}
