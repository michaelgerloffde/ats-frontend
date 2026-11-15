import crypto from 'node:crypto';
import { promisify } from 'node:util';

// scrypt als Promise, damit der Server beim Rechnen nicht blockiert
const scrypt = promisify(crypto.scrypt);

// Mindestlänge laut E7 (OWASP)
export const MIN_PASSWORD_LENGTH = 15;

// Einstellungen nach OWASP Password Storage Cheat Sheet
const OPTIONS = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const KEY_LENGTH = 64;

// Passwort -> "salt:hash" zum Speichern in der Datenbank
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, KEY_LENGTH, OPTIONS);
  return `${salt}:${hash.toString('hex')}`;
}

// Eingegebenes Passwort mit gespeichertem "salt:hash" vergleichen
export async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = await scrypt(password, salt, KEY_LENGTH, OPTIONS);
  return crypto.timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}