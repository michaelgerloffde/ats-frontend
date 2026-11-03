/**
 * MOCK-BACKEND – läuft komplett im Browser.
 *
 * Diese Datei tut so, als wäre sie Dein Server: Sie speichert Daten (im localStorage),
 * prüft Eingaben und Rechte und antwortet mit denselben JSON-Formen und Fehlercodes,
 * die Dein echtes Backend später liefern soll (siehe API.md).
 *
 * Sie ist ein Platzhalter. Sobald Dein Express-Backend eine Route kann, stellst Du die
 * passende Funktion in src/api/index.js um. Am Ende wird diese Datei nicht mehr gebraucht.
 *
 * Wichtig: Alles hier läuft im Browser und ist deshalb NICHT sicher – jede:r könnte die
 * Daten im localStorage ändern. Echte Sicherheit gibt es erst im Backend.
 */
import { ApiError } from './ApiError.js';
import { EMPLOYMENT_TYPES, JOB_STATUSES, MAX_UPLOAD_BYTES, RETENTION_DAYS, STAGES } from '../lib/constants.js';
import { buildSeed } from './mockSeed.js';

const DB_KEY = 'ats-mock-db-v1';
const SESSION_KEY = 'ats-mock-session-v1';
const PER_PAGE = 10;
const uploadedFiles = new Map(); // echte Dateien nur bis zum Neuladen (localStorage ist zu klein)

// ---------- "Datenbank" ----------
function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* defekt oder blockiert → neu anlegen */ }
  const seed = buildSeed();
  save(seed);
  return seed;
}
function save(db) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* privates Fenster o. Ä. */ }
}
export function resetMockData() {
  try { localStorage.removeItem(DB_KEY); localStorage.removeItem(SESSION_KEY); } catch { /* egal */ }
}

/** Simuliert Netzwerk-Verzögerung und liefert eine Kopie (wie JSON über das Netz). */
function respond(fn) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const db = load();
        const result = fn(db);
        save(db);
        resolve(structuredClone(result));
      } catch (err) {
        reject(err instanceof ApiError ? err : new ApiError(500, { error: 'Interner Fehler im Mock.' }));
      }
    }, 250);
  });
}

const now = () => new Date().toISOString();
const nextId = (rows) => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('');
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const str = (v) => (typeof v === 'string' ? v.trim() : '');

function paginate(rows, page) {
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const current = Math.min(Math.max(1, Number(page) || 1), pages);
  return { items: rows.slice((current - 1) * PER_PAGE, current * PER_PAGE), pagination: { page: current, pages, total: rows.length } };
}

// ---------- Session / Rechte ----------
function currentUser(db) {
  let id = null;
  try { id = Number(localStorage.getItem(SESSION_KEY)); } catch { /* egal */ }
  const user = db.users.find((u) => u.id === id && u.active);
  return user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null;
}
function requireLogin(db) {
  const user = currentUser(db);
  if (!user) throw new ApiError(401, { error: 'Bitte melde Dich an.' });
  return user;
}
function requireAdmin(db) {
  const user = requireLogin(db);
  if (user.role !== 'admin') throw new ApiError(403, { error: 'Dieser Bereich ist Administrator:innen vorbehalten.' });
  return user;
}

// ---------- Darstellung einer Bewerbung (mit anonymer Vorsichtung) ----------
function present(db, app) {
  const job = db.jobs.find((j) => j.id === app.job_id);
  const base = {
    id: app.id, job_id: app.job_id, job_title: job?.title ?? '–', status: app.status, rating: app.rating,
    created_at: app.created_at, consent_at: app.consent_at, talent_pool: app.talent_pool,
    delete_after: app.delete_after, cover_letter: app.cover_letter,
  };
  if (app.status === 'new') {
    return { ...base, anonymized: true, display_name: `Bewerbung #${String(app.id).padStart(4, '0')}` };
  }
  return { ...base, anonymized: false, display_name: `${app.first_name} ${app.last_name}`,
    first_name: app.first_name, last_name: app.last_name, email: app.email, phone: app.phone };
}

function addHistory(db, appId, toStatus, author) {
  db.history.push({ application_id: appId, to_status: toStatus, author, changed_at: now() });
}

function removeApplication(db, id) {
  db.applications = db.applications.filter((a) => a.id !== id);
  db.notes = db.notes.filter((n) => n.application_id !== id);
  db.history = db.history.filter((h) => h.application_id !== id);
  uploadedFiles.delete(id);
}

// =====================================================================
// Öffentliche Endpunkte
// =====================================================================

export const getSession = () => respond((db) => ({ user: currentUser(db) }));

