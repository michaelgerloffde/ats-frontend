import { Link, useSearchParams } from 'react-router-dom';
import { changeApplicationStatus, getPipeline } from '../../api';
import { useAsync } from '../../hooks/useAsync.js';
import { useToast } from '../../context/ToastContext.jsx';
import { STAGES, stageLabel } from '../../lib/constants.js';
import { formatDate } from '../../lib/format.js';
import { ErrorState, Loading, PageHeader, inputClass } from '../../components/ui.jsx';

/** Karte im Board. Verschieben per Auswahl + Button statt Drag & Drop → auch mit Tastatur bedienbar. */
function Card({ app, column, onMove }) {
  return (
    <article className="grid gap-1.5 rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <Link to={`/admin/applications/${app.id}`} className="font-semibold text-brand-700 hover:underline">{app.display_name}</Link>
      <p className="text-xs text-slate-500">
        {formatDate(app.created_at)}
        {app.rating ? <span className="ml-1 text-amber-500" aria-label={`${app.rating} von 5`}>· {'★'.repeat(app.rating)}</span> : null}
      </p>
      <form className="mt-1 grid grid-cols-[1fr_auto] gap-1.5" onSubmit={(e) => { e.preventDefault(); onMove(app.id, e.currentTarget.elements.status.value); }}>
        <label className="sr-only" htmlFor={`move-${app.id}`}>Verschieben nach</label>
        <select id={`move-${app.id}`} name="status" defaultValue={column} className={`${inputClass(false)} min-w-0 px-2 py-1 text-xs`}>
          {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <button type="submit" aria-label="Verschieben" className="rounded-md bg-brand-600 px-2.5 text-white hover:bg-brand-700">→</button>
      </form>
    </article>
  );
}

export default function Pipeline() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const jobParam = params.get('job') ?? '';
  const { data, error, loading, reload } = useAsync(() => getPipeline(jobParam), [jobParam]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const move = async (appId, status) => {
    try {
      await changeApplicationStatus(appId, status);
      toast(`Status geändert: ${stageLabel(status)}.`);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <PageHeader title="Pipeline">
        <div className="flex items-center gap-2">
          <label htmlFor="job" className="text-sm font-semibold">Stelle</label>
          <select id="job" value={data.jobId ?? ''} onChange={(e) => setParams({ job: e.target.value })} className={`${inputClass(false)} sm:w-80`}>
            {data.jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </div>
      </PageHeader>
      <div className="grid auto-cols-[minmax(10rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
        {STAGES.map((s) => {
          const cards = data.columns[s.key] ?? [];
          return (
            <section key={s.key} aria-labelledby={`col-${s.key}`} className="flex min-h-64 flex-col gap-2.5 rounded-xl bg-slate-200/60 p-2.5">
              <h2 id={`col-${s.key}`} className="flex items-center justify-between px-1 text-sm font-bold">
                {s.label} <span className="rounded-full bg-white px-2 text-xs">{cards.length}</span>
              </h2>
              {cards.map((a) => <Card key={`${a.id}-${a.status}`} app={a} column={s.key} onMove={move} />)}
              {cards.length === 0 && <p className="px-1 text-xs text-slate-500">leer</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}
