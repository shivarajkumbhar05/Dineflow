import { useEffect, useRef, useState } from 'react';
import { api } from './lib/api';

/** Subscribe to Socket.IO events; handlers can change between renders without resubscribing. */
export function useLive(socket, handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    if (!socket) return undefined;
    const entries = Object.keys(ref.current).map((ev) => [ev, (p) => ref.current[ev]?.(p)]);
    entries.forEach(([ev, fn]) => socket.on(ev, fn));
    return () => entries.forEach(([ev, fn]) => socket.off(ev, fn));
  }, [socket]);
}

/** Re-render every `ms` so "x min" timers on tickets stay fresh. */
export function useTick(ms = 30000) {
  const [, set] = useState(0);
  useEffect(() => { const t = setInterval(() => set((n) => n + 1), ms); return () => clearInterval(t); }, [ms]);
}

/** Load data once and expose a reload + setter for live patches. */
export function useAsync(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const reload = () => { setLoading(true); return fn().then((d) => { setData(d); setError(''); return d; }).catch((e) => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(() => { reload(); }, deps); // eslint-disable-line
  return { data, setData, error, loading, reload };
}

/** Orders list kept in sync with the socket (new orders + status changes). */
export function useOrders(socket, query = '') {
  const state = useAsync(() => api(`/api/orders${query}`), [query]);
  const { setData } = state;
  useLive(socket, {
    'order:new': (o) => setData((cur) => (cur && !cur.some((x) => x._id === o._id) ? [o, ...cur] : cur)),
    'order:status': (p) => setData((cur) => cur && cur.map((x) => (x._id === p.orderId ? { ...x, status: p.status } : x))),
    'payment:confirmed': (p) => {
      const paidOrderIds = new Set((p.orderIds || []).map(String));
      setData((cur) => cur && cur.filter((order) => !paidOrderIds.has(String(order._id))));
    },
  });
  return state;
}