export const login = (email, password) => respond((db) => {
  const e = str(email).toLowerCase();
  const user = db.users.find((u) => u.email === e && u.active);
  if (!user || user.password !== password) {
    throw new ApiError(401, { error: 'E-Mail-Adresse oder Passwort ist falsch.' });
  }
  localStorage.setItem(SESSION_KEY, String(user.id));
  return { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
});

export const logout = () => respond(() => {
  localStorage.removeItem(SESSION_KEY);
  return { ok: true };
});

export const getHome = () => respond((db) => {
  const published = db.jobs.filter((j) => j.status === 'published');
  const counts = {};
  published.forEach((j) => { counts[j.department] = (counts[j.department] ?? 0) + 1; });
  return {
    jobs: [...published].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3),
    openCount: published.length,
    departments: Object.entries(counts).sort().map(([department, n]) => ({ department, n })),
  };
});

export const getJobs = (filters = {}) => respond((db) => {
  const published = db.jobs.filter((j) => j.status === 'published');
  const q = str(filters.q).toLowerCase();
  const rows = published
    .filter((j) => !q || `${j.title} ${j.description} ${j.department}`.toLowerCase().includes(q))
    .filter((j) => !filters.department || j.department === filters.department)
    .filter((j) => !filters.location || j.location === filters.location)
    .filter((j) => !filters.type || j.employment_type === filters.type)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const { items, pagination } = paginate(rows, filters.page);
  return {
    jobs: items,
    pagination,
    options: {
      departments: [...new Set(published.map((j) => j.department))].sort(),
      locations: [...new Set(published.map((j) => j.location))].sort(),
    },
  };
});

export const getJob = (id) => respond((db) => {
  const job = db.jobs.find((j) => j.id === Number(id) && j.status === 'published');
  if (!job) throw new ApiError(404, { error: 'Diese Stelle ist nicht (mehr) ausgeschrieben.' });
  return { job };
});

/** formData: Felder firstName, lastName, email, phone, coverLetter, consent, talentPool, website + Datei cv */
export const applyToJob = (id, formData) => respond((db) => {
  const job = db.jobs.find((j) => j.id === Number(id) && j.status === 'published');
  if (!job) throw new ApiError(404, { error: 'Diese Stelle ist nicht (mehr) ausgeschrieben.' });
  if (str(formData.get('website'))) return { ok: true }; // Honeypot: Bot bekommt keine Fehlermeldung

  const d = {
    firstName: str(formData.get('firstName')), lastName: str(formData.get('lastName')),
    email: str(formData.get('email')).toLowerCase(), phone: str(formData.get('phone')),
    coverLetter: str(formData.get('coverLetter')), consent: formData.get('consent') === 'true',
    talentPool: formData.get('talentPool') === 'true',
  };
  const file = formData.get('cv');
  const errors = {};
  if (!d.firstName || d.firstName.length > 100) errors.firstName = 'Bitte gib Deinen Vornamen an (max. 100 Zeichen).';
  if (!d.lastName || d.lastName.length > 100) errors.lastName = 'Bitte gib Deinen Nachnamen an (max. 100 Zeichen).';
  if (!isEmail(d.email)) errors.email = 'Bitte gib eine gültige E-Mail-Adresse an.';
  if (d.phone && !/^\+?[0-9 ()/-]{6,30}$/.test(d.phone)) errors.phone = 'Bitte gib eine gültige Telefonnummer an oder lass das Feld leer.';
  if (d.coverLetter.length > 5000) errors.coverLetter = 'Das Anschreiben darf höchstens 5.000 Zeichen lang sein.';
  if (!d.consent) errors.consent = 'Ohne Deine Einwilligung können wir die Bewerbung nicht bearbeiten.';
  if (!(file instanceof File) || file.size === 0) errors.cv = 'Bitte lade Deinen Lebenslauf als PDF hoch.';
  else if (file.size > MAX_UPLOAD_BYTES) errors.cv = 'Die Datei ist zu groß (maximal 5 MB).';
  else if (!file.name.toLowerCase().endsWith('.pdf')) errors.cv = 'Es werden nur PDF-Dateien akzeptiert.';
  // (Das echte Backend prüft den Dateiinhalt, nicht nur die Endung – siehe API.md.)
  const running = db.applications.some((a) => a.job_id === job.id && a.email === d.email && !STAGES.find((s) => s.key === a.status).final);
  if (!errors.email && running) errors.email = 'Für diese Stelle liegt bereits eine laufende Bewerbung mit dieser E-Mail-Adresse vor.';
  if (Object.keys(errors).length) throw new ApiError(422, { errors });

  const app = {
    id: nextId(db.applications), job_id: job.id, first_name: d.firstName, last_name: d.lastName, email: d.email,
    phone: d.phone, cover_letter: d.coverLetter, status: 'new', rating: null, consent_at: now(), talent_pool: d.talentPool,
    status_token: randomToken(), delete_after: null, created_at: now(), cv: { name: file.name, size: file.size },
  };
  db.applications.push(app);
  addHistory(db, app.id, 'new', null);
  uploadedFiles.set(app.id, file);
  return { token: app.status_token };
});

