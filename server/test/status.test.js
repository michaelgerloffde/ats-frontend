import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { db, startTestServer, stopTestServer } from './helpers.js';

let baseUrl;

// Server vor allen Tests starten, danach stoppen (gemeinsam in helpers.js)
before(async () => {
  baseUrl = await startTestServer();
});
after(stopTestServer);

// Vor jedem Test: alle Bewerbungsdaten leeren (Stellen bleiben), damit jeder Test frisch startet
beforeEach(() => {
  db.exec(`
    DELETE FROM status_history;
    DELETE FROM attachments;
    DELETE FROM applications;
    DELETE FROM candidates;
  `);
});

// Hilfsfunktion: eine gültige Bewerbung abschicken und den Token zurückgeben
async function createApplication() {
  const formData = new FormData();
  formData.append('firstName', 'Max');
  formData.append('lastName', 'Muster');
  formData.append('email', 'max@example.de');
  formData.append('coverLetter', 'Hallo, ich bewerbe mich.');
  formData.append('consent', 'true');
  formData.append('cv', new Blob(['%PDF-1.4 Testdatei'], { type: 'application/pdf' }), 'lebenslauf.pdf');

  const res = await fetch(`${baseUrl}/jobs/1/apply`, { method: 'POST', body: formData });
  const { token } = await res.json();
  return token;
}

// Hilfsfunktion: Bewerbung zurückziehen, mit oder ohne Bestätigung
function withdraw(token, body) {
  return fetch(`${baseUrl}/status/${token}/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// S01: Status abrufen -> Titel, Stufe und Verlauf, aber keine persönlichen Daten
test('S01: Status mit gültigem Token zeigt Stand ohne persönliche Daten', async () => {
  const token = await createApplication();

  const res = await fetch(`${baseUrl}/status/${token}`);
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.application.status, 'new');
  assert.ok(body.application.job_title);
  assert.equal(body.history.length, 1);

  const text = JSON.stringify(body);
  assert.ok(!text.includes('max@example.de'));
  assert.ok(!text.includes('Muster'));
});

// S02: unbekannter Token -> 404
test('S02: Status mit unbekanntem Token liefert 404', async () => {
  const res = await fetch(`${baseUrl}/status/gibtesnicht`);
  assert.equal(res.status, 404);
});

// S03: ohne Bestätigung wird nichts gelöscht
test('S03: Zurückziehen ohne Bestätigung wird abgelehnt', async () => {
  const token = await createApplication();

  const res = await withdraw(token, {});
  assert.equal(res.status, 422);

  const { count } = db.prepare('SELECT COUNT(*) AS count FROM applications').get();
  assert.equal(count, 1);
});

// S04: mit Bestätigung -> alle Daten und die PDF sind weg, der Link liefert 404
test('S04: Zurückziehen löscht alle Daten und die PDF', async () => {
  const token = await createApplication();
  const { stored_name } = db.prepare('SELECT stored_name FROM attachments').get();

  const res = await withdraw(token, { confirm: true });
  assert.equal(res.status, 200);

  for (const table of ['candidates', 'applications', 'status_history', 'attachments']) {
    const { count } = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get();
    assert.equal(count, 0, `${table} ist nicht leer`);
  }
  assert.ok(!fs.existsSync(path.join(process.env.UPLOAD_DIR, stored_name)));

  const again = await fetch(`${baseUrl}/status/${token}`);
  assert.equal(again.status, 404);
});