import { Link, useSearchParams } from 'react-router-dom';
import { stageLabel } from '../lib/constants.js';

/* ---------- Grundbausteine mit Tailwind-Klassen ---------- */

const BUTTON = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 border-brand-600',
  secondary: 'bg-white text-brand-700 hover:bg-brand-50 border-brand-600',
  danger: 'bg-red-700 text-white hover:bg-red-800 border-red-700',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 border-transparent',
};

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5' };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}

export function ButtonLink({ variant = 'primary', className = '', ...props }) {
  return (
    <Link
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 font-semibold no-underline transition-colors ${BUTTON[variant]} ${className}`}
      {...props}
    />
  );
}

export const inputClass = (hasError) =>
  `w-full rounded-lg border bg-white px-3 py-2 text-ink placeholder:text-slate-400 ${hasError ? 'border-red-600 bg-red-50/40' : 'border-slate-300'}`;

/**
 * Formularfeld: Label + Eingabe + Hinweis + Fehlermeldung.
 * Die Eingabe bekommt per render-Funktion die richtigen ARIA-Attribute für Screenreader.
 *
 *   <Field id="email" label="E-Mail" error={errors.email}>
 *     {(props) => <input type="email" {...props} />}
 *   </Field>
 */
export function Field({ id, label, optional, hint, error, children, className = '' }) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`grid content-start gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-slate-800">
        {label} {optional && <span className="font-normal text-slate-500">(optional)</span>}
      </label>
      {children({ id, name: id, className: inputClass(Boolean(error)), 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && <p id={`${id}-hint`} className="text-sm text-slate-500">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}

export function Card({ className = '', children }) {
  return <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-slate-600">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Breadcrumb({ items }) {
  return (
    <nav aria-label="Brotkrümelnavigation" className="mb-4 text-sm text-slate-500">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-1.5">/</span>}
          {item.to ? <Link to={item.to} className="text-brand-700 underline-offset-2 hover:underline">{item.label}</Link> : <span>{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

/* ---------- Zustände: laden, Fehler, leer ---------- */

export function Spinner() {
  return <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" role="status" aria-label="Lädt" />;
}

export function Loading() {
  return <div className="flex justify-center py-16"><Spinner /></div>;
}

export function ErrorState({ error }) {
  const titles = { 0: 'Keine Verbindung', 401: 'Bitte anmelden', 403: 'Kein Zugriff', 404: 'Nicht gefunden' };
  return (
    <div className="mx-auto max-w-xl py-12 text-center">
      <p className="text-sm font-bold uppercase tracking-wider text-brand-600">Fehler {error?.status || ''}</p>
      <h1 className="mt-2 text-2xl font-bold">{titles[error?.status] ?? 'Etwas ist schiefgelaufen'}</h1>
      <p className="mt-3 text-slate-600">{error?.message}</p>
      <div className="mt-6">
        {error?.status === 401 ? <ButtonLink to="/login">Zur Anmeldung</ButtonLink> : <ButtonLink to="/">Zur Startseite</ButtonLink>}
      </div>
    </div>
  );
}

export function EmptyState({ children }) {
  return <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center text-slate-500">{children}</div>;
}

/* ---------- Anzeige-Bausteine ---------- */

const BADGE = {
  new: 'bg-blue-50 text-blue-800 ring-blue-200',
  screening: 'bg-amber-50 text-amber-800 ring-amber-200',
  interview: 'bg-violet-50 text-violet-800 ring-violet-200',
  offer: 'bg-brand-50 text-brand-700 ring-brand-200',
  hired: 'bg-green-50 text-green-800 ring-green-200',
  rejected: 'bg-slate-100 text-slate-600 ring-slate-200',
  published: 'bg-green-50 text-green-800 ring-green-200',
  draft: 'bg-amber-50 text-amber-800 ring-amber-200',
  closed: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function Badge({ tone, children, large }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full font-semibold ring-1 ring-inset ${large ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'} ${BADGE[tone] ?? BADGE.closed}`}>
      {children}
    </span>
  );
}

export const StageBadge = ({ status, large }) => <Badge tone={status} large={large}>{stageLabel(status)}</Badge>;

export function Stars({ rating }) {
  if (!rating) return <span className="text-slate-400">–</span>;
  return (
    <span className="tracking-wider text-amber-500" aria-label={`${rating} von 5 Sternen`}>
      {'★'.repeat(rating)}<span className="text-slate-300">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

export function JobCard({ job }) {
  return (
    <article className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{job.department}</p>
      <h3 className="mt-1 text-lg font-semibold leading-snug">
        <Link to={`/jobs/${job.id}`} className="after:absolute after:inset-0 group-hover:text-brand-700">{job.title}</Link>
      </h3>
      <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
        <span className="rounded-md bg-slate-100 px-2 py-0.5">{job.location}</span>
        <span className="rounded-md bg-slate-100 px-2 py-0.5">{job.employment_type}</span>
      </div>
    </article>
  );
}

/** Blättern; die Seitenzahl steht in der URL (?page=2). */
export function Pagination({ pagination }) {
  const [params, setParams] = useSearchParams();
  if (!pagination || pagination.pages <= 1) return null;
  const go = (page) => {
    const next = new URLSearchParams(params);
    next.set('page', String(page));
    setParams(next);
  };
  return (
    <nav aria-label="Seitennavigation" className="mt-6 flex items-center justify-center gap-4 text-sm">
      <Button variant="ghost" size="sm" disabled={pagination.page <= 1} onClick={() => go(pagination.page - 1)}>← Zurück</Button>
      <span className="text-slate-600">Seite {pagination.page} von {pagination.pages}</span>
      <Button variant="ghost" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => go(pagination.page + 1)}>Weiter →</Button>
    </nav>
  );
}

/** Tabelle mit einheitlichem Aussehen; scrollt auf schmalen Bildschirmen horizontal. */
export function Table({ head, children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>{head.map((h, i) => <th key={i} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}
