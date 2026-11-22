// The table QR link is /r/<slug>?t=<qrToken>. Keep the token so refreshing the page doesn't lose the table.
const tk = (slug) => `df_table_${slug}`;
const orderKey = (slug) => `df_last_order_${slug}`;
export const getTableToken = (slug) => { try { return localStorage.getItem(tk(slug)) || ''; } catch { return ''; } };
export const saveTableToken = (slug, t) => { try { localStorage.setItem(tk(slug), t); } catch { /* private mode */ } };
export const getLastOrder = (slug, token) => {
  try {
    const saved = JSON.parse(localStorage.getItem(orderKey(slug)) || 'null');
    return saved?.tableToken === token && typeof saved.trackingCode === 'string' ? saved.trackingCode : '';
  } catch { return ''; }
};
export const saveLastOrder = (slug, token, trackingCode) => {
  try { localStorage.setItem(orderKey(slug), JSON.stringify({ tableToken: token, trackingCode })); } catch { /* private mode */ }
};
