# API: Endpunkte des Backends

Das Frontend ruft ausschließlich die Funktionen in `src/api/index.js` auf. Jede Funktion entspricht einem Endpunkt unten.
Die Grundstruktur stammt aus dem ursprünglichen Frontend; Abweichungen durch die Umsetzung (z. B. CSRF, Aufdecken mit Bestätigung, Notizen bearbeiten) sind eingearbeitet.

**Grundregeln**

- Alle Pfade beginnen mit `/api`. In der Entwicklung leitet Vite sie an `http://localhost:3000` weiter (siehe `vite.config.js`), im Betrieb beantwortet Express sie direkt.
- Anfragen und Antworten sind JSON. Ausnahme: die Bewerbung (`multipart/form-data`, weil eine Datei dabei ist).
- Datumswerte als ISO-String, z. B. `"2026-10-20T08:15:00.000Z"`.
- Feldnamen in `snake_case`, so wie sie in der Datenbank heißen.
- Fehler immer als JSON:
  - allgemein: `{ "error": "Text für die Nutzer" }`
  - Formularfehler (Status 422): `{ "errors": { "feldname": "Text", … } }`; das Frontend zeigt sie unter dem passenden Feld an.
- **Sitzung:** Cookie `sid` (`HttpOnly`, `SameSite=Strict`, im Betrieb `Secure`). Abmeldung nach 30 Minuten ohne Aktivität, spätestens nach 8 Stunden.
- **CSRF:** Alle `POST`, `PUT` und `DELETE` unter `/api/admin` brauchen den Header `X-CSRF-Token`. Den Wert liefern `POST /api/login` und `GET /api/session` im Feld `csrfToken`. Fehlt er oder passt er nicht: 403.

**Statuscodes**

| Code | Bedeutung |
|---|---|
| 200 / 201 | OK / angelegt |
| 401 | nicht angemeldet oder Login falsch |
| 403 | angemeldet, aber keine Berechtigung; oder CSRF-Token fehlt/falsch |
| 404 | gibt es nicht |
| 409 | Konflikt (Stelle hat noch Bewerbungen; Aufdecken braucht Bestätigung) |
| 422 | Eingaben ungültig |
| 429 | zu viele Versuche (Login-Sperre, Rate-Limit); bei Rate-Limits mit Header `Retry-After` |
| 500 | Fehler im Server (allgemeine Meldung, Details nur im Server-Log) |

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

**Application** (so, wie Recruiter sie sehen; Auszug)
```json
{ "id": 12, "job_id": 1, "job_title": "…", "status": "interview", "rating": 4,
  "created_at": "…", "privacy_ack_at": "…", "delete_after": null, "cover_letter": "…",
  "anonymized": false, "display_name": "Kim Beispiel",
  "first_name": "Kim", "last_name": "Beispiel", "email": "kim@example.test", "phone": "" }
```
`status`: `new` · `screening` · `interview` · `offer` · `hired` · `rejected`

**Anonyme Sichtung:** Solange eine Bewerbung nicht aufgedeckt ist, liefert der Server **kein** `first_name`, `last_name`, `email`, `phone`,
sondern `"anonymized": true` und `"display_name": "Bewerbung #0012"`. Aufgedeckt wird beim Wechsel ins Gespräch (`interview`) oder später, nach Bestätigung (siehe Statuswechsel). Das passiert im Server; im Browser wäre es umgehbar.

**User:** `{ "id": 1, "name": "Alex Admin", "email": "admin@kranich.test", "role": "admin" }` (`role`: `admin` · `recruiter`). Das Passwort wird nie zurückgegeben.

---

## Öffentliche Endpunkte

| Funktion in `api/index.js` | Methode + Pfad | Request | Antwort | Fehler |
|---|---|---|---|---|
| `getSession` | `GET /api/session` | – | `{ user, csrfToken }` (ohne Login: `user: null`, `csrfToken: null`) | – |
| `login` | `POST /api/login` | `{ email, password }` | `{ user, csrfToken }` + Cookie | 401, 429 |
| `logout` | `POST /api/logout` | – | `{ ok: true }` | – |
| `getHome` | `GET /api/home` | – | `{ jobs: Job[] (3 neueste), openCount, departments: [{ department, n }] }` | – |
| `getJobs` | `GET /api/jobs?q=&department=&location=&type=&page=` | Query | `{ jobs: Job[], pagination: { page, pages, total }, options: { departments: [], locations: [] } }` | – |
| `getJob` | `GET /api/jobs/:id` | – | `{ job }` | 404 (auch bei draft/closed) |
| `applyToJob` | `POST /api/jobs/:id/apply` | multipart: `firstName`, `lastName`, `email`, `phone`, `coverLetter`, `consent` (`"true"`), `website` (Honeypot), Datei `cv` | `201 { token }` | 404, 422, 429 |
| `getApplicationStatus` | `GET /api/status/:token` | – | `{ application: { job_title, status, delete_after, created_at }, history: [{ to_status, changed_at }] }` | 404, 429 |
| `withdrawApplication` | `POST /api/status/:token/withdraw` | `{ confirm: true }` | `{ ok: true }`; löscht Daten und PDF sofort | 404, 422, 429 |

