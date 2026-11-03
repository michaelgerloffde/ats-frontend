import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { Button, Field } from '../components/ui.jsx';

export default function Login() {
  const { user, login } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      const from = location.state?.from;
      navigate(from?.startsWith('/admin') ? from : '/admin');
    } catch (err) {
      setError(err.message); // 401: falsche Daten · 429: gesperrt · 0: Server nicht erreichbar
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-6 max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold">Anmeldung für Recruiter:innen</h1>
      {error && <p role="alert" className="mt-4 rounded-lg border-l-4 border-red-600 bg-red-50 px-4 py-3 text-red-900">{error}</p>}
      <form onSubmit={submit} className="mt-6 grid gap-4">
        <Field id="email" label="E-Mail">
          {(p) => <input type="email" autoComplete="username" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} {...p} />}
        </Field>
        <Field id="password" label="Passwort">
          {(p) => <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} {...p} />}
        </Field>
        <Button type="submit" disabled={busy} className="w-full">Anmelden</Button>
      </form>
      <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <p className="font-semibold">Demo-Zugänge (Mock):</p>
        <p>admin@kranich.test · Admin!Demo2026</p>
        <p>recruiter@kranich.test · Recruiter!Demo2026</p>
      </div>
      <p className="mt-4 text-sm"><Link to="/" className="text-brand-700 hover:underline">← Zur Karriereseite</Link></p>
    </div>
  );
}
