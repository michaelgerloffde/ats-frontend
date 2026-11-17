import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db.js';

// Ordner für hochgeladene PDFs: normal data/uploads, in Tests ein anderer (über UPLOAD_DIR)
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join('data', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Bewerbung vollständig löschen: Datenbank (mit Anhängen, Notizen, Verlauf, Bewerber) und PDFs.
// Genutzt von: Rückzug durch Bewerber (B5), Löschen durch Admin (B7), Löschlauf (B8).
// Gibt false zurück, wenn es die Bewerbung nicht gibt.
export function deleteApplication(applicationId) {
  const application = db.prepare('SELECT id, candidate_id FROM applications WHERE id = ?').get(applicationId);
  if (!application) return false;

  // Dateinamen merken, bevor die Einträge gelöscht werden
  const files = db.prepare('SELECT stored_name FROM attachments WHERE application_id = ?').all(application.id);

  // Datenbank in einer Transaktion bereinigen
  db.exec('BEGIN');
  try {
    // Löscht durch ON DELETE CASCADE auch Anhänge, Notizen und Verlauf
    db.prepare('DELETE FROM applications WHERE id = ?').run(application.id);
    db.prepare('DELETE FROM candidates WHERE id = ?').run(application.candidate_id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  // Erst nach erfolgreichem Löschen in der Datenbank die PDFs entfernen
  for (const file of files) {
    fs.rmSync(path.join(UPLOAD_DIR, file.stored_name), { force: true });
  }
  return true;
}