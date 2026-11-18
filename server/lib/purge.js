import { db } from '../db.js';
import { deleteApplication } from './applications.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Alle Bewerbungen löschen, deren Löschdatum erreicht ist (E5); gibt die Anzahl zurück
export function purgeExpired(now = new Date()) {
  const due = db.prepare(`
    SELECT id FROM applications WHERE delete_after IS NOT NULL AND delete_after <= ?
  `).all(now.toISOString());

  for (const { id } of due) {
    deleteApplication(id);
  }
  return due.length;
}

// Löschlauf im Server (E6): sofort beim Start, danach alle 24 Stunden
export function startPurgeSchedule() {
  const run = () => {
    try {
      const count = purgeExpired();
      // Nur die Anzahl ins Log, keine personenbezogenen Daten (E7)
      console.log(`Löschlauf: ${count} abgelaufene Bewerbung(en) gelöscht.`);
    } catch (err) {
      console.error('Löschlauf fehlgeschlagen:', err.message);
    }
  };

  run();
  setInterval(run, DAY_MS).unref();
}