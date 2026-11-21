// The table QR link is /r/<slug>?t=<qrToken>. Keep the token so refreshing the page doesn't lose the table.
const tk = (slug) => `df_table_${slug}`;
export const getTableToken = (slug) => { try { return localStorage.getItem(tk(slug)) || ''; } catch { return ''; } };
export const saveTableToken = (slug, t) => { try { localStorage.setItem(tk(slug), t); } catch { /* private mode */ } };
