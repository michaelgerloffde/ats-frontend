import { Router } from 'express';
import { db } from '../db.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { clearFailures, lockedMinutes, recordFailure } from '../lib/login-lock.js';
import {
  COOKIE_NAME, cookieOptions, createSession, deleteSession, csrfToken, getSessionUser, readSessionCookie,
} from '../lib/session.js';

const router = Router();

// Ersatz-Hash für unbekannte E-Mails: Die Antwort dauert dann genauso lange wie bei bekannten
const DUMMY_HASH = await hashPassword('platzhalter-fuer-unbekannte-nutzer');

// Anmelden: E-Mail und Passwort prüfen, bei Erfolg Sitzung und Cookie anlegen
router.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  // Gesperrt? Dann gar nicht erst prüfen (E7: 5 Fehlversuche -> 15 Minuten)
  const minutes = lockedMinutes(email);
  if (minutes > 0) {
    return res.status(429).json({ error: `Zu viele Fehlversuche. Bitte versuche es in ${minutes} Minuten erneut.` });
  }

  const user = db.prepare(`
    SELECT id, name, email, role, active, password_hash FROM users WHERE email = ?
  `).get(email);

  const passwordOk = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);

  // Gleiche Meldung für alle Fälle: verrät nicht, ob es die E-Mail gibt
  if (!user || !passwordOk || user.active !== 1) {
    recordFailure(email);
    return res.status(401).json({ error: 'E-Mail-Adresse oder Passwort ist falsch.' });
  }

  clearFailures(email);
  const token = createSession(user.id);
  res.cookie(COOKIE_NAME, token, cookieOptions);
  // Nutzer und CSRF-Token zurückgeben
  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    csrfToken: csrfToken(token),
  });
});

// Abmelden: Sitzung in der Datenbank löschen und Cookie entfernen
router.post('/logout', (req, res) => {
  deleteSession(readSessionCookie(req));
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
});

// Wer ist angemeldet? Das Frontend fragt das beim Start
router.get('/session', (req, res) => {
  // Nutzer und (falls angemeldet) CSRF-Token zurückgeben
  const token = readSessionCookie(req);
  const user = getSessionUser(token);
  res.json({ user, csrfToken: user ? csrfToken(token) : null });
});

export default router;