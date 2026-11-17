import { useState } from 'react';
import { createUser, getUsers, toggleUser } from '../../api';
import { useAsync } from '../../hooks/useAsync.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Button, Card, ErrorState, Field, Loading, PageHeader, Table } from '../../components/ui.jsx';

const EMPTY = { name: '', email: '', role: 'recruiter', password: '' };

export default function Users() {
  const { user: me } = useSession();
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => getUsers(), []);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const toggle = async (id) => {
    try {
      await toggleUser(id);
      toast('Zugang aktualisiert.');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const create = async (e) => {
    e.preventDefault();
    try {
      await createUser(form);
      toast('Zugang angelegt.');
      setForm(EMPTY);
      setErrors({});
      reload();
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      else toast(err.message, 'error');
    }
  };

  return (
    <>
      <PageHeader title="Nutzer:innen" />
      <Table head={['Name', 'E-Mail', 'Rolle', 'Status', '']}>
        {data.users.map((u) => (
          <tr key={u.id}>
            <td className="px-4 py-3 font-medium">{u.name}</td>
            <td className="px-4 py-3">{u.email}</td>
            <td className="px-4 py-3">{u.role === 'admin' ? 'Administrator:in' : 'Recruiter:in'}</td>
            <td className="px-4 py-3">{u.active ? 'aktiv' : <span className="text-slate-400">deaktiviert</span>}</td>
            <td className="px-4 py-3 text-right">
              {u.id !== me.id && (
                <button type="button" onClick={() => toggle(u.id)} className="text-brand-700 hover:underline">{u.active ? 'Deaktivieren' : 'Aktivieren'}</button>
              )}
            </td>
          </tr>
        ))}
      </Table>

      <Card className="mt-8 max-w-3xl">
        <h2 className="mb-4 font-bold">Neuen Zugang anlegen</h2>
        <form onSubmit={create} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Name" error={errors.name}>{(p) => <input value={form.name} onChange={set('name')} {...p} />}</Field>
          <Field id="email" label="E-Mail" error={errors.email}>{(p) => <input type="email" value={form.email} onChange={set('email')} {...p} />}</Field>
          <Field id="role" label="Rolle" error={errors.role}>
            {(p) => (
              <select value={form.role} onChange={set('role')} {...p}>
                <option value="recruiter">Recruiter:in</option>
                <option value="admin">Administrator:in</option>
              </select>
            )}
          </Field>
          <Field id="password" label="Startpasswort" hint="Mindestens 15 Zeichen." error={errors.password}>
            {(p) => <input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} {...p} />}
          </Field>
          <Button type="submit" className="justify-self-start">Zugang anlegen</Button>
        </form>
      </Card>
    </>
  );
}
