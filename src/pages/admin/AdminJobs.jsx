import { Link, useSearchParams } from 'react-router-dom';
import { getAdminJobs } from '../../api';
import { useAsync } from '../../hooks/useAsync.js';
import { JOB_STATUSES } from '../../lib/constants.js';
import { Badge, ButtonLink, ErrorState, Loading, PageHeader, Table } from '../../components/ui.jsx';

export default function AdminJobs() {
  const [params] = useSearchParams();
  const status = params.get('status') ?? '';
  const { data, error, loading } = useAsync(() => getAdminJobs(status), [status]);

  const tab = (key, label) => (
    <Link key={key} to={key ? `/admin/jobs?status=${key}` : '/admin/jobs'} aria-current={status === key ? 'page' : undefined}
      className={`rounded-full px-4 py-1.5 text-sm font-medium ${status === key ? 'bg-ink text-white' : 'border border-slate-200 bg-white text-slate-600 hover:text-ink'}`}>
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader title="Stellen"><ButtonLink to="/admin/jobs/new">Neue Stelle</ButtonLink></PageHeader>
      <nav aria-label="Nach Status filtern" className="mb-4 flex flex-wrap gap-2">
        {tab('', 'Alle')}
        {Object.entries(JOB_STATUSES).map(([k, label]) => tab(k, label))}
      </nav>

      {loading && !data && <Loading />}
      {error && <ErrorState error={error} />}
      {data && (
        <Table head={['Titel', 'Bereich', 'Standort', 'Status', 'Bewerbungen', '']}>
          {data.jobs.map((j) => (
            <tr key={j.id} className="hover:bg-slate-50">
              <td className="px-4 py-3"><Link to={`/admin/jobs/${j.id}/edit`} className="font-medium text-brand-700 hover:underline">{j.title}</Link></td>
              <td className="px-4 py-3">{j.department}</td>
              <td className="px-4 py-3">{j.location}</td>
              <td className="px-4 py-3"><Badge tone={j.status}>{JOB_STATUSES[j.status]}</Badge></td>
              <td className="px-4 py-3">
                <Link to={`/admin/applications?job=${j.id}`} className="hover:underline">{j.app_count}</Link>
                {j.new_count > 0 && <span className="ml-2"><Badge tone="new">{j.new_count} neu</Badge></span>}
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <Link to={`/admin/pipeline?job=${j.id}`} className="text-brand-700 hover:underline">Pipeline</Link>
                {j.status === 'published' && <Link to={`/jobs/${j.id}`} className="ml-4 text-brand-700 hover:underline">Ansehen</Link>}
              </td>
            </tr>
          ))}
          {data.jobs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Keine Stellen in dieser Ansicht.</td></tr>}
        </Table>
      )}
    </>
  );
}
