import { useParams } from 'react-router-dom';
import { getJob } from '../api';
import { useAsync } from '../hooks/useAsync.js';
import { Breadcrumb, ButtonLink, ErrorState, Loading } from '../components/ui.jsx';

export default function JobDetail() {
  const { id } = useParams();
  const { data, error, loading } = useAsync(() => getJob(id), [id]);
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  const { job } = data;

  return (
    <>
      <Breadcrumb items={[{ label: 'Offene Stellen', to: '/jobs' }, { label: job.title }]} />
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
        <article>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{job.department}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{job.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
            <span className="rounded-md bg-white px-2.5 py-1 ring-1 ring-slate-200">{job.location}</span>
            <span className="rounded-md bg-white px-2.5 py-1 ring-1 ring-slate-200">{job.employment_type}</span>
          </div>
          <h2 className="mt-8 text-xl font-bold">Deine Aufgaben</h2>
          {/* React escaped Text automatisch; whitespace-pre-line erhält die Zeilenumbrüche */}
          <p className="mt-2 max-w-prose whitespace-pre-line text-slate-700">{job.description}</p>
          <h2 className="mt-8 text-xl font-bold">Was Du mitbringst</h2>
          <p className="mt-2 max-w-prose whitespace-pre-line text-slate-700">{job.requirements}</p>
        </article>

        <aside className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
          <h2 className="text-lg font-bold">Interesse?</h2>
          <p className="mt-2 text-slate-600">Die Bewerbung dauert etwa fünf Minuten. Du brauchst nur Deinen Lebenslauf als PDF.</p>
          <ButtonLink to={`/jobs/${job.id}/apply`} className="mt-4 w-full">Jetzt bewerben</ButtonLink>
          <p className="mt-4 text-xs text-slate-500">
            Wir freuen uns über Bewerbungen unabhängig von Geschlecht, Herkunft, Religion, Alter, Behinderung oder sexueller Identität.
          </p>
        </aside>
      </div>
    </>
  );
}
