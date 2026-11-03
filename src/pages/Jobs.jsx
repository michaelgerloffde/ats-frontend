import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getJobs } from '../api';
import { useAsync } from '../hooks/useAsync.js';
import { EMPLOYMENT_TYPES } from '../lib/constants.js';
import { Button, EmptyState, ErrorState, Field, JobCard, Loading, PageHeader, Pagination } from '../components/ui.jsx';

const FILTERS = ['q', 'department', 'location', 'type'];
const fromParams = (params) => Object.fromEntries(FILTERS.map((f) => [f, params.get(f) ?? '']));

export default function Jobs() {
  // Filter stehen in der URL → Zurück-Button und geteilte Links zeigen dieselbe Liste
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const { data, error, loading } = useAsync(() => getJobs(Object.fromEntries(params)), [query]);
  const [form, setForm] = useState(() => fromParams(params));
  useEffect(() => { setForm(fromParams(params)); }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    setParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v)));
  };
  const active = FILTERS.some((f) => params.get(f));

  return (
    <>
      <PageHeader title="Offene Stellen" />

      <form role="search" onSubmit={submit}
        className="mb-4 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-end">
        <Field id="q" label="Suche">
          {(p) => <input type="search" placeholder="Titel, Bereich, Stichwort" value={form.q} onChange={set('q')} {...p} />}
        </Field>
        <Field id="department" label="Bereich">
          {(p) => (
            <select value={form.department} onChange={set('department')} {...p}>
              <option value="">Alle</option>
              {data?.options.departments.map((d) => <option key={d}>{d}</option>)}
            </select>
          )}
        </Field>
        <Field id="location" label="Standort">
          {(p) => (
            <select value={form.location} onChange={set('location')} {...p}>
              <option value="">Alle</option>
              {data?.options.locations.map((l) => <option key={l}>{l}</option>)}
            </select>
          )}
        </Field>
        <Field id="type" label="Anstellung">
          {(p) => (
            <select value={form.type} onChange={set('type')} {...p}>
              <option value="">Alle</option>
              {EMPLOYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          )}
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit">Filtern</Button>
          {active && <Link to="/jobs" className="text-sm text-slate-600 hover:underline">Zurücksetzen</Link>}
        </div>
      </form>

      {error && <ErrorState error={error} />}
      {loading && !data && <Loading />}
      {data && (
        <div className={loading ? 'opacity-60 transition-opacity' : ''}>
          <p className="mb-3 text-sm text-slate-500" aria-live="polite">
            {data.pagination.total} {data.pagination.total === 1 ? 'Stelle' : 'Stellen'} gefunden
          </p>
          {data.jobs.length === 0 ? (
            <EmptyState>
              Keine passenden Stellen gefunden. <Link to="/jobs" className="font-semibold text-brand-700 hover:underline">Alle anzeigen</Link>
            </EmptyState>
          ) : (
            <div className="grid gap-3">{data.jobs.map((job) => <JobCard key={job.id} job={job} />)}</div>
          )}
          <Pagination pagination={data.pagination} />
        </div>
      )}
    </>
  );
}