export const getApplicationStatus = (token) => respond((db) => {
  const app = db.applications.find((a) => a.status_token === token);
  if (!app) throw new ApiError(404, { error: 'Zu diesem Link gibt es keine Bewerbung (mehr). Möglicherweise wurde sie bereits gelöscht.' });
  return {
    application: { job_title: db.jobs.find((j) => j.id === app.job_id)?.title, status: app.status, delete_after: app.delete_after, created_at: app.created_at },
    history: db.history.filter((h) => h.application_id === app.id).map(({ to_status, changed_at }) => ({ to_status, changed_at })),
  };
});

export const withdrawApplication = (token) => respond((db) => {
  const app = db.applications.find((a) => a.status_token === token);
  if (!app) throw new ApiError(404, { error: 'Zu diesem Link gibt es keine Bewerbung (mehr).' });
  removeApplication(db, app.id);
  return { ok: true };
});

// =====================================================================
// Verwaltungsbereich (Login nötig)
// =====================================================================

export const getDashboard = () => respond((db) => {
  requireLogin(db);
  const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString();
  return {
    stats: {
      published: db.jobs.filter((j) => j.status === 'published').length,
      openApplications: db.applications.filter((a) => !STAGES.find((s) => s.key === a.status).final).length,
      deletionsNext30Days: db.applications.filter((a) => a.delete_after && a.delete_after <= in30).length,
    },
    counts: STAGES.map((s) => ({ key: s.key, label: s.label, n: db.applications.filter((a) => a.status === s.key).length })),
    recent: [...db.applications].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5).map((a) => present(db, a)),
  };
});

export const getAdminJobs = (status) => respond((db) => {
  requireLogin(db);
  const jobs = db.jobs
    .filter((j) => !JOB_STATUSES[status] || j.status === status)
    .map((j) => {
      const apps = db.applications.filter((a) => a.job_id === j.id);
      return { ...j, app_count: apps.length, new_count: apps.filter((a) => a.status === 'new').length };
    })
    .sort((a, b) => (b.status === 'published') - (a.status === 'published') || b.updated_at.localeCompare(a.updated_at));
  return { jobs };
});

export const getAdminJob = (id) => respond((db) => {
  requireLogin(db);
  const job = db.jobs.find((j) => j.id === Number(id));
  if (!job) throw new ApiError(404, { error: 'Stelle nicht gefunden.' });
  return { job };
});

function validateJob(input) {
  const d = {};
  ['title', 'department', 'location', 'employment_type', 'description', 'requirements', 'status'].forEach((k) => { d[k] = str(input[k]); });
  const errors = {};
  [['title', 150], ['department', 100], ['location', 100]].forEach(([k, max]) => {
    if (!d[k] || d[k].length > max) errors[k] = `Pflichtfeld, höchstens ${max} Zeichen.`;
  });
  ['description', 'requirements'].forEach((k) => {
    if (d[k].length < 20 || d[k].length > 10000) errors[k] = 'Bitte zwischen 20 und 10.000 Zeichen.';
  });
  if (!EMPLOYMENT_TYPES.includes(d.employment_type)) errors.employment_type = 'Ungültige Auswahl.';
  if (!JOB_STATUSES[d.status]) errors.status = 'Ungültige Auswahl.';
  if (Object.keys(errors).length) throw new ApiError(422, { errors });
  return d;
}

export const createJob = (input) => respond((db) => {
  requireLogin(db);
  const d = validateJob(input);
  const job = { id: nextId(db.jobs), ...d, created_at: now(), updated_at: now() };
  db.jobs.push(job);
  return { id: job.id };
});

export const updateJob = (id, input) => respond((db) => {
  requireLogin(db);
  const job = db.jobs.find((j) => j.id === Number(id));
  if (!job) throw new ApiError(404, { error: 'Stelle nicht gefunden.' });
  Object.assign(job, validateJob(input), { updated_at: now() });
  return { ok: true };
});

export const deleteJob = (id) => respond((db) => {
  requireAdmin(db);
  const count = db.applications.filter((a) => a.job_id === Number(id)).length;
  if (count) throw new ApiError(409, { error: `Diese Stelle hat noch ${count} Bewerbung(en). Bitte setze sie stattdessen auf „Geschlossen“.` });
  db.jobs = db.jobs.filter((j) => j.id !== Number(id));
  return { ok: true };
});

