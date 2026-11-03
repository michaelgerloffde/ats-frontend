# API-Vertrag: was Dein Backend liefern muss

Das Frontend ruft ausschließlich die Funktionen in `src/api/index.js` auf. Jede Funktion entspricht einem Endpunkt unten.
Solange Dein Backend genau diese Pfade, Antwortformen und Statuscodes einhält, funktioniert das Frontend ohne Änderungen.

**Grundregeln**

- Alle Pfade beginnen mit `/api`. Der Vite-Dev-Server leitet sie an `http://localhost:3000` weiter (siehe `vite.config.js`).
- Anfragen und Antworten sind JSON. Ausnahme: die Bewerbung (`multipart/form-data`, weil eine Datei dabei ist).
- Datumswerte als ISO-String, z. B. `"2026-10-20T08:15:00.000Z"`.
- Feldnamen in `snake_case`, so wie sie in der Datenbank heißen.
- Fehler immer als JSON:
  - allgemein: `{ "error": "Text für die Nutzer:in" }`
  - Formularfehler (Status 422): `{ "errors": { "feldname": "Text", … } }` – das Frontend zeigt sie direkt unter dem passenden Feld an.

**Statuscodes**

| Code | Bedeutung | Frontend zeigt |
|---|---|---|
| 200 / 201 | OK / angelegt | Daten |
| 401 | nicht eingeloggt oder Login falsch | Login-Hinweis bzw. Fehlermeldung |
| 403 | eingeloggt, aber keine Berechtigung | „Kein Zugriff“ |
| 404 | gibt es nicht | „Nicht gefunden“ |
| 409 | Konflikt (z. B. Stelle hat noch Bewerbungen) | Meldung |
| 422 | Eingaben ungültig | Feldfehler |
| 429 | zu viele Versuche | Meldung |
| 500 | Fehler im Server | allgemeine Meldung |

---

## Datenobjekte

**Job**
```json
{ "id": 1, "title": "Disponent:in Straßenverkehr (m/w/d)", "department": "Disposition", "location": "Hamburg",
  "employment_type": "Vollzeit", "description": "…", "requirements": "…",
  "status": "published", "created_at": "…", "updated_at": "…" }
```
`employment_type`: `Vollzeit` · `Teilzeit` · `Werkstudium` · `Ausbildung`
`status`: `draft` · `published` · `closed` (öffentlich sichtbar ist nur `published`)

**Application** (so, wie Recruiter:innen sie sehen)
```json
{ "id": 12, "job_id": 1, "job_title": "…", "status": "screening", "rating": 4,
  "created_at": "…", "consent_at": "…", "talent_pool": false, "delete_after": null, "cover_letter": "…",
  "anonymized": false, "display_name": "Kim Beispiel",
  "first_name": "Kim", "last_name": "Beispiel", "email": "kim@example.test", "phone": "" }
```
`status`: `new` · `screening` · `interview` · `offer` · `hired` · `rejected`

**Anonyme Vorsichtung:** Ist `status` = `new`, liefert der Server **kein** `first_name`, `last_name`, `email`, `phone`,
sondern `"anonymized": true` und `"display_name": "Bewerbung #0012"`. Das muss im Server passieren – im Browser wäre es umgehbar.

**User:** `{ "id": 1, "name": "Alex Admin", "email": "admin@kranich.test", "role": "admin" }` (`role`: `admin` · `recruiter`). Nie das Passwort zurückgeben.

---

## Öffentliche Endpunkte

| Funktion in `api/index.js` | Methode + Pfad | Request | Antwort | Fehler |
|---|---|---|---|---|
| `getSession` | `GET /api/session` | – | `{ user }` (oder `user: null`) | – |
| `login` | `POST /api/login` | `{ email, password }` | `{ user }` | 401, 429 |
| `logout` | `POST /api/logout` | – | `{ ok: true }` | – |
| `getHome` | `GET /api/home` | – | `{ jobs: Job[] (3 neueste), openCount, departments: [{ department, n }] }` | – |
| `getJobs` | `GET /api/jobs?q=&department=&location=&type=&page=` | Query | `{ jobs: Job[], pagination: { page, pages, total }, options: { departments: [], locations: [] } }` | – |
| `getJob` | `GET /api/jobs/:id` | – | `{ job }` | 404 (auch bei draft/closed) |
| `applyToJob` | `POST /api/jobs/:id/apply` | multipart: `firstName`, `lastName`, `email`, `phone`, `coverLetter`, `consent` (`"true"`), `talentPool` (`"true"`/`"false"`), `website` (Honeypot), Datei `cv` | `201 { token }` | 404, 422 |
| `getApplicationStatus` | `GET /api/status/:token` | – | `{ application: { job_title, status, delete_after, created_at }, history: [{ to_status, changed_at }] }` | 404 |
| `withdrawApplication` | `POST /api/status/:token/withdraw` | `{ confirm: true }` | `{ ok: true }` – löscht alles sofort | 404 |

