import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { db, startTestServer, stopTestServer } from './helpers.js';

const { createSession, csrfToken } = await import('../lib/session.js');
const { purgeExpired } = await import('../lib/purge.js');

let baseUrl;
let adminToken;   // Cookie-Wert des Admins (ohne "sid=")

// Server vor allen Tests starten, danach stoppen (gemeinsam in helpers.js)
before(async () => {
  baseUrl = await startTestServer();
});
after(stopTestServer);

// Vor jedem Test: Bewerbungsdaten leeren, frische Admin-Sitzung
beforeEach(() => {
  db.exec(`
    DELETE FROM sessions;
    DELETE FROM notes;
    DELETE FROM status_history;
    DELETE FROM attachments;
    DELETE FROM applications;
    DELETE FROM candidates;
  `);
  adminToken = createSession(1);
});

// Hilfsfunktion: Bewerbung über das öffentliche Formular einreichen, ID zurückgeben
// Jede Bewerbung bekommt eine eigene E-Mail, weil doppelte Bewerbungen abgelehnt werden
let counter = 0;
async function createApplication() {
  counter += 1;
  const formData = new FormData();
  formData.append('firstName', 'Max');
  formData.append('lastName', 'Muster');
  formData.append('email', `max${counter}@example.de`);
  formData.append('coverLetter', 'Hallo, ich bewerbe mich.');
  formData.append('consent', 'true');
  formData.append('cv', new Blob(['%PDF-1.4 Testdatei'], { type: 'application/pdf' }), 'lebenslauf.pdf');
  const res = await fetch(`${baseUrl}/jobs/1/apply`, { method: 'POST', body: formData });
  const { token } = await res.json();
  return db.prepare('SELECT id FROM applications WHERE status_token = ?').get(token).id;
}

// Hilfsfunktion: Datum in X Tagen als ISO-Text (wie in der Datenbank)
function inDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

// S05 (E5): Löschlauf löscht nur Bewerbungen mit erreichtem Löschdatum, samt PDF
test('S05: Löschlauf löscht abgelaufene Bewerbungen mit PDF', async () => {
  const expired = await createApplication();
  const kept = await createApplication();
  db.prepare('UPDATE applications SET delete_after = ? WHERE id = ?').run(inDays(-1), expired);
  db.prepare('UPDATE applications SET delete_after = ? WHERE id = ?').run(inDays(30), kept);

  assert.equal(purgeExpired(), 1);
  assert.equal(db.prepare('SELECT id FROM applications WHERE id = ?').get(expired), undefined);
  assert.ok(db.prepare('SELECT id FROM applications WHERE id = ?').get(kept));
  assert.equal(fs.readdirSync(process.env.UPLOAD_DIR).length, 1);

  // Mit einem Datum in 2 Monaten ist auch die zweite fällig
  assert.equal(purgeExpired(new Date(inDays(60))), 1);
  assert.equal(fs.readdirSync(process.env.UPLOAD_DIR).length, 0);
});

// S06 (E7): Sicherheits-Header durch Helmet
test('S06: Sicherheits-Header sind gesetzt', async () => {
  const res = await fetch(`${baseUrl}/jobs`);
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(res.headers.get('content-security-policy'));
});

// S07 (E7): Rate-Limit auf der Statusseite: 30 pro Minute, danach 429
test('S07: Statusseite sperrt nach 30 Abrufen mit 429', async () => {
  for (let i = 0; i < 30; i++) {
    assert.equal((await fetch(`${baseUrl}/status/abc`)).status, 404);
  }
  const res = await fetch(`${baseUrl}/status/abc`);
  assert.equal(res.status, 429);
  assert.ok(res.headers.get('retry-after'));
});

// S08 (E7): CSRF – Änderung ohne oder mit falschem Token -> 403, mit richtigem Token erlaubt
test('S08: Änderungen ohne gültigen CSRF-Token werden abgelehnt', async () => {
  const id = await createApplication();
  const rate = (headers) => fetch(`${baseUrl}/admin/applications/${id}/rating`, {
    method: 'POST',
    headers: { Cookie: `sid=${adminToken}`, 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ rating: 4 }),
  });

  assert.equal((await rate({})).status, 403);
  assert.equal((await rate({ 'X-CSRF-Token': 'falsch' })).status, 403);
  assert.equal((await rate({ 'X-CSRF-Token': csrfToken(adminToken) })).status, 200);

  // Lesen braucht keinen Token
  const read = await fetch(`${baseUrl}/admin/dashboard`, { headers: { Cookie: `sid=${adminToken}` } });
  assert.equal(read.status, 200);
});

// T09 (E9): SQL-Injection in Suche und Login hat keine Wirkung
test('T09: SQL-Injection in Suche und Login wirkt nicht', async () => {
  await createApplication();
  const attack = "' OR 1=1 --";

  const search = await fetch(`${baseUrl}/admin/applications?q=${encodeURIComponent(attack)}`, {
    headers: { Cookie: `sid=${adminToken}` },
  });
  assert.equal(search.status, 200);
  assert.equal((await search.json()).applications.length, 0);

  const login = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: attack, password: attack }),
  });
  assert.equal(login.status, 401);

  // Tabelle ist noch da und unverändert
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM applications').get().n, 1);
});