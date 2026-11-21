const defaultApiUrl = import.meta.env.PROD
  ? 'https://dineflow-6uzf.onrender.com'
  : 'http://localhost:5000';
export const API_URL = (import.meta.env.VITE_API_URL || defaultApiUrl).replace(/\/$/, '');
const TOKEN_KEY = 'df_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

/** Thin fetch wrapper. Staff calls attach the JWT; pass { auth: false } for public calls. */
export async function api(path, { method = 'GET', body, form, auth = true } = {}) {
  const headers = {};
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  if (body) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && auth) window.dispatchEvent(new Event('df:unauthorized'));
    throw new ApiError(data.error || 'Something went wrong', res.status);
  }
  return data;
}

export const pub = (slug) => ({
  menu: () => api(`/api/public/${slug}/menu`, { auth: false }),
  order: (body) => api(`/api/public/${slug}/orders`, { method: 'POST', body, auth: false }),
  track: (code) => api(`/api/public/${slug}/orders/${code}`, { auth: false }),
  call: (body) => api(`/api/public/${slug}/waiter-call`, { method: 'POST', body, auth: false }),
  bill: (body) => api(`/api/public/${slug}/bill/view`, { method: 'POST', body, auth: false }),
  pay: (body) => api(`/api/public/${slug}/bill/pay`, { method: 'POST', body, auth: false }),
});
