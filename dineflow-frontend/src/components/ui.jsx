import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { cx, ORDER_STATUS } from '../lib/format';

const BTN = {
  primary: 'bg-saffron text-ink hover:bg-[#ffc24d] shadow-glow font-bold',
  dark: 'bg-slate-900 text-white hover:bg-slate-700 shadow-none font-bold',
  outline: 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 shadow-none',
  soft: 'bg-white/10 hover:bg-white/15 text-warm ring-1 ring-white/10',
  ghost: 'text-warm-dim hover:text-warm hover:bg-white/10',
  danger: 'bg-chili/15 text-chili hover:bg-chili/25 ring-1 ring-chili/30',
  success: 'bg-pista text-ink hover:brightness-110 font-bold',
};
export function Button({ variant = 'primary', size = 'md', loading, className, children, ...p }) {
  return (
    <button
      {...p}
      disabled={p.disabled || loading}
      className={cx('inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.97] disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'lg' ? 'px-6 py-3.5 text-base' : 'px-4 py-2.5 text-sm', BTN[variant], className)}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export const Input = ({ label, hint, className, variant = 'default', ...p }) => (
  <label className="block">
    {label && <span className={cx('mb-1.5 block text-sm font-semibold', variant === 'light' ? 'text-slate-600' : 'text-warm-dim')}>{label}</span>}
    <input {...p} className={cx('w-full rounded-xl px-3.5 py-3 ring-1 focus:outline-none focus:ring-2', variant === 'light'
      ? 'bg-white text-slate-900 ring-slate-300 placeholder:text-slate-400 focus:ring-amber-500'
      : 'bg-ink/70 text-warm ring-plum-line placeholder:text-warm-faint focus:ring-saffron', className)} />
    {hint && <span className={cx('mt-1 block text-xs', variant === 'light' ? 'text-slate-500' : 'text-warm-faint')}>{hint}</span>}
  </label>
);

export const Select = ({ label, children, className, ...p }) => (
  <label className="block">
    {label && <span className="mb-1.5 block text-sm font-semibold text-warm-dim">{label}</span>}
    <select {...p} className={cx('w-full rounded-xl bg-ink/70 px-3.5 py-3 text-warm ring-1 ring-plum-line focus:outline-none focus:ring-2 focus:ring-saffron', className)}>{children}</select>
  </label>
);

export const Card = ({ className, children, ...p }) => (
  <div {...p} className={cx('rounded-2xl bg-plum p-5 ring-1 ring-plum-line/70', className)}>{children}</div>
);

export const StatusPill = ({ status }) => {
  const s = ORDER_STATUS[status] || ORDER_STATUS.served;
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1', s.color)}>{s.label}</span>;
};

const TONES = { neutral: 'bg-white/5 text-warm-dim ring-white/10', good: 'bg-pista/15 text-pista ring-pista/40', warn: 'bg-saffron/15 text-saffron ring-saffron/40', bad: 'bg-chili/15 text-chili ring-chili/40', info: 'bg-sky/15 text-sky ring-sky/40' };
export const Pill = ({ tone = 'neutral', children }) => (
  <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1', TONES[tone])}>{children}</span>
);

export const Spinner = ({ className }) => <Loader2 className={cx('animate-spin text-saffron', className || 'h-6 w-6')} />;
export const PageLoader = () => <div className="grid min-h-[50vh] place-items-center"><Spinner className="h-8 w-8" /></div>;

export const Empty = ({ icon: Icon, title, children, action }) => (
  <div className="grid place-items-center rounded-2xl border-2 border-dashed border-plum-line px-6 py-14 text-center">
    {Icon && <Icon className="mb-3 h-9 w-9 text-warm-faint" />}
    <p className="font-display text-lg font-bold">{title}</p>
    {children && <p className="mt-1 max-w-sm text-sm text-warm-dim">{children}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/** Bottom sheet on mobile, centred dialog on desktop. */
export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className={cx('relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-plum p-6 ring-1 ring-plum-line sm:rounded-3xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="font-display text-xl font-bold">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-warm-dim hover:bg-white/10 hover:text-warm"><X className="h-5 w-5" /></button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export const Logo = ({ className }) => (
  <span className={cx('inline-flex items-center gap-2 font-display text-xl font-extrabold', className)}>
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-saffron text-ink shadow-glow">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4v7a3 3 0 0 0 3 3v6M8 4v6M11 4v7a3 3 0 0 1-3 3M17 20V4c-2 1-3.5 4-3.5 8H17" /></svg>
    </span>
    DineFlow
  </span>
);
