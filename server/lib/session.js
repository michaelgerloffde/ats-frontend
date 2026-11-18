import crypto from 'node:crypto';
import { db } from '../db.js';

// Name des Cookies und Zeitgrenzen laut E7
export const COOKIE_NAME = 'sid';
const IDLE_MS = 30 * 60 * 1000;          // 30 Minuten ohne Aktivität
const ABSOLUTE_MS = 8 * 60 * 60 * 1000;  // spätestens nach 8 Stunden

// Cookie-Einstellungen: für JavaScript unlesbar, nur an die eigene Seite, im Betrieb nur über HTTPS
export const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: ABSOLUTE_MS,
};

// In der Datenbank steht nur der Hash des Cookie-Werts, nicht der Wert selbst
function hash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Neue Sitzung anlegen und den Cookie-Wert zurückgeben
export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  db.prepare(`
    INSERT INTO sessions (id, user_id, created_at, last_seen_at) VALUES (?, ?, ?, ?)
  `).run(hash(token), userId, now, now);
  return token;
}

// Angemeldeten Nutzer zum Cookie-Wert finden; abgelaufene Sitzungen werden gelöscht
export function getSessionUser(token) {
  if (!token) return null;

  const session = db.prepare(`
    SELECT s.id, s.created_at, s.last_seen_at, u.id AS user_id, u.name, u.email, u.role, u.active
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
  `).get(hash(token));

  if (!session) return null;

  const now = Date.now();
  const expired = now - session.last_seen_at > IDLE_MS || now - session.created_at > ABSOLUTE_MS;
  if (expired || session.active !== 1) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
    return null;
  }

  // Aktivität merken, damit die 30 Minuten neu beginnen
  db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').run(now, session.id);
  return { id: session.user_id, name: session.name, email: session.email, role: session.role };
}

// Sitzung beenden
export function deleteSession(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE id = ?').run(hash(token));
}

// Cookie-Wert aus der Anfrage lesen (ohne Zusatzpaket)
export function readSessionCookie(req) {
  const header = req.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === COOKIE_NAME) return value.join('=');
  }
  return null;
}


// Wächter für geschützte Routen: ohne gültige Sitzung -> 401, sonst Nutzer in req.user
export function requireLogin(req, res, next) {
  const user = getSessionUser(readSessionCookie(req));
  if (!user) {
    return res.status(401).json({ error: 'Bitte melde Dich an.' });
  }
  req.user = user;
  next();
}


// Wächter nur für Admins: muss NACH requireLogin laufen; sonst 403
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Das darf nur ein Admin.' });
  }
  next();
}

// CSRF-Schutz: Token aus dem Sitzungs-Cookie ableiten (eigener Zweck "csrf:")
export function csrfToken(token) {
  return crypto.createHash('sha256').update(`csrf:${token}`).digest('hex');
}

// Wächter gegen CSRF: ändernde Anfragen brauchen den passenden Header, sonst 403
export function requireCsrf(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD') return next();

  const expected = Buffer.from(csrfToken(readSessionCookie(req) ?? ''));
  const sent = Buffer.from(String(req.headers['x-csrf-token'] ?? ''));
  if (sent.length !== expected.length || !crypto.timingSafeEqual(sent, expected)) {
    return res.status(403).json({ error: 'Sicherheitsprüfung fehlgeschlagen. Bitte lade die Seite neu.' });
  }
  next();
}