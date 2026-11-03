import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getApplications } from '../../api';
import { useAsync } from '../../hooks/useAsync.js';
import { STAGES } from '../../lib/constants.js';
import { formatDate } from '../../lib/format.js';
import { Button, ErrorState, Field, Loading, PageHeader, Pagination, StageBadge, Stars, Table } from '../../components/ui.jsx';

const FILTERS = ['q', 'job', 'status'];
const fromParams = (params) => Object.fromEntries(FILTERS.map((f) => [f, params.get(f) ?? '']));

export default function Applications() {
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const { data, error, loading } = useAsync(() => getApplications(Object.fromEntries(params)), [query]);
  const [form, setForm] = useState(() => fromParams(params));
  useEffect(() => { setForm(fromParams(params)); }, [query]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <>
      <PageHeader title="Bewerbungen" subtitle="Namen neuer Bewerbungen sind bis zur Vorauswahl ausgeblendet (anonyme Vorsichtung)." />

      <form role="search" onSubmit={(e) => { e.preventDefault(); setParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v))); }}
        className="mb-4 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[2fr_2fr_1fr_auto] md:items-end">
        <Field id="q" label="Name oder E-Mail">
          {(p) => <input type="search" value={form.q} onChange={set('q')} {...p} />}
        </Field>
        <Field id="job" label="Stelle">
          {(p) => (
            <select value={form.job} onChange={set('job')} {...p}>
              <option value="">Alle</option>
              {data?.jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          )}
        </Field>
        <Field id="status" label="Status">
          {(p) => (
            <select value={form.status} onChange={set('status')} {...p}>
              <option value="">Alle</option>
              {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          )}
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit">Filtern</Button>
          {FILTERS.some((f) => params.get(f)) && <Link to="/admin/applications" className="text-sm text-slate-600 hover:underline">Zurücksetzen</Link>}
        </div>
      </form>

      {loading && !data && <Loading />}
      {error && <ErrorState error={error} />}
      {data && (
        <div className={loading ? 'opacity-60' : ''}>
          <p className="mb-3 text-sm text-slate-500">{data.pagination.total} Bewerbung(en)</p>
          <Table head={['Bewerbung', 'Stelle', 'Status', 'Bewertung', 'Eingang']}>
            {data.applications.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><Link to={`/admin/applications/${a.id}`} className="font-medium text-brand-700 hover:underline">{a.display_name}</Link></td>
                <td className="px-4 py-3">{a.job_title}</td>
                <td className="px-4 py-3"><StageBadge status={a.status} /></td>
                <td className="px-4 py-3"><Stars rating={a.rating} /></td>
                <td className="px-4 py-3 text-slate-500">{formatDate(a.created_at)}</td>
              </tr>
            ))}
            {data.applications.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Keine Bewerbungen gefunden.</td></tr>}
          </Table>
          <Pagination pagination={data.pagination} />
        </div>
      )}
    </>
  );
}
