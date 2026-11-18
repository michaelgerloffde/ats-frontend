import { ApiError } from './ApiError.js';
// CSRF-Token vom Server (kommt bei Login und Sitzungsabfrage)
let csrfToken = null;

/**
 * Echter HTTP-Client für Dein eigenes Backend.
 * Wird erst benutzt, wenn Du in src/api/index.js eine Funktion von mock auf http umstellst.
 *
 *   request('GET', '/jobs?q=Lager')                    → GET  /api/jobs?q=Lager
 *   request('POST', '/login', { body: { email, … } })   → JSON im Body
 *   request('POST', '/jobs/1/apply', { formData })      → Formular mit Datei (multipart)
 *
 * Gibt das JSON der Antwort zurück oder wirft einen ApiError.
 */
export async function request(method, path, { body, formData } = {}) {
  const headers = {};
  let payload;

  if (formData) {
    payload = formData; // Content-Type (multipart/form-data mit Boundary) setzt der Browser selbst
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  // CSRF-Schutz: bei POST/PUT/DELETE den Token als Header mitschicken
  if (method !== 'GET' && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload, credentials: 'same-origin' });
  } catch {
    // Server nicht erreichbar (läuft nicht, falscher Port, kein Netz)
    throw new ApiError(0, { error: 'Der Server ist nicht erreichbar. Läuft das Backend?' });
  }

  const data = await res.json().catch(() => ({}));

    // Server schickt bei Login und Sitzungsabfrage einen Token -> merken
  if (data.csrfToken) csrfToken = data.csrfToken;

  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}
