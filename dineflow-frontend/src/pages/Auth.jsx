import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button, Input, Logo } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { ROLE_HOME } from '../lib/format';

function Shell({ title, sub, children, foot }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-slate-50 px-5 py-10 text-slate-900">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-7 inline-block text-slate-900"><Logo /></Link>
        <div className="rounded-2xl bg-white p-7 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200 sm:p-9">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Restaurant operations</p>
          <h1 className="font-display text-3xl font-extrabold text-slate-950">{title}</h1>
          <p className="mt-1.5 text-sm leading-6 text-slate-600">{sub}</p>
          <div className="mt-7">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm text-slate-600">{foot}</p>
      </div>
    </div>
  );
}

const useForm = (fn) => {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { await fn(); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  return { busy, err, submit };
};

export function Login() {
  const { user, login } = useAuth(); const nav = useNavigate();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const f = useForm(async () => { const u = await login(email, password); nav(ROLE_HOME[u.role] || '/app'); });
  if (user) return <Navigate to={ROLE_HOME[user.role] || '/app'} replace />;
  return (
    <Shell title="Welcome back" sub="Sign in to manage your floor, kitchen, and orders." foot={<>New here? <Link className="font-bold text-amber-800 hover:text-amber-900" to="/register">Create a restaurant account</Link></>}>
      <form onSubmit={f.submit} className="space-y-4">
        <Input variant="light" label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input variant="light" label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {f.err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200">{f.err}</p>}
        <Button type="submit" variant="dark" size="lg" className="w-full" loading={f.busy}>Sign in</Button>
        {import.meta.env.VITE_SHOW_DEMO === 'true' && (
          <Button type="button" variant="outline" className="w-full" onClick={() => { setEmail('owner@demo.test'); setPassword('Demo@12345'); }}>Fill in the demo account</Button>
        )}
      </form>
    </Shell>
  );
}

export function Register() {
  const { user, register } = useAuth(); const nav = useNavigate();
  const [v, setV] = useState({ restaurantName: '', name: '', email: '', password: '' });
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const f = useForm(async () => { await register(v); nav('/app'); });
  if (user) return <Navigate to={ROLE_HOME[user.role] || '/app'} replace />;
  return (
    <Shell title="Set up your restaurant" sub="Create your owner account. You can invite your team afterwards." foot={<>Already registered? <Link className="font-bold text-amber-800 hover:text-amber-900" to="/login">Sign in</Link></>}>
      <form onSubmit={f.submit} className="space-y-4">
        <Input variant="light" label="Restaurant name" required value={v.restaurantName} onChange={set('restaurantName')} />
        <Input variant="light" label="Your name" autoComplete="name" required value={v.name} onChange={set('name')} />
        <Input variant="light" label="Email" type="email" autoComplete="email" required value={v.email} onChange={set('email')} />
        <Input variant="light" label="Password" type="password" autoComplete="new-password" minLength={8} required value={v.password} onChange={set('password')} hint="At least 8 characters." />
        {f.err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200">{f.err}</p>}
        <Button type="submit" variant="dark" size="lg" className="w-full" loading={f.busy}>Create account</Button>
      </form>
    </Shell>
  );
}
