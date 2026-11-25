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

// Clear multi-tone alert that is reusable and unlocked by an iPhone/iPad tap.
let ctx;
export async function unlockDing() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') await ctx.resume();
  } catch {
    ctx = null;
  }
  return Boolean(ctx);
}

export function ding(freq = 880) {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const tones = [freq, freq * 1.25, freq * 1.5];
    tones.forEach((f, index) => setTimeout(() => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, ctx.currentTime);
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.42, ctx.currentTime + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.48);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.5);
    }, index * 150));
  } catch { /* iOS requires unlockDing() after a tap */ }
}
