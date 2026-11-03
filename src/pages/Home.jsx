import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getHome } from '../api';
import { useAsync } from '../hooks/useAsync.js';
import { Button, ErrorState, JobCard, Loading } from '../components/ui.jsx';

const STEPS = [
  ['Bewerben', 'Formular ausfüllen und Lebenslauf als PDF hochladen. Kein Konto, kein Foto.'],
  ['Status verfolgen', 'Über Deinen persönlichen Link siehst Du jederzeit, wo Deine Bewerbung steht.'],
  ['Gespräch', 'Passt es, melden wir uns innerhalb von zwei Wochen bei Dir.'],
];

export default function Home() {
  const { data, error, loading } = useAsync(() => getHome(), []);
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-12 sm:py-14">
        <div aria-hidden="true" className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-brand-50" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Karriere bei Kranich Logistik</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Wir bewegen Waren. Du bewegst uns.</h1>
          <p className="mt-4 text-lg text-slate-600">
            Ein mittelständischer Logistikdienstleister mit rund 400 Mitarbeitenden an vier Standorten.
            Bewirb Dich in wenigen Minuten – nur mit Deinem Lebenslauf.
          </p>
          <form role="search" className="mt-6 flex flex-wrap gap-3"
            onSubmit={(e) => { e.preventDefault(); navigate(q ? `/jobs?q=${encodeURIComponent(q)}` : '/jobs'); }}>
            <label htmlFor="hero-q" className="sr-only">Stellen durchsuchen</label>
            <input id="hero-q" type="search" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Stichwort, z. B. Disposition, IT, Lager …"
              className="min-w-0 flex-[1_1_16rem] rounded-lg border border-slate-300 bg-white px-4 py-2.5" />
            <Button type="submit">Stellen finden</Button>
          </form>
        </div>
      </section>

      {loading && <Loading />}
      {error && <ErrorState error={error} />}
      {data && (
        <>
          <section className="mt-10">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold">Neueste Stellen</h2>
              <Link to="/jobs" className="text-sm font-semibold text-brand-700 hover:underline">Alle {data.openCount} offenen Stellen →</Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {data.jobs.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="mb-4 text-xl font-bold">Bereiche</h2>
            <ul className="flex flex-wrap gap-2">
              {data.departments.map((d) => (
                <li key={d.department}>
                  <Link to={`/jobs?department=${encodeURIComponent(d.department)}`}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 font-medium hover:border-brand-200 hover:text-brand-700">
                    {d.department}
                    <span className="rounded-full bg-brand-50 px-2 text-sm text-brand-700">{d.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold">So läuft Deine Bewerbung</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="rounded-xl border border-slate-200 bg-white p-5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 font-bold text-white">{i + 1}</span>
              <p className="mt-3 font-semibold">{title}</p>
              <p className="mt-1 text-slate-600">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
