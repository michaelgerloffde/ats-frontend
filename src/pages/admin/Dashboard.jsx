import { Link } from 'react-router-dom';
import { getDashboard } from '../../api';
import { useAsync } from '../../hooks/useAsync.js';
import { useSession } from '../../context/SessionContext.jsx';
import { formatDate } from '../../lib/format.js';
import { ButtonLink, ErrorState, Loading, PageHeader, StageBadge, Table } from '../../components/ui.jsx';

export default function Dashboard() {
  const { user } = useSession();
  const { data, error, loading } = useAsync(() => getDashboard(), []);
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  const { stats, counts, recent } = data;

  const tiles = [
    [stats.published, 'veröffentlichte Stellen'],
    [stats.openApplications, 'laufende Bewerbungen'],
    [stats.deletionsNext30Days, 'Löschungen in den nächsten 30 Tagen'],
  ];

  return (
    <>
      <PageHeader title={`Hallo, ${user.name.split(' ')[0]}`}>
        <ButtonLink to="/admin/jobs/new">Neue Stelle</ButtonLink>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map(([value, label]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-3xl font-bold">{value}</p>
            <p className="mt-1 text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 mb-3 text-lg font-bold">Bewerbungen nach Status</h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {counts.map((c) => (
          <li key={c.key}>
            <Link to={`/admin/applications?status=${c.key}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-brand-200">
              <span className="text-sm font-medium">{c.label}</span>
              <span className="text-lg font-bold">{c.n}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold">Neueste Bewerbungen</h2>
        <Link to="/admin/applications" className="text-sm font-semibold text-brand-700 hover:underline">Alle anzeigen →</Link>
      </div>
      <Table head={['Bewerbung', 'Stelle', 'Status', 'Eingang']}>
        {recent.map((a) => (
          <tr key={a.id} className="hover:bg-slate-50">
            <td className="px-4 py-3"><Link to={`/admin/applications/${a.id}`} className="font-medium text-brand-700 hover:underline">{a.display_name}</Link></td>
            <td className="px-4 py-3">{a.job_title}</td>
            <td className="px-4 py-3"><StageBadge status={a.status} /></td>
            <td className="px-4 py-3 text-slate-500">{formatDate(a.created_at)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
