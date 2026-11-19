import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Testumgebung: Datenbank nur im Arbeitsspeicher, PDFs in einen eigenen Temp-Ordner.
// Muss gesetzt sein, BEVOR db.js geladen wird.
process.env.DB_FILE = ':memory:';
process.env.ADMIN_EMAIL = 'admin@test.de';
process.env.ADMIN_PASSWORD = 'testpasswort-mit-15-zeichen';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ats-test-'));

// Erst danach laden, damit db.js und die Routen die Testwerte übernehmen
const dbModule = await import('../db.js');
await import('../scripts/init-db.js');
const appModule = await import('../app.js');

export const db = dbModule.db;
const app = appModule.app;
let server;

// Server auf einem freien Port starten, Basis-Adresse der API zurückgeben
export async function startTestServer() {
  server = app.listen(0);
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}/api`;
}

// Server stoppen und den Temp-Ordner mit den Test-PDFs löschen
export function stopTestServer() {
  server.close();
  fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
}