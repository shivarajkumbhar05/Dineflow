import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, getToken, setToken } from '../lib/api';
import { connectSocket } from '../lib/socket';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(!!getToken());
  const [socket, setSocket] = useState(null);
  const sockRef = useRef(null);

  const openSocket = useCallback(() => {
    sockRef.current?.disconnect();
    const s = connectSocket(getToken());
    sockRef.current = s; setSocket(s);
  }, []);

  const logout = useCallback(() => {
    setToken(null); setUser(null); setRestaurant(null);
    sockRef.current?.disconnect(); sockRef.current = null; setSocket(null);
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    api('/api/auth/me').then((d) => { setUser(d.user); setRestaurant(d.restaurant); openSocket(); }).catch(logout).finally(() => setLoading(false));
  }, [openSocket, logout]);

  useEffect(() => {
    window.addEventListener('df:unauthorized', logout);
    return () => window.removeEventListener('df:unauthorized', logout);
  }, [logout]);

  const authenticate = async (path, body) => {
    const d = await api(path, { method: 'POST', body, auth: false });
    setToken(d.token); setUser(d.user);
    const me = await api('/api/auth/me');
    setRestaurant(me.restaurant); openSocket();
    return d.user;
  };

  const value = useMemo(() => ({
    user, restaurant, setRestaurant, loading, socket, logout,
    login: (email, password) => authenticate('/api/auth/login', { email, password }),
    register: (b) => authenticate('/api/auth/register', b),
    can: (...roles) => !!user && roles.includes(user.role),
  }), [user, restaurant, loading, socket, logout]); // eslint-disable-line

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
