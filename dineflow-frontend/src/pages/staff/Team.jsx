import { useState } from 'react';
import { Clock, Pencil, Plus, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks';
import { api } from '../../lib/api';
import { Button, Card, Input, Modal, PageLoader, Pill, Select } from '../../components/ui';

const ROLES = { manager: 'Manager', waiter: 'Waiter', kitchen: 'Kitchen', cashier: 'Cashier' };
const BLURB = { owner: 'Full access', manager: 'Everything except creating managers', waiter: 'Order and guest-request alerts', kitchen: 'Kitchen board', cashier: 'Tables and billing' };

export default function Team() {
  const { user } = useAuth();
  const { data, loading, reload } = useAsync(() => api('/api/auth/staff'));
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [editing, setEditing] = useState(null);
  const [shiftsOpen, setShiftsOpen] = useState(false); const [shiftsLoading, setShiftsLoading] = useState(false); const [shifts, setShifts] = useState([]); const [selectedWaiter, setSelectedWaiter] = useState('');
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'waiter' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const roles = user.role === 'owner' ? Object.keys(ROLES) : Object.keys(ROLES).filter((r) => r !== 'manager');

  const close = () => { setOpen(false); setEditing(null); setF({ name: '', email: '', password: '', role: 'waiter' }); };
  const edit = (member) => {
    setEditing(member);
    setF({ name: member.name, email: member.email, password: '', role: member.role });
    setOpen(true);
  };
  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      if (editing) {
        const body = { name: f.name, email: f.email, role: f.role };
        if (f.password) body.password = f.password;
        await api(`/api/auth/staff/${editing._id}`, { method: 'PATCH', body });
        toast.success(`${f.name}'s account updated`);
      } else {
        await api('/api/auth/staff', { method: 'POST', body: f });
        toast.success(`${f.name} can now sign in`);
      }
      close(); reload();
    }
    catch (x) { toast.error(x.message); } finally { setBusy(false); }
  };
  const setActive = async (member) => {
    if (member.isActive && !window.confirm(`Deactivate ${member.name}'s account? They will no longer be able to sign in.`)) return;
    try {
      if (member.isActive) await api(`/api/auth/staff/${member._id}`, { method: 'DELETE' });
      else await api(`/api/auth/staff/${member._id}`, { method: 'PATCH', body: { isActive: true } });
      toast.success(member.isActive ? 'Account deactivated' : 'Account reactivated');
      reload();
    } catch (x) { toast.error(x.message); }
  };
  const viewShifts = async (member) => {
    setSelectedWaiter(member.name);
    setShifts([]);
    setShiftsOpen(true);
    setShiftsLoading(true);
    try { setShifts(await api(`/api/auth/staff/${member._id}/shifts`)); }
    catch (x) { toast.error(x.message); }
    finally { setShiftsLoading(false); }
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
          <Card key={m._id} className="flex flex-wrap items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-saffron/15 font-display text-lg font-extrabold text-saffron">{m.name?.[0]?.toUpperCase() || <UserRound />}</span>
            <div className="min-w-0 flex-1"><p className="truncate font-bold">{m.name}</p><p className="truncate text-sm text-warm-dim">{m.email}</p><p className="mt-1 text-xs text-warm-faint">{BLURB[m.role]}</p></div>
            <div className="flex items-center gap-2"><Pill tone={m.role === 'owner' ? 'warn' : 'neutral'}>{m.role}</Pill><Pill tone={m.isActive ? 'good' : 'bad'}>{m.isActive ? 'Active' : 'Inactive'}</Pill></div>
            {m.role !== 'owner' && String(m._id) !== String(user.id) && !(user.role === 'manager' && m.role === 'manager') && (
              <div className="flex w-full gap-2 sm:w-auto">
                {m.role === 'waiter' && <Button variant="soft" size="sm" onClick={() => viewShifts(m)}><Clock className="h-4 w-4" />Check-ins</Button>}
                <Button variant="soft" size="sm" onClick={() => edit(m)}><Pencil className="h-4 w-4" />Edit</Button>
                <Button variant={m.isActive ? 'danger' : 'success'} size="sm" onClick={() => setActive(m)}>{m.isActive ? 'Deactivate' : 'Reactivate'}</Button>
              </div>
            )}
          </Card>
        ))}
      </ul>
      <Modal open={open} onClose={close} title={editing ? 'Edit team member' : 'Add a team member'}>
        <form onSubmit={save} className="space-y-4">
          <Input label="Full name" required value={f.name} onChange={set('name')} />
          <Input label="Email" type="email" required value={f.email} onChange={set('email')} />
          <Input label={editing ? 'New password (optional)' : 'Temporary password'} type="password" minLength={8} required={!editing} value={f.password} onChange={set('password')} hint="At least 8 characters. Share it privately." />
          <Select label="Role" value={f.role} onChange={set('role')}>{roles.map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}</Select>
          <Button type="submit" className="w-full" loading={busy}>{editing ? 'Save changes' : 'Create login'}</Button>
        </form>
      </Modal>
      <Modal open={shiftsOpen} onClose={() => setShiftsOpen(false)} title={`${selectedWaiter} check-in history`}>
        {shiftsLoading ? <PageLoader /> : shifts.length === 0 ? <p className="text-sm text-warm-dim">No check-ins recorded yet.</p> : (
          <ul className="space-y-3">
            {shifts.map((shift) => (
              <li key={shift._id} className="rounded-xl bg-ink/70 p-3 text-sm ring-1 ring-plum-line">
                <p><span className="font-semibold text-warm-dim">Check-in:</span> {new Date(shift.checkedInAt).toLocaleString()}</p>
                <p className="mt-1"><span className="font-semibold text-warm-dim">Check-out:</span> {shift.checkedOutAt ? new Date(shift.checkedOutAt).toLocaleString() : 'Currently checked in'}</p>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
