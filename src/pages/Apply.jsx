import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { applyToJob, getJob } from '../api';
import { useAsync } from '../hooks/useAsync.js';
import { MAX_UPLOAD_BYTES } from '../lib/constants.js';
import { formatBytes } from '../lib/format.js';
import { Breadcrumb, Button, Card, ErrorState, Field, Loading } from '../components/ui.jsx';

const EMPTY = { firstName: '', lastName: '', email: '', phone: '', coverLetter: '', consent: false, talentPool: false, website: '' };

/** Schnelle Prüfung im Browser – nur für gute Bedienung. Der Server prüft alles noch einmal. */
function validate(form, file) {
  const e = {};
  if (!form.firstName.trim()) e.firstName = 'Bitte gib Deinen Vornamen an.';
  if (!form.lastName.trim()) e.lastName = 'Bitte gib Deinen Nachnamen an.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Bitte gib eine gültige E-Mail-Adresse an.';
  if (!file) e.cv = 'Bitte lade Deinen Lebenslauf als PDF hoch.';
  else if (file.size > MAX_UPLOAD_BYTES) e.cv = `Die Datei ist zu groß (maximal ${formatBytes(MAX_UPLOAD_BYTES)}).`;
  if (!form.consent) e.consent = 'Ohne Deine Einwilligung können wir die Bewerbung nicht bearbeiten.';
  return e;
}

export default function Apply() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error, loading } = useAsync(() => getJob(id), [id]);
  const fileRef = useRef(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [sending, setSending] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  const { job } = data;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files[0];
    const clientErrors = validate(form, file);
    setErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length) return;

    // Datei + Textfelder zusammen → multipart/form-data
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
    fd.append('cv', file);

    setSending(true);
    try {
      const result = await applyToJob(job.id, fd);
      navigate(`/status/${result.token}`, { state: { justCreated: true } });
    } catch (err) {
      // 422 → Feldfehler vom Server unter die Felder schreiben; alles andere als allgemeine Meldung
      if (err.fieldErrors) setErrors(err.fieldErrors);
      else setFormError(err.message);
      window.scrollTo(0, 0);
    } finally {
      setSending(false);
    }
  };

  const hasErrors = formError || Object.keys(errors).length > 0;

  return (
    <>
      <Breadcrumb items={[{ label: 'Offene Stellen', to: '/jobs' }, { label: job.title, to: `/jobs/${job.id}` }, { label: 'Bewerbung' }]} />
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Bewerbung als {job.title}</h1>
        <p className="mt-2 text-slate-600">Pflichtfelder sind mit * markiert. Wir fragen bewusst nicht nach Foto, Alter, Geschlecht oder Familienstand.</p>

        {hasErrors && (
          <div role="alert" className="mt-6 rounded-lg border-l-4 border-red-600 bg-red-50 px-4 py-3 text-red-900">
            {formError ?? 'Bitte prüfe die markierten Felder.'}
          </div>
        )}

        <form onSubmit={submit} noValidate className="mt-6 grid gap-5">
          <Card>
            <h2 className="mb-4 font-semibold">Kontaktdaten</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="firstName" label="Vorname *" error={errors.firstName}>
                {(p) => <input autoComplete="given-name" maxLength={100} value={form.firstName} onChange={set('firstName')} {...p} />}
              </Field>
              <Field id="lastName" label="Nachname *" error={errors.lastName}>
                {(p) => <input autoComplete="family-name" maxLength={100} value={form.lastName} onChange={set('lastName')} {...p} />}
              </Field>
              <Field id="email" label="E-Mail *" error={errors.email}>
                {(p) => <input type="email" autoComplete="email" value={form.email} onChange={set('email')} {...p} />}
              </Field>
              <Field id="phone" label="Telefon" optional error={errors.phone}>
                {(p) => <input type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} {...p} />}
              </Field>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 font-semibold">Unterlagen</h2>
            <div className="grid gap-4">
              <Field id="cv" label={`Lebenslauf (PDF, max. ${formatBytes(MAX_UPLOAD_BYTES)}) *`} error={errors.cv}>
                {(p) => (
                  <input type="file" accept="application/pdf,.pdf" ref={fileRef} {...p}
                    className={`${p.className} file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:font-semibold file:text-brand-700`} />
                )}
              </Field>
              <Field id="coverLetter" label="Anschreiben" optional hint="Höchstens 5.000 Zeichen." error={errors.coverLetter}>
                {(p) => <textarea rows={7} maxLength={5000} value={form.coverLetter} onChange={set('coverLetter')} {...p} />}
              </Field>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 font-semibold">Datenschutz</h2>
            <div className="grid gap-3">
              <label className="flex gap-3">
                <input type="checkbox" checked={form.consent} onChange={set('consent')} className="mt-1 h-4 w-4 accent-brand-600"
                  aria-invalid={errors.consent ? true : undefined} aria-describedby={errors.consent ? 'consent-error' : undefined} />
                <span>
                  Ich willige ein, dass meine Angaben zur Durchführung dieses Bewerbungsverfahrens verarbeitet werden.
                  Die <Link to="/datenschutz" target="_blank" className="text-brand-700 underline">Datenschutzhinweise</Link> habe ich gelesen. *
                </span>
              </label>
              {errors.consent && <p id="consent-error" className="text-sm font-medium text-red-700">{errors.consent}</p>}
              <label className="flex gap-3">
                <input type="checkbox" checked={form.talentPool} onChange={set('talentPool')} className="mt-1 h-4 w-4 accent-brand-600" />
                <span>Freiwillig: Meine Daten dürfen bis zu 24 Monate für weitere passende Stellen gespeichert werden (Talentpool).</span>
              </label>
            </div>
          </Card>

          {/* Honeypot gegen Spam-Bots: für Menschen unsichtbar, Bots füllen es trotzdem aus */}
          <div aria-hidden="true" className="absolute -left-[9999px]">
            <label htmlFor="website">Website</label>
            <input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
          </div>

          <Button type="submit" disabled={sending} className="w-full sm:w-auto sm:justify-self-start">
            {sending ? 'Wird gesendet …' : 'Bewerbung absenden'}
          </Button>
        </form>
      </div>
    </>
  );
}
