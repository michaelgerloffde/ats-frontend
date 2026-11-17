/**
 * DIE API-SCHICHT – die einzige Stelle, an der das Frontend mit "dem Server" spricht.
 *
 * Jede Seite importiert ihre Funktionen von hier, z. B.  import { getJobs } from '../api';
 * Im Moment antwortet überall der Mock (./mock.js). Wenn Dein Backend eine Route kann,
 * stellst Du hier GENAU EINE Funktion um: Mock-Zeile auskommentieren, http-Zeile einkommentieren.
 * Die Seiten musst Du dafür nicht anfassen – sie erwarten dieselbe Antwort-Form.
 *
 * Die Antwort-Formen und Fehlercodes jeder Funktion stehen in API.md.
 */
import * as mock from './mock.js';
import { request } from './http.js'; // eslint-disable-line no-unused-vars

export { ApiError } from './ApiError.js';
export { resetMockData } from './mock.js';

// ---------- Session / Login ----------

/** → { user: { id, name, email, role } | null } */
export function getSession() {
 return request('GET', '/session');
}

/** → { user } · 401 falsche Daten · 429 gesperrt */
export function login(email, password) {
 return request('POST', '/login', { body: { email, password } });
}

export function logout() {
  return request('POST', '/logout');
}

// ---------- Öffentlicher Bereich ----------

/** → { jobs: Job[3], openCount, departments: [{ department, n }] } */
export function getHome() {
  //return mock.getHome();
  return request('GET', '/home');
}

/** filters: { q, department, location, type, page } → { jobs, pagination, options } */
export function getJobs(filters) {
  //return mock.getJobs(filters);
  return request('GET', `/jobs?${new URLSearchParams(filters)}`);
}

/** → { job } · 404 */
export function getJob(id) {
  //return mock.getJob(id);
  return request('GET', `/jobs/${id}`);
}

export function applyToJob(id, formData) {
  // return mock.applyToJob(id, formData);
  return request('POST', `/jobs/${id}/apply`, { formData });
}

/** → { application: { job_title, status, delete_after, created_at }, history } · 404 */
export function getApplicationStatus(token) {
  return request('GET', `/status/${token}`);
}

/** Rückzug = sofortige Löschung → { ok } · 404 */
export function withdrawApplication(token) {
  return request('POST', `/status/${token}/withdraw`, { body: { confirm: true } });
}

// ---------- Verwaltung: Übersicht und Stellen (Login nötig → sonst 401) ----------

/** → { stats, counts, recent } */
export function getDashboard() {
  return request('GET', '/admin/dashboard');
}

/** status: '' | 'draft' | 'published' | 'closed' → { jobs } (mit app_count, new_count) */
export function getAdminJobs(status) {
  return request('GET', `/admin/jobs${status ? `?status=${status}` : ''}`);
}

/** → { job } · 404 */
export function getAdminJob(id) {
  return request('GET', `/admin/jobs/${id}`);
}

/** → 201 { id } · 422 { errors } */
export function createJob(job) {
  return request('POST', '/admin/jobs', { body: job });
}

/** → { ok } · 422 { errors } · 404 */
export function updateJob(id, job) {
 return request('PUT', `/admin/jobs/${id}`, { body: job });
}

/** nur Admin → { ok } · 403 · 409 (hat noch Bewerbungen) */
export function deleteJob(id) {
   return request('DELETE', `/admin/jobs/${id}`);
}

// ---------- Verwaltung: Bewerbungen ----------

/** filters: { job, status, q, page } → { applications, pagination, jobs } */
export function getApplications(filters) {
  return request('GET', `/admin/applications?${new URLSearchParams(filters)}`);
}

/** → { application, attachments, notes, history } · 404 */
export function getApplication(id) {
  return request('GET', `/admin/applications/${id}`);
}

/** → { ok } · 422 unbekannter/gesperrter Status · 409 { needsReveal } Aufdecken muss bestätigt werden */
export function changeApplicationStatus(id, status, confirmReveal = false) {
  return request('POST', `/admin/applications/${id}/status`, { body: { status, confirmReveal } });
}

/** rating: 1–5 → { ok } */
export function rateApplication(id, rating) {
  return request('POST', `/admin/applications/${id}/rating`, { body: { rating } });
}

/** → 201 { ok } · 422 */
export function addNote(id, body) {
 return request('POST', `/admin/applications/${id}/notes`, { body: { body } });
}


/** nur Verfasser, nur 15 Minuten nach dem Schreiben → { ok } · 403 · 422 */
export function updateNote(noteId, body) {
  return request('PUT', `/admin/notes/${noteId}`, { body: { body } });
}

/** nur Admin → { ok } · 403 */
export function deleteApplication(id) {
  return mock.deleteApplication(id);
  // return request('DELETE', `/admin/applications/${id}`);
}

/** Link zum Herunterladen des Lebenslaufs (oder null, wenn im Mock keine Datei vorliegt) */
export function attachmentUrl(attachmentId) {
 return `/api/admin/attachments/${attachmentId}`;
}

/** → { jobs, jobId, columns: { new: [...], screening: [...], ... } } */
export function getPipeline(jobId) {
  return request('GET', `/admin/pipeline${jobId ? `?job=${jobId}` : ''}`);
}

// ---------- Verwaltung: Nutzer:innen (nur Admin) ----------

/** → { users } · 403 */
export function getUsers() {
  return mock.getUsers();
  // return request('GET', '/admin/users');
}

/** user: { name, email, role, password } → 201 { ok } · 422 { errors } */
export function createUser(user) {
  return mock.createUser(user);
  // return request('POST', '/admin/users', { body: user });
}

/** → { ok } · 422 (eigener Zugang) */
export function toggleUser(id) {
  return mock.toggleUser(id);
  // return request('POST', `/admin/users/${id}/toggle`);
}
