import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Testumgebung: Datenbank nur im Arbeitsspeicher, PDFs in einen eigenen Temp-Ordner
process.env.DB_FILE = ':memory:';
process.env.ADMIN_EMAIL = 'admin@test.de';
process.env.ADMIN_PASSWORD = 'testpasswort-mit-15-zeichen';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ats-test-'));

// Erst danach laden, damit db.js und die Routen die Testwerte übernehmen
const { db } = await import('../db.js');
await import('../scripts/init-db.js');
const { app } = await import('../app.js');
const { createSession } = await import('../lib/session.js');

let server;
let baseUrl;
let admin;       // Cookie des Admins
let recruiter;   // Cookie von Recruiterin Rita
let recruiter2;  // Cookie von Recruiter Rolf
let ritaId;

// Vor allen Tests: Server starten
before(async () => {
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

// Nach allen Tests: Server stoppen, Temp-Ordner löschen
after(() => {
  server.close();
  fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
});

// Vor jedem Test: Daten leeren, zwei Recruiter neu anlegen, Sitzungen direkt erzeugen.
// createSession statt Login über HTTP: spart pro Test die langsame scrypt-Rechnung.
beforeEach(() => {
  db.exec(`
    DELETE FROM sessions;
    DELETE FROM notes;
    DELETE FROM status_history;
    DELETE FROM attachments;
    DELETE FROM applications;
    DELETE FROM candidates;
    DELETE FROM jobs WHERE id > 5;
    DELETE FROM users WHERE role = 'recruiter';
  `);
  const addRecruiter = (name, email) => db.prepare(`
    INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, 'unbenutzt', 'recruiter')
  `).run(name, email).lastInsertRowid;

  ritaId = addRecruiter('Rita', 'rita@test.de');
  const rolfId = addRecruiter('Rolf', 'rolf@test.de');

  admin = `sid=${createSession(1)}`;
  recruiter = `sid=${createSession(ritaId)}`;
  recruiter2 = `sid=${createSession(rolfId)}`;
});

// Hilfsfunktion: Anfrage an die API mit Cookie und optional JSON
function api(method, url, cookie, body) {
  return fetch(`${baseUrl}${url}`, {
    method,
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// Hilfsfunktion: Bewerbung über das öffentliche Formular einreichen, ID zurückgeben
async function createApplication(firstName = 'Max', lastName = 'Muster') {
  const formData = new FormData();
  formData.append('firstName', firstName);
  formData.append('lastName', lastName);
  formData.append('email', `${firstName.toLowerCase()}@example.de`);
  formData.append('coverLetter', 'Hallo, ich bewerbe mich.');
  formData.append('consent', 'true');
  formData.append('cv', new Blob(['%PDF-1.4 Testdatei'], { type: 'application/pdf' }), 'lebenslauf.pdf');
  const res = await fetch(`${baseUrl}/jobs/1/apply`, { method: 'POST', body: formData });
  const { token } = await res.json();
  return db.prepare('SELECT id FROM applications WHERE status_token = ?').get(token).id;
}

// Hilfsfunktion: Status ändern
function changeStatus(id, status, cookie = admin, confirmReveal = false) {
  return api('POST', `/admin/applications/${id}/status`, cookie, { status, confirmReveal });
}

// T04 (E9): neue Bewerbung als Recruiter öffnen -> kein Name, keine Kontaktdaten
test('T04: neue Bewerbung ist für Recruiter anonym', async () => {
  const id = await createApplication();
  const res = await api('GET', `/admin/applications/${id}`, recruiter);
  assert.equal(res.status, 200);

  const { application } = await res.json();
  assert.equal(application.anonymized, true);
  assert.equal(application.display_name, `Bewerbung #${String(id).padStart(4, '0')}`);
  assert.equal(application.email, undefined);
  assert.equal(application.last_name, undefined);
});

// T05 (E9): zustandsbasiert, verbotener Übergang zurück auf "neu"
test('T05: Wechsel von Sichtung zurück auf neu wird abgelehnt (422)', async () => {
  const id = await createApplication();
  assert.equal((await changeStatus(id, 'screening')).status, 200);
  assert.equal((await changeStatus(id, 'new')).status, 422);
});

// T06 (E9): Abschluss setzt Löschdatum heute + 6 Monate
test('T06: Wechsel auf abgelehnt setzt Löschdatum in 6 Monaten', async () => {
  const id = await createApplication();
  assert.equal((await changeStatus(id, 'rejected')).status, 200);

  const { delete_after: deleteAfter } = db.prepare('SELECT delete_after FROM applications WHERE id = ?').get(id);
  const expected = new Date();
  expected.setMonth(expected.getMonth() + 6);
  assert.ok(Math.abs(Date.parse(deleteAfter) - expected.getTime()) < 60 * 1000);
});

// T08 (E9): Recruiter darf Bewerbungen nicht löschen
test('T08: Recruiter versucht Bewerbung zu löschen -> 403', async () => {
  const id = await createApplication();
  assert.equal((await api('DELETE', `/admin/applications/${id}`, recruiter)).status, 403);
  assert.ok(db.prepare('SELECT 1 FROM applications WHERE id = ?').get(id));
});

// V01: Aufdecken nur mit Bestätigung; danach bleiben die Daten sichtbar
test('V01: Aufdecken braucht Bestätigung und bleibt beim Zurückgehen', async () => {
  const id = await createApplication();

  const withoutConfirm = await changeStatus(id, 'interview');
  assert.equal(withoutConfirm.status, 409);
  assert.equal((await withoutConfirm.json()).needsReveal, true);

  assert.equal((await changeStatus(id, 'interview', admin, true)).status, 200);
  assert.equal((await changeStatus(id, 'screening')).status, 200);

  const { application } = await (await api('GET', `/admin/applications/${id}`, recruiter)).json();
  assert.equal(application.anonymized, false);
  assert.equal(application.email, 'max@example.de');
});

// V02: Wiederöffnen entfernt das Löschdatum; jeder Wechsel steht im Verlauf mit Autor
test('V02: Wiederöffnen entfernt Löschdatum, Verlauf mit Autor', async () => {
  const id = await createApplication();
  await changeStatus(id, 'rejected', recruiter);
  await changeStatus(id, 'screening', recruiter);

  const { delete_after: deleteAfter } = db.prepare('SELECT delete_after FROM applications WHERE id = ?').get(id);
  assert.equal(deleteAfter, null);

  const { history } = await (await api('GET', `/admin/applications/${id}`, admin)).json();
  assert.deepEqual(history.map((h) => h.to_status), ['new', 'rejected', 'screening']);
  assert.equal(history[1].author, 'Rita');
});

// V03: Suche findet anonyme Bewerbungen nur über die Nummer, nie über den Namen
test('V03: Namenssuche umgeht die Anonymität nicht', async () => {
  const anonymous = await createApplication('Anna', 'Anonym');
  const revealed = await createApplication('Bert', 'Bekannt');
  await changeStatus(revealed, 'interview', admin, true);

  const search = async (q) => {
    const { applications } = await (await api('GET', `/admin/applications?q=${encodeURIComponent(q)}`, recruiter)).json();
    return applications.map((a) => a.id);
  };

  assert.deepEqual(await search('Anonym'), []);
  assert.deepEqual(await search('Bekannt'), [revealed]);
  assert.deepEqual(await search(`#${anonymous}`), [anonymous]);
});

// V04: Stellen bearbeiten nur Ersteller oder Admin
test('V04: fremde Stelle -> 403, eigene Stelle -> 200', async () => {
  const job = {
    title: 'Testjob (m/w/d)', department: 'IT', location: 'Hamburg', employment_type: 'Vollzeit',
    description: 'Beschreibung mit mehr als zwanzig Zeichen.', requirements: 'Anforderungen mit mehr als zwanzig Zeichen.',
    status: 'draft',
  };
  assert.equal((await api('PUT', '/admin/jobs/1', recruiter, job)).status, 403);

  const { id } = await (await api('POST', '/admin/jobs', recruiter, job)).json();
  assert.equal((await api('PUT', `/admin/jobs/${id}`, recruiter, job)).status, 200);
  assert.equal((await api('PUT', `/admin/jobs/${id}`, recruiter2, job)).status, 403);
  assert.equal((await api('PUT', `/admin/jobs/${id}`, admin, job)).status, 200);
});

// V05: Notiz ändern nur Verfasser, nur 15 Minuten lang
test('V05: Notiz nur vom Verfasser und nur 15 Minuten änderbar', async () => {
  const id = await createApplication();
  assert.equal((await api('POST', `/admin/applications/${id}/notes`, recruiter, { body: 'Erste Notiz' })).status, 201);
  const { id: noteId } = db.prepare('SELECT id FROM notes').get();

  assert.equal((await api('PUT', `/admin/notes/${noteId}`, recruiter, { body: 'Korrigiert' })).status, 200);
  assert.equal((await api('PUT', `/admin/notes/${noteId}`, recruiter2, { body: 'Fremd' })).status, 403);

  db.prepare('UPDATE notes SET created_at = ? WHERE id = ?').run(new Date(Date.now() - 16 * 60 * 1000).toISOString(), noteId);
  assert.equal((await api('PUT', `/admin/notes/${noteId}`, recruiter, { body: 'Zu spät' })).status, 403);
});

// V06: Nutzerverwaltung nur Admin; nicht sich selbst sperren; Gesperrte sofort abgemeldet
test('V06: Sperren meldet sofort ab, Selbstsperre verboten', async () => {
  assert.equal((await api('GET', '/admin/users', recruiter)).status, 403);
  assert.equal((await api('POST', '/admin/users/1/toggle', admin)).status, 422);

  assert.equal((await api('POST', `/admin/users/${ritaId}/toggle`, admin)).status, 200);
  assert.equal((await api('GET', '/admin/dashboard', recruiter)).status, 401);
});