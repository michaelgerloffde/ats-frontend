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

// Vor jedem Test: Sitzungen, Fehlversuche und Bewerbungen leeren, damit jeder Test frisch startet
beforeEach(() => {
  db.exec(`
    DELETE FROM sessions;
    DELETE FROM login_attempts;
    DELETE FROM status_history;
    DELETE FROM attachments;
    DELETE FROM applications;
    DELETE FROM candidates;
  `);
});

// Hilfsfunktion: Login-Anfrage mit E-Mail und Passwort
function login(email, password) {
  return fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

// Hilfsfunktion: richtig anmelden und den Cookie "sid=..." zurückgeben
async function loginAsAdmin() {
  const res = await login('admin@test.de', 'testpasswort-mit-15-zeichen');
  return res.headers.get('set-cookie').split(';')[0];
}

// Hilfsfunktion: Dashboard abrufen, mit oder ohne Cookie
function dashboard(cookie) {
  return fetch(`${baseUrl}/admin/dashboard`, { headers: cookie ? { Cookie: cookie } : {} });
}

// T07 aus E9: Verwaltungsroute ohne Login -> 401
test('T07: Admin-Route ohne Login liefert 401', async () => {
  const res = await dashboard();
  assert.equal(res.status, 401);
});

// Falsches Passwort und unbekannte E-Mail -> gleiche Meldung, verrät nichts
test('A01: falsches Passwort und unbekannte E-Mail geben dieselbe Meldung', async () => {
  const wrongPassword = await login('admin@test.de', 'falsches-passwort');
  const unknownEmail = await login('gibtsnicht@test.de', 'falsches-passwort');

  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  assert.deepEqual(await wrongPassword.json(), await unknownEmail.json());
});

// Richtiger Login -> Cookie mit HttpOnly und SameSite=Strict, Dashboard erreichbar
test('A02: richtiger Login setzt sicheren Cookie und öffnet das Dashboard', async () => {
  const res = await login('admin@test.de', 'testpasswort-mit-15-zeichen');
  assert.equal(res.status, 200);

  const setCookie = res.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);

  const cookie = setCookie.split(';')[0];
  assert.equal((await dashboard(cookie)).status, 200);
});

// Nach dem Abmelden ist der alte Cookie wertlos
test('A03: nach dem Logout liefert der alte Cookie 401', async () => {
  const cookie = await loginAsAdmin();

  await fetch(`${baseUrl}/logout`, { method: 'POST', headers: { Cookie: cookie } });

  assert.equal((await dashboard(cookie)).status, 401);
});

// Sperre: 5 Fehlversuche -> 401, der 6. Versuch -> 429, auch mit richtigem Passwort
test('A04: nach 5 Fehlversuchen ist das Konto gesperrt (429)', async () => {
  for (let i = 1; i <= 5; i++) {
    assert.equal((await login('admin@test.de', 'falsches-passwort')).status, 401);
  }
  assert.equal((await login('admin@test.de', 'falsches-passwort')).status, 429);
  assert.equal((await login('admin@test.de', 'testpasswort-mit-15-zeichen')).status, 429);
});

// Dashboard zeigt neue Bewerbungen anonym (E4)
test('A05: Dashboard zeigt neue Bewerbung ohne Namen', async () => {
  const formData = new FormData();
  formData.append('firstName', 'Max');
  formData.append('lastName', 'Muster');
  formData.append('email', 'max@example.de');
  formData.append('coverLetter', 'Hallo, ich bewerbe mich.');
  formData.append('consent', 'true');
  formData.append('cv', new Blob(['%PDF-1.4 Testdatei'], { type: 'application/pdf' }), 'lebenslauf.pdf');
  await fetch(`${baseUrl}/jobs/1/apply`, { method: 'POST', body: formData });

  const cookie = await loginAsAdmin();
  const body = await (await dashboard(cookie)).json();

  assert.equal(body.recent.length, 1);
  assert.match(body.recent[0].display_name, /^Bewerbung #\d{4}$/);
  assert.ok(!JSON.stringify(body).includes('Muster'));
});