import { db } from '../db.js';

// Grenzen laut E7: nach 5 Fehlversuchen 15 Minuten gesperrt
const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;

// Ist diese E-Mail gerade gesperrt? Gibt die restlichen Minuten zurück, sonst 0
export function lockedMinutes(email) {
  const row = db.prepare('SELECT locked_until FROM login_attempts WHERE email = ?').get(email);
  const rest = (row?.locked_until ?? 0) - Date.now();
  return rest > 0 ? Math.ceil(rest / 60000) : 0;
}

// Fehlversuch zählen; beim 5. Versuch die Sperre setzen
export function recordFailure(email) {
  const row = db.prepare('SELECT failed, locked_until FROM login_attempts WHERE email = ?').get(email);

  // War die letzte Sperre schon abgelaufen, wird wieder bei 0 gezählt
  const failed = (row && !row.locked_until ? row.failed : 0) + 1;
  const lockedUntil = failed >= MAX_FAILED ? Date.now() + LOCK_MS : null;

  db.prepare(`
    INSERT INTO login_attempts (email, failed, locked_until) VALUES (?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET failed = excluded.failed, locked_until = excluded.locked_until
  `).run(email, failed, lockedUntil);
}

// Erfolgreicher Login: Zähler zurücksetzen
export function clearFailures(email) {
  db.prepare('DELETE FROM login_attempts WHERE email = ?').run(email);
}