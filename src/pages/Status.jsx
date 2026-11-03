import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getApplicationStatus, withdrawApplication } from '../api';
import { useAsync } from '../hooks/useAsync.js';
import { STAGES, stageLabel } from '../lib/constants.js';
import { formatDate } from '../lib/format.js';
import { Button, ErrorState, Loading } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Status() {
  const { token } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, error, loading } = useAsync(() => getApplicationStatus(token), [token]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  const { application: app, history } = data;
  const current = STAGES.find((s) => s.key === app.status);
  const reached = history.map((h) => h.to_status);

  // Laufend: Zwischenschritte + "Eingestellt" als Ziel. Abgeschlossen: nur durchlaufene Schritte.
  const steps = STAGES.filter((s) =>
    s.key === app.status || (current.final ? reached.includes(s.key) : s.key !== 'rejected'));

  const withdraw = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await withdrawApplication(token);
      toast('Deine Bewerbung wurde zurückgezogen und alle Daten wurden gelöscht.');
      navigate('/');
    } catch (err) {
      toast(err.message, 'error');
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Deine Bewerbung</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{app.job_title}</h1>

      {state?.justCreated && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold">Vielen Dank! Speichere Dir diesen Link</h2>
          <p className="mt-1 text-slate-700">
            Über diese Seite siehst Du jederzeit, wo Deine Bewerbung steht, und kannst sie zurückziehen.
            Ein Konto brauchst Du nicht. Behandle den Link wie ein Passwort.
          </p>
          <code className="mt-3 block break-all rounded-md border border-amber-200 bg-white px-3 py-2 text-sm">{window.location.href}</code>
        </div>
      )}

      <h2 className="mt-8 mb-3 text-lg font-bold">Aktueller Stand</h2>
      <ol className="flex flex-wrap gap-2" aria-label="Fortschritt der Bewerbung">
        {steps.map((s) => {
          const isCurrent = s.key === app.status;
          const done = !isCurrent && reached.includes(s.key);
          return (
            <li key={s.key} aria-current={isCurrent ? 'step' : undefined}
              className={`flex-[1_1_7rem] rounded-lg px-3 py-2.5 text-sm font-semibold ${isCurrent ? 'bg-brand-600 text-white' : done ? 'bg-brand-50 text-brand-700' : 'border border-slate-200 bg-white text-slate-400'}`}>
              {done && '✓ '}{s.label}
            </li>
          );
        })}
      </ol>

      <h2 className="mt-8 mb-3 text-lg font-bold">Verlauf</h2>
      <ul className="grid gap-2">
        {history.map((h, i) => (
          <li key={i} className="border-l-2 border-slate-200 pl-4">
            <span className="block text-xs text-slate-500">{formatDate(h.changed_at, true)}</span>
            {stageLabel(h.to_status)}
          </li>
        ))}
      </ul>

      {app.delete_after && <p className="mt-4 text-sm text-slate-500">Deine Daten werden am {formatDate(app.delete_after)} automatisch gelöscht.</p>}

      <section className="mt-10 rounded-xl border border-red-200 bg-red-50 p-5">
        <h2 className="font-bold">Bewerbung zurückziehen</h2>
        <p className="mt-1 text-slate-700">Du kannst Deine Einwilligung jederzeit widerrufen. Dann löschen wir sofort alle Deine Daten und Unterlagen. Das lässt sich nicht rückgängig machen.</p>
        <form onSubmit={withdraw} className="mt-4 grid gap-3">
          <label className="flex gap-3">
            <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-1 h-4 w-4 accent-red-700" />
            <span>Ja, ich möchte meine Bewerbung zurückziehen und alle Daten löschen.</span>
          </label>
          <Button type="submit" variant="danger" disabled={!confirm || busy} className="justify-self-start">Zurückziehen und löschen</Button>
        </form>
      </section>
    </div>
  );
}
