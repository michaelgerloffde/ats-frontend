import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createJob, deleteJob, getAdminJob, updateJob } from '../../api';
import { useSession } from '../../context/SessionContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { EMPLOYMENT_TYPES, JOB_STATUSES } from '../../lib/constants.js';
import { Breadcrumb, Button, Card, ErrorState, Field, Loading, PageHeader } from '../../components/ui.jsx';

const EMPTY = { title: '', department: '', location: '', employment_type: 'Vollzeit', description: '', requirements: '', status: 'draft' };

export default function JobForm() {
  const { id } = useParams(); // vorhanden = bearbeiten, fehlt = neu anlegen
  const { isAdmin } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(id ? null : EMPTY);
  const [loadError, setLoadError] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id) getAdminJob(id).then((d) => setForm(d.job)).catch(setLoadError);
  }, [id]);

  if (loadError) return <ErrorState error={loadError} />;
  if (!form) return <Loading />;
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (id) await updateJob(id, form);
      else await createJob(form);
      toast(id ? 'Die Stelle wurde gespeichert.' : 'Die Stelle wurde angelegt.');
      navigate('/admin/jobs');
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      else toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Stelle endgültig löschen?')) return;
    try {
      await deleteJob(id);
      toast('Die Stelle wurde gelöscht.');
      navigate('/admin/jobs');
    } catch (err) {
      toast(err.message, 'error'); // z. B. 409: hat noch Bewerbungen
    }
  };

  const title = id ? 'Stelle bearbeiten' : 'Neue Stelle';
  return (
    <div className="max-w-4xl">
      <Breadcrumb items={[{ label: 'Stellen', to: '/admin/jobs' }, { label: title }]} />
      <PageHeader title={title} />
      <form onSubmit={submit} noValidate>
        <Card className="grid gap-5">
          <Field id="title" label="Titel *" error={errors.title} hint="Geschlechtsneutral formulieren (AGG), z. B. mit „(m/w/d)“ oder Doppelpunkt.">
            {(p) => <input maxLength={150} placeholder="z. B. Disponent:in Straßenverkehr (m/w/d)" value={form.title} onChange={set('title')} {...p} />}
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field id="department" label="Bereich *" error={errors.department}>
              {(p) => <input maxLength={100} value={form.department} onChange={set('department')} {...p} />}
            </Field>
            <Field id="location" label="Standort *" error={errors.location}>
              {(p) => <input maxLength={100} value={form.location} onChange={set('location')} {...p} />}
            </Field>
            <Field id="employment_type" label="Anstellung *" error={errors.employment_type}>
              {(p) => <select value={form.employment_type} onChange={set('employment_type')} {...p}>{EMPLOYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select>}
            </Field>
          </div>
          <Field id="description" label="Aufgaben *" error={errors.description} hint="Mindestens 20 Zeichen. Zeilenumbrüche bleiben erhalten.">
            {(p) => <textarea rows={6} value={form.description} onChange={set('description')} {...p} />}
          </Field>
          <Field id="requirements" label="Anforderungen *" error={errors.requirements} hint="Keine Altersangaben wie „junges Team“ – das ist nach dem AGG unzulässig.">
            {(p) => <textarea rows={5} value={form.requirements} onChange={set('requirements')} {...p} />}
          </Field>
          <Field id="status" label="Status" error={errors.status} hint="Nur veröffentlichte Stellen erscheinen auf der Karriereseite." className="sm:max-w-xs">
            {(p) => <select value={form.status} onChange={set('status')} {...p}>{Object.entries(JOB_STATUSES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}
          </Field>
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={busy}>Speichern</Button>
            <Link to="/admin/jobs" className="text-slate-600 hover:underline">Abbrechen</Link>
          </div>
        </Card>
      </form>

      {id && isAdmin && (
        <section className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="font-bold">Stelle löschen</h2>
          <p className="mt-1 text-sm text-slate-700">Nur möglich, solange keine Bewerbungen existieren. Ansonsten bitte auf „Geschlossen“ setzen.</p>
          <Button variant="danger" className="mt-3" onClick={remove}>Stelle löschen</Button>
        </section>
      )}
    </div>
  );
}