export const getApplications = (filters = {}) => respond((db) => {
  requireLogin(db);
  const q = str(filters.q).toLowerCase();
  const rows = db.applications
    .filter((a) => !filters.job || a.job_id === Number(filters.job))
    .filter((a) => !filters.status || a.status === filters.status)
    // Namenssuche nicht bei neuen Bewerbungen – sonst ließe sich die Anonymisierung umgehen
    .filter((a) => !q || (a.status !== 'new' && `${a.first_name} ${a.last_name} ${a.email}`.toLowerCase().includes(q)))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const { items, pagination } = paginate(rows, filters.page);
  return {
    applications: items.map((a) => present(db, a)),
    pagination,
    jobs: db.jobs.map(({ id, title }) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title)),
  };
});

function findApp(db, id) {
  const app = db.applications.find((a) => a.id === Number(id));
  if (!app) throw new ApiError(404, { error: 'Diese Bewerbung existiert nicht (mehr).' });
  return app;
}

export const getApplication = (id) => respond((db) => {
  requireLogin(db);
  const app = findApp(db, id);
  return {
    application: present(db, app),
    attachments: [{ id: app.id, name: 'Lebenslauf.pdf', size: app.cv.size }],
    notes: db.notes.filter((n) => n.application_id === app.id).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    history: db.history.filter((h) => h.application_id === app.id),
  };
});

export const changeApplicationStatus = (id, status) => respond((db) => {
  const user = requireLogin(db);
  const app = findApp(db, id);
  const stage = STAGES.find((s) => s.key === status);
  if (!stage) throw new ApiError(422, { error: 'Unbekannter Status.' });
  if (app.status === status) return { ok: true };
  app.status = status;
  app.delete_after = stage.final
    ? new Date(Date.now() + (app.talent_pool ? RETENTION_DAYS.talentPool : RETENTION_DAYS.default) * 86_400_000).toISOString()
    : null;
  addHistory(db, app.id, status, user.name);
  return { ok: true };
});

export const rateApplication = (id, rating) => respond((db) => {
  requireLogin(db);
  const app = findApp(db, id);
  const r = Number(rating);
  app.rating = Number.isInteger(r) && r >= 1 && r <= 5 ? r : null;
  return { ok: true };
});

export const addNote = (id, body) => respond((db) => {
  const user = requireLogin(db);
  const app = findApp(db, id);
  const text = str(body);
  if (!text || text.length > 2000) throw new ApiError(422, { error: 'Die Notiz muss zwischen 1 und 2.000 Zeichen lang sein.' });
  db.notes.push({ id: nextId(db.notes), application_id: app.id, author: user.name, body: text, created_at: now() });
  return { ok: true };
});

export const deleteApplication = (id) => respond((db) => {
  requireAdmin(db);
  findApp(db, id);
  removeApplication(db, Number(id));
  return { ok: true };
});

/** Im Mock gibt es echte Dateien nur für Bewerbungen, die seit dem letzten Neuladen hochgeladen wurden. */
export function attachmentUrl(attachmentId) {
  const file = uploadedFiles.get(Number(attachmentId));
  return file ? URL.createObjectURL(file) : null;
}

export const getPipeline = (jobId) => respond((db) => {
  requireLogin(db);
  const jobs = db.jobs.filter((j) => j.status !== 'draft').map(({ id, title }) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title));
  const selected = Number(jobId) || Math.min(...jobs.map((j) => j.id));
  const columns = Object.fromEntries(STAGES.map((s) => [s.key, []]));
  db.applications
    .filter((a) => a.job_id === selected)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.created_at.localeCompare(b.created_at))
    .forEach((a) => columns[a.status].push(present(db, a)));
  return { jobs, jobId: selected, columns };
});

export const getUsers = () => respond((db) => {
  requireAdmin(db);
  return { users: db.users.map(({ password: _pw, ...u }) => u) };
});

export const createUser = (input) => respond((db) => {
  requireAdmin(db);
  const d = { name: str(input.name), email: str(input.email).toLowerCase(), role: str(input.role) };
  const errors = {};
  if (!d.name || d.name.length > 100) errors.name = 'Pflichtfeld, höchstens 100 Zeichen.';
  if (!isEmail(d.email)) errors.email = 'Ungültige E-Mail-Adresse.';
  else if (db.users.some((u) => u.email === d.email)) errors.email = 'Diese E-Mail-Adresse ist bereits vergeben.';
  if (!['recruiter', 'admin'].includes(d.role)) errors.role = 'Ungültige Rolle.';
  if (typeof input.password !== 'string' || input.password.length < 12) errors.password = 'Mindestens 12 Zeichen.';
  if (Object.keys(errors).length) throw new ApiError(422, { errors });
  db.users.push({ id: nextId(db.users), ...d, password: input.password, active: true, created_at: now() });
  return { ok: true };
});

export const toggleUser = (id) => respond((db) => {
  const me = requireAdmin(db);
  if (Number(id) === me.id) throw new ApiError(422, { error: 'Du kannst Deinen eigenen Zugang nicht deaktivieren.' });
  const user = db.users.find((u) => u.id === Number(id));
  if (user) user.active = !user.active;
  return { ok: true };
});
