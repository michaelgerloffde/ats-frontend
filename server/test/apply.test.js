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

// Hilfsfunktionen: gültiges Formular bauen und an Stelle 1 schicken
const PDF = new Blob(['%PDF-1.4 Testdatei'], { type: 'application/pdf' });

function validForm(changes = {}, file = PDF) {
  const fields = {
    firstName: 'Max',
    lastName: 'Muster',
    email: 'max@example.de',
    coverLetter: 'Hallo, ich bewerbe mich.',
    consent: 'true',
    ...changes,
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.append(key, value);
  formData.append('cv', file, 'lebenslauf.pdf');
  return formData;
}

function apply(formData) {
  return fetch(`${baseUrl}/jobs/1/apply`, { method: 'POST', body: formData });
}

// T01: gültige Bewerbung -> 201, Token, Eintrag in der Datenbank, PDF auf der Platte
test('T01: gültige Bewerbung wird gespeichert', async () => {
  const res = await apply(validForm());
  assert.equal(res.status, 201);

  const { token } = await res.json();
  assert.match(token, /^[0-9a-f]{48}$/);

  const application = db.prepare('SELECT id, status FROM applications WHERE status_token = ?').get(token);
  assert.equal(application.status, 'new');

  const attachment = db.prepare('SELECT stored_name FROM attachments WHERE application_id = ?').get(application.id);
  assert.ok(fs.existsSync(path.join(process.env.UPLOAD_DIR, attachment.stored_name)));
});

// T02 Grenzwert: genau 5.000 Zeichen sind erlaubt
test('T02a: Anschreiben mit 5.000 Zeichen wird angenommen', async () => {
  const res = await apply(validForm({ coverLetter: 'a'.repeat(5000) }));
  assert.equal(res.status, 201);
});

// T02 Grenzwert: 5.001 Zeichen sind eins zu viel
test('T02b: Anschreiben mit 5.001 Zeichen wird abgelehnt', async () => {
  const res = await apply(validForm({ coverLetter: 'a'.repeat(5001) }));
  assert.equal(res.status, 422);

  const { errors } = await res.json();
  assert.ok(errors.coverLetter);
});

// T03: Datei heißt .pdf, ist aber keine PDF -> 422, nichts gespeichert
test('T03: umbenannte Nicht-PDF wird abgelehnt', async () => {
  const fake = new Blob(['Das ist keine PDF'], { type: 'application/pdf' });
  const res = await apply(validForm({}, fake));
  assert.equal(res.status, 422);

  const { errors } = await res.json();
  assert.ok(errors.cv);

  const { count } = db.prepare('SELECT COUNT(*) AS count FROM applications').get();
  assert.equal(count, 0);
});