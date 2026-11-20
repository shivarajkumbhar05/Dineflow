export const money = (n, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n || 0);

export const timeAgo = (d) => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const minutesSince = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 60000);

export const ORDER_STATUS = {
  placed:    { label: 'New',       color: 'text-saffron bg-saffron/15 ring-saffron/40' },
  accepted:  { label: 'Cooking',   color: 'text-chili bg-chili/15 ring-chili/40' },
  preparing: { label: 'Cooking',   color: 'text-chili bg-chili/15 ring-chili/40' },
  ready:     { label: 'Ready',     color: 'text-pista bg-pista/15 ring-pista/40' },
  served:    { label: 'Served',    color: 'text-warm-dim bg-white/5 ring-white/10' },
  cancelled: { label: 'Cancelled', color: 'text-warm-faint bg-white/5 ring-white/10 line-through' },
};

// Mirrors the backend FLOW so buttons only offer valid moves.
export const NEXT_STATUS = { placed: 'preparing', accepted: 'preparing', preparing: 'ready', ready: 'served' };
export const NEXT_LABEL = { placed: 'Start cooking', accepted: 'Start cooking', preparing: 'Mark ready', ready: 'Mark served' };
export const orderNumber = (id) => String(id || '').slice(-6).toUpperCase();

export const ROLE_HOME = { owner: '/app', manager: '/app', kitchen: '/app/kitchen', waiter: '/app/floor', cashier: '/app/billing' };
export const cx = (...a) => a.filter(Boolean).join(' ');

// Short two-tone "ding" so staff notice new tickets without looking at the screen.
let ctx;
export function ding(freq = 880) {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const tone = (f, delay, peak) => setTimeout(() => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(peak, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.45);
    }, delay);
    tone(freq, 0, 0.18); tone(freq * 1.5, 140, 0.12);
  } catch { /* audio is blocked until the first interaction */ }
}
