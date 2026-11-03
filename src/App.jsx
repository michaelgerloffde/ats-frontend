import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSession } from './context/SessionContext.jsx';
import Layout from './components/Layout.jsx';
import { ErrorState } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import Jobs from './pages/Jobs.jsx';
import JobDetail from './pages/JobDetail.jsx';
import Apply from './pages/Apply.jsx';
import Status from './pages/Status.jsx';
import Privacy from './pages/Privacy.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import AdminJobs from './pages/admin/AdminJobs.jsx';
import JobForm from './pages/admin/JobForm.jsx';
import Applications from './pages/admin/Applications.jsx';
import ApplicationDetail from './pages/admin/ApplicationDetail.jsx';
import Pipeline from './pages/admin/Pipeline.jsx';
import Users from './pages/admin/Users.jsx';

/**
 * Leitet nicht eingeloggte Personen zum Login um.
 * Das ist nur Bequemlichkeit für die Oberfläche – schützen muss das Backend
 * (jede /api/admin-Anfrage ohne Login muss dort mit 401 abgewiesen werden).
 */
function RequireAuth({ children, admin = false }) {
  const { user } = useSession();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (admin && user.role !== 'admin') {
    return <ErrorState error={{ status: 403, message: 'Dieser Bereich ist Administrator:innen vorbehalten.' }} />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Öffentlicher Bereich */}
        <Route index element={<Home />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        <Route path="jobs/:id/apply" element={<Apply />} />
        <Route path="status/:token" element={<Status />} />
        <Route path="datenschutz" element={<Privacy />} />
        <Route path="login" element={<Login />} />

        {/* Verwaltungsbereich */}
        <Route path="admin" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="admin/jobs" element={<RequireAuth><AdminJobs /></RequireAuth>} />
        <Route path="admin/jobs/new" element={<RequireAuth><JobForm /></RequireAuth>} />
        <Route path="admin/jobs/:id/edit" element={<RequireAuth><JobForm /></RequireAuth>} />
        <Route path="admin/applications" element={<RequireAuth><Applications /></RequireAuth>} />
        <Route path="admin/applications/:id" element={<RequireAuth><ApplicationDetail /></RequireAuth>} />
        <Route path="admin/pipeline" element={<RequireAuth><Pipeline /></RequireAuth>} />
        <Route path="admin/users" element={<RequireAuth admin><Users /></RequireAuth>} />

        <Route path="*" element={<ErrorState error={{ status: 404, message: 'Diese Seite gibt es nicht.' }} />} />
      </Route>
    </Routes>
  );
}
