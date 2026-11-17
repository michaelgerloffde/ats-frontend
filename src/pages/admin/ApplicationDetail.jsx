import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { addNote, attachmentUrl, changeApplicationStatus, deleteApplication, getApplication, rateApplication } from '../../api';
import { useAsync } from '../../hooks/useAsync.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { STAGES, stageLabel } from '../../lib/constants.js';
import { formatBytes, formatDate } from '../../lib/format.js';
import { Breadcrumb, Button, Card, ErrorState, Field, Loading, StageBadge } from '../../components/ui.jsx';

export default function ApplicationDetail() {
  const { id } = useParams();
  const { isAdmin } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(() => getApplication(id), [id]);
  const [status, setStatus] = useState('');
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (data) {
      setStatus(data.application.status);
      setRating(data.application.rating ?? 0);
    }
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState error={error} />;
  const { application: app, attachments, notes, history } = data;

  /** Schreibaktion ausführen → Meldung → neuen Stand vom Server laden */
  const act = async (fn, message) => {
    try {
      await fn();
      toast(message);
      await reload();
      return true;
    } catch (err) {
      toast(err.message, 'error');
      return false;
    }
  };

  const remove = async () => {
    if (!window.confirm('Bewerbung, Notizen und Dateien endgültig löschen?')) return;
    if (await act(() => deleteApplication(id), 'Die Bewerbung wurde gelöscht.')) navigate('/admin/applications');
  };

  const download = (fileId) => {
    const url = attachmentUrl(fileId);
    if (url) window.open(url, '_blank', 'noopener');
    else toast('Im Mock gibt es nur für frisch hochgeladene Bewerbungen eine echte Datei.', 'error');
  };

  return (
    <>
      <Breadcrumb items={[{ label: 'Bewerbungen', to: '/admin/applications' }, { label: app.display_name }]} />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{app.display_name}</h1>
          <p className="mt-1 text-slate-600">
            Bewerbung auf <Link to={`/admin/applications?job=${app.job_id}`} className="text-brand-700 hover:underline">{app.job_title}</Link> · eingegangen am {formatDate(app.created_at, true)}
          </p>
        </div>
        <StageBadge status={app.status} large />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="grid gap-5">
          <Card>
            <h2 className="mb-3 font-bold">Kontakt</h2>
            {app.anonymized ? (
              <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
               Anonyme Vorauswahl: Name und Kontaktdaten werden erst angezeigt, wenn die Bewerbung nach Bestätigung ins Gespräch wechselt. Bitte bewerte zunächst nur die Qualifikation.
              </p>
            ) : (
              <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-slate-500">E-Mail</dt><dd><a href={`mailto:${app.email}`} className="text-brand-700 hover:underline">{app.email}</a></dd>
                <dt className="text-slate-500">Telefon</dt><dd>{app.phone || '–'}</dd>
              </dl>
            )}
            <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-slate-500">Datenschutz</dt><dd>Hinweise gelesen am {formatDate(app.privacy_ack_at, true)}</dd>
              <dt className="text-slate-500">Löschung am</dt><dd>{app.delete_after ? formatDate(app.delete_after) : 'wird beim Abschluss festgelegt'}</dd>
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 font-bold">Unterlagen</h2>
            <ul className="mb-4 text-sm">
              {attachments.map((f) => (
                <li key={f.id}>
                  <button type="button" onClick={() => download(f.id)} className="font-medium text-brand-700 underline-offset-2 hover:underline">Lebenslauf öffnen</button>
                  <span className="ml-2 text-slate-500">(PDF, {formatBytes(f.size)})</span> 
                   {app.anonymized && <span className="mt-1 block text-xs text-amber-700">Kann persönliche Daten enthalten. Öffnen nur zur Bewertung der Qualifikation.</span>}
                </li>
              ))}
            </ul>
            <h3 className="mb-1 text-sm font-semibold">Anschreiben</h3>
            {app.cover_letter ? <p className="whitespace-pre-line text-slate-700">{app.cover_letter}</p> : <p className="text-slate-500">Kein Anschreiben.</p>}
          </Card>

          <Card>
            <h2 className="mb-3 font-bold">Notizen</h2>
            <form className="grid gap-3" onSubmit={async (e) => {
              e.preventDefault();
              if (note.trim() && await act(() => addNote(id, note), 'Notiz hinzugefügt.')) setNote('');
            }}>
              <Field id="note" label="Neue Notiz">
                {(p) => <textarea rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Sachlich und tätigkeitsbezogen – keine Angaben zu Herkunft, Alter, Familie o. Ä." {...p} />}
              </Field>
              <Button type="submit" variant="secondary" className="justify-self-start" disabled={!note.trim()}>Notiz speichern</Button>
            </form>
            <ul className="mt-5 divide-y divide-slate-100">
              {notes.map((n) => (
                <li key={n.id} className="py-3">
                  <p className="text-xs text-slate-500">{n.author ?? 'gelöschte:r Nutzer:in'} · {formatDate(n.created_at, true)}</p>
                  <p className="mt-1 whitespace-pre-line">{n.body}</p>
                </li>
              ))}
              {notes.length === 0 && <li className="py-3 text-sm text-slate-500">Noch keine Notizen.</li>}
            </ul>
          </Card>
        </div>

        <aside className="grid gap-5">
          <Card>
            <h2 className="mb-3 font-bold">Status</h2>
            <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); act(() => changeApplicationStatus(id, status), `Status geändert: ${stageLabel(status)}.`); }}>
              <Field id="status" label="Verschieben nach">
                {(p) => (
                  <select value={status} onChange={(e) => setStatus(e.target.value)} {...p}>
                    {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}{s.final ? ' (Abschluss)' : ''}</option>)}
                  </select>
                )}
              </Field>
              <Button type="submit" disabled={status === app.status}>Status ändern</Button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-3 font-bold">Bewertung</h2>
            <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); act(() => rateApplication(id, rating), 'Bewertung gespeichert.'); }}>
              <fieldset className="flex gap-2">
                <legend className="sr-only">Bewertung von 1 bis 5</legend>
                {[1, 2, 3, 4, 5].map((i) => (
                  <label key={i} className={`grid h-10 w-10 cursor-pointer place-items-center rounded-lg border font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent-400 ${rating === i ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300 bg-white hover:border-amber-400'}`}>
                    <input type="radio" name="rating" value={i} checked={rating === i} onChange={() => setRating(i)} className="sr-only" />
                    {i}
                  </label>
                ))}
              </fieldset>
              <Button type="submit" variant="secondary" disabled={!rating || rating === app.rating}>Bewertung speichern</Button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-3 font-bold">Verlauf</h2>
            <ul className="grid gap-2">
              {history.map((h, i) => (
                <li key={i} className="border-l-2 border-slate-200 pl-3 text-sm">
                  <span className="block text-xs text-slate-500">{formatDate(h.changed_at, true)}</span>
                  {stageLabel(h.to_status)} <span className="text-slate-500">· {h.author ?? 'Bewerber:in'}</span>
                </li>
              ))}
            </ul>
          </Card>

          {isAdmin && (
            <section className="rounded-xl border border-red-200 bg-red-50 p-5">
              <h2 className="font-bold">Löschen</h2>
              <p className="mt-1 text-sm text-slate-700">Löscht Bewerbung, Notizen und Dateien sofort und endgültig (z. B. bei einer Löschanfrage nach Art. 17 DSGVO).</p>
              <Button variant="danger" className="mt-3 w-full" onClick={remove}>Endgültig löschen</Button>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
