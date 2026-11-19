import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Layout() {
  const { user, logout, isAdmin } = useSession();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const adminArea = location.pathname.startsWith('/admin');

  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  const onLogout = async () => {
    await logout();
    toast('Du wurdest abgemeldet.');
    navigate('/login');
  };

  const navLink = ({ isActive }) =>
    `rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${adminArea
      ? (isActive ? 'bg-white/15 text-white' : 'text-slate-300 hover:text-white')
      : (isActive ? 'text-brand-700 underline underline-offset-8' : 'text-slate-600 hover:text-ink')}`;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-white">
        Zum Inhalt springen
      </a>

      <header className={adminArea ? 'bg-ink' : 'border-b border-slate-200 bg-white'}>
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link to={adminArea ? '/admin' : '/'} className={`flex items-center gap-2.5 font-bold ${adminArea ? 'text-white' : 'text-ink'}`}>
            <span aria-hidden="true" className="h-7 w-7 rounded-lg bg-[linear-gradient(135deg,var(--color-brand-600)_55%,var(--color-accent-400)_55%)]" />
            <span>Kranich Logistik{adminArea && <span className="ml-2 text-sm font-medium text-slate-400">Recruiting</span>}</span>
          </Link>
          <nav aria-label="Hauptnavigation" className="flex flex-wrap items-center gap-1">
            {adminArea && user ? (
              <>
                <NavLink to="/admin" end className={navLink}>Übersicht</NavLink>
                <NavLink to="/admin/jobs" className={navLink}>Stellen</NavLink>
                <NavLink to="/admin/applications" className={navLink}>Bewerbungen</NavLink>
                <NavLink to="/admin/pipeline" className={navLink}>Pipeline</NavLink>
                {isAdmin && <NavLink to="/admin/users" className={navLink}>Nutzer:innen</NavLink>}
                <button type="button" onClick={onLogout} title={`Angemeldet als ${user.name}`}
                  className="ml-2 rounded-md border border-white/20 px-2.5 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/10">
                  Abmelden
                </button>
              </>
            ) : (
              <>
                <NavLink to="/jobs" className={navLink}>Offene Stellen</NavLink>
                <NavLink to="/datenschutz" className={navLink}>Datenschutz</NavLink>
                <Link to={user ? '/admin' : '/login'} className="rounded-md px-2.5 py-1.5 text-sm text-slate-500 hover:text-ink">Für Recruiter:innen</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm text-slate-500 sm:px-6">
          <span>Studienprojekt · fiktives Unternehmen · nur synthetische Daten</span>
          <span className="flex items-center gap-4">
            <Link to="/datenschutz" className="text-brand-700 hover:underline">Datenschutzhinweise</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