**Regeln für `applyToJob`:** Vor- und Nachname 1–100 Zeichen · gültige E-Mail · Telefon leer oder `^\+?[0-9 ()/-]{6,30}$` ·
Anschreiben ≤ 5.000 Zeichen · `consent` muss `"true"` sein (Datenschutzhinweise gelesen, gespeichert als `privacy_ack_at`) · Datei vorhanden, ≤ 5 MB, **Inhalt** beginnt mit `%PDF-` ·
keine zweite laufende Bewerbung mit derselben E-Mail auf dieselbe Stelle · ist `website` ausgefüllt (Bot), wird nichts gespeichert und trotzdem `200 { ok: true }` geantwortet.
`token`: 48 zufällige Hex-Zeichen.

**Rate-Limits je IP-Adresse:** Bewerbung 10 pro Stunde; Status-Seite und Zurückziehen zusammen 30 pro Minute. Darüber: 429 mit `Retry-After`.
**Login-Sperre:** nach 5 Fehlversuchen für dieselbe E-Mail 15 Minuten lang 429. Unbekannte E-Mail und falsches Passwort ergeben dieselbe Meldung.

## Verwaltung (alle brauchen Login, sonst 401; ändernde Anfragen zusätzlich den CSRF-Header, sonst 403)

| Funktion | Methode + Pfad | Request | Antwort | Fehler |
|---|---|---|---|---|
| `getDashboard` | `GET /api/admin/dashboard` | – | `{ stats: { published, openApplications, deletionsNext30Days }, counts: [{ key, label, n }], recent: Application[5] }` | 401 |
| `getAdminJobs` | `GET /api/admin/jobs?status=` | – | `{ jobs: (Job + { app_count, new_count })[] }` | 401 |
| `getAdminJob` | `GET /api/admin/jobs/:id` | – | `{ job }` | 401, 404 |
| `createJob` | `POST /api/admin/jobs` | Job-Felder ohne id | `201 { id }` | 401, 422 |
| `updateJob` | `PUT /api/admin/jobs/:id` | Job-Felder | `{ ok: true }` | 401, 404, **403 (nur Ersteller oder Admin)**, 422 |
| `deleteJob` | `DELETE /api/admin/jobs/:id` | – | `{ ok: true }` | 401, **403 (nur Admin)**, 409 |
| `getApplications` | `GET /api/admin/applications?job=&status=&q=&page=` | – | `{ applications: Application[], pagination, jobs: [{ id, title }] }` (10 je Seite) | 401 |
| `getApplication` | `GET /api/admin/applications/:id` | – | `{ application, attachments: [{ id, size }], notes: [{ id, author, body, created_at, editable }], history: [{ to_status, author, changed_at }] }` | 401, 404 |
| `changeApplicationStatus` | `POST /api/admin/applications/:id/status` | `{ status, confirmReveal }` | `{ ok: true }` | 401, 404, 409, 422 |
| `rateApplication` | `POST /api/admin/applications/:id/rating` | `{ rating }` (ganze Zahl 1–5) | `{ ok: true }` | 401, 404, 422 |
| `addNote` | `POST /api/admin/applications/:id/notes` | `{ body }` (1–2.000 Zeichen) | `201` | 401, 404, 422 |
| `updateNote` | `PUT /api/admin/notes/:id` | `{ body }` | `{ ok: true }` | 401, **403 (nur Verfasser, nur 15 Minuten)**, 404, 422 |
| `deleteApplication` | `DELETE /api/admin/applications/:id` | – | `{ ok: true }` | 401, **403 (nur Admin)**, 404 |
| `attachmentUrl` | `GET /api/admin/attachments/:id` | – | die PDF als Download mit neutralem Namen (`Bewerbung-0012-Lebenslauf.pdf`) | 401, 404 |
| `getPipeline` | `GET /api/admin/pipeline?job=` | – | `{ jobs: [{ id, title }], jobId, columns: { new: Application[], screening: […], … } }`; je Spalte nach Bewertung sortiert | 401 |
| `getUsers` | `GET /api/admin/users` | – | `{ users: User[] }` (+ `active`, `created_at`) | 401, **403 (nur Admin)** |
| `createUser` | `POST /api/admin/users` | `{ name, email, role, password }` (Passwort ≥ 15 Zeichen) | `201` | 401, 403, 422 |
| `toggleUser` | `POST /api/admin/users/:id/toggle` | – | `{ ok: true }`; beim Sperren werden die Sitzungen der Person beendet | 401, 403, 422 (eigener Zugang, letzter aktiver Admin) |

**Regeln beim Statuswechsel**
- Zurück auf `new` ist nicht erlaubt (422).
- Wechsel nach `interview`, `offer` oder `hired` deckt eine noch anonyme Bewerbung auf. Ohne `confirmReveal: true` antwortet der Server mit `409 { needsReveal: true }`; das Frontend fragt nach und sendet die Anfrage mit Bestätigung erneut. Das Aufdecken ist endgültig.
- Wechsel nach `hired` oder `rejected` setzt `delete_after` auf heute + 6 Monate; wird die Bewerbung wieder geöffnet, wird `delete_after` entfernt.
- Jeder Wechsel kommt mit Person und Zeit in den Verlauf.
- Ein Löschlauf im Server (beim Start und alle 24 Stunden) entfernt alle Bewerbungen mit erreichtem `delete_after`, samt PDF.

**Suche (`q`)**
- Eine Nummer (`12` oder `#12`) findet die Bewerbung mit dieser Nummer, auch wenn sie anonym ist.
- Name und E-Mail finden nur aufgedeckte Bewerbungen; sonst wäre die Anonymität umgehbar.