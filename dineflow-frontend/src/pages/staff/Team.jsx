import { useState } from 'react';
import { Plus, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks';
import { api } from '../../lib/api';
import { Button, Card, Input, Modal, PageLoader, Pill, Select } from '../../components/ui';

const ROLES = { manager: 'Manager', waiter: 'Waiter', kitchen: 'Kitchen', cashier: 'Cashier' };
const BLURB = { owner: 'Full access', manager: 'Everything except creating managers', waiter: 'Floor, tables and billing', kitchen: 'Kitchen board', cashier: 'Tables and billing' };

export default function Team() {
  const { user } = useAuth();
  const { data, loading, reload } = useAsync(() => api('/api/auth/staff'));
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'waiter' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const roles = user.role === 'owner' ? Object.keys(ROLES) : Object.keys(ROLES).filter((r) => r !== 'manager');

  const add = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api('/api/auth/staff', { method: 'POST', body: f }); toast.success(`${f.name} can now sign in`); setOpen(false); setF({ name: '', email: '', password: '', role: 'waiter' }); reload(); }
    catch (x) { toast.error(x.message); } finally { setBusy(false); }
  };
  if (loading && !data) return <PageLoader />;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-display text-3xl font-extrabold sm:text-4xl">Team</h1><p className="mt-1 text-warm-dim">Give each person their own login. They only see the screens their role needs.</p></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Add team member</Button>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(data || []).map((m) => (
          <Card key={m._id} className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-saffron/15 font-display text-lg font-extrabold text-saffron">{m.name?.[0]?.toUpperCase() || <UserRound />}</span>
            <div className="min-w-0 flex-1"><p className="truncate font-bold">{m.name}</p><p className="truncate text-sm text-warm-dim">{m.email}</p><p className="mt-1 text-xs text-warm-faint">{BLURB[m.role]}</p></div>
            <Pill tone={m.role === 'owner' ? 'warn' : 'neutral'}>{m.role}</Pill>
          </Card>
        ))}
      </ul>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a team member">
        <form onSubmit={add} className="space-y-4">
          <Input label="Full name" required value={f.name} onChange={set('name')} />
          <Input label="Email" type="email" required value={f.email} onChange={set('email')} />
          <Input label="Temporary password" type="password" minLength={8} required value={f.password} onChange={set('password')} hint="At least 8 characters. Share it privately." />
          <Select label="Role" value={f.role} onChange={set('role')}>{roles.map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}</Select>
          <Button type="submit" className="w-full" loading={busy}>Create login</Button>
        </form>
      </Modal>
    </div>
  );
}