**Regeln für `applyToJob` (im Server prüfen):** Vor- und Nachname 1–100 Zeichen · gültige E-Mail · Telefon leer oder `^\+?[0-9 ()/-]{6,30}$` ·
Anschreiben ≤ 5.000 Zeichen · `consent` muss `"true"` sein · Datei vorhanden, ≤ 5 MB, **Inhalt** beginnt mit `%PDF-` ·
keine zweite laufende Bewerbung mit derselben E-Mail auf dieselbe Stelle · ist `website` ausgefüllt (Bot), nichts speichern und trotzdem `200 { ok: true }` antworten.
`token`: 48 zufällige Hex-Zeichen (z. B. `crypto.randomBytes(24).toString('hex')`).

## Verwaltung (alle brauchen Login → sonst 401)

| Funktion | Methode + Pfad | Request | Antwort | Fehler |
|---|---|---|---|---|
| `getDashboard` | `GET /api/admin/dashboard` | – | `{ stats: { published, openApplications, deletionsNext30Days }, counts: [{ key, label, n }], recent: Application[5] }` | 401 |
| `getAdminJobs` | `GET /api/admin/jobs?status=` | – | `{ jobs: (Job + { app_count, new_count })[] }` | 401 |
| `getAdminJob` | `GET /api/admin/jobs/:id` | – | `{ job }` | 401, 404 |
| `createJob` | `POST /api/admin/jobs` | Job-Felder ohne id | `201 { id }` | 401, 422 |
| `updateJob` | `PUT /api/admin/jobs/:id` | Job-Felder | `{ ok: true }` | 401, 404, 422 |
| `deleteJob` | `DELETE /api/admin/jobs/:id` | – | `{ ok: true }` | 401, **403 (nur Admin)**, 409 |
| `getApplications` | `GET /api/admin/applications?job=&status=&q=&page=` | – | `{ applications: Application[], pagination, jobs: [{ id, title }] }` | 401 |
| `getApplication` | `GET /api/admin/applications/:id` | – | `{ application, attachments: [{ id, name, size }], notes: [{ id, author, body, created_at }], history: [{ to_status, author, changed_at }] }` | 401, 404 |
| `changeApplicationStatus` | `POST /api/admin/applications/:id/status` | `{ status }` | `{ ok: true }` | 401, 404, 422 |
| `rateApplication` | `POST /api/admin/applications/:id/rating` | `{ rating }` (1–5) | `{ ok: true }` | 401, 404 |
| `addNote` | `POST /api/admin/applications/:id/notes` | `{ body }` (1–2.000 Zeichen) | `201 { ok: true }` | 401, 404, 422 |
| `deleteApplication` | `DELETE /api/admin/applications/:id` | – | `{ ok: true }` | 401, **403 (nur Admin)**, 404 |
| `attachmentUrl` | `GET /api/admin/attachments/:id` | – | die PDF-Datei als Download | 401, 404 |
| `getPipeline` | `GET /api/admin/pipeline?job=` | – | `{ jobs: [{ id, title }], jobId, columns: { new: Application[], screening: […], … } }` | 401 |
| `getUsers` | `GET /api/admin/users` | – | `{ users: User[] }` (+ `active`, `created_at`) | 401, **403** |
| `createUser` | `POST /api/admin/users` | `{ name, email, role, password }` (Passwort ≥ 12 Zeichen) | `201 { ok: true }` | 401, 403, 422 |
| `toggleUser` | `POST /api/admin/users/:id/toggle` | – | `{ ok: true }` | 401, 403, 422 (eigener Zugang) |

**Regeln beim Statuswechsel:** Wechselt eine Bewerbung nach `hired` oder `rejected`, setzt der Server `delete_after`
auf heute + 180 Tage (mit Talentpool: + 730 Tage). Jeder Wechsel kommt mit Person und Zeit in den Verlauf.
Ein täglicher Löschlauf entfernt alle Bewerbungen mit abgelaufenem `delete_after` – inklusive Datei.

**Namenssuche (`q`)** darf Bewerbungen im Status `new` nicht finden, sonst wäre die Anonymisierung umgehbar.
