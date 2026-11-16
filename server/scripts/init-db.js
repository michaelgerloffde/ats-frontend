import { db } from '../db.js';
import { hashPassword, MIN_PASSWORD_LENGTH } from '../lib/password.js';

const NOW = "(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))";

// 0. Zugangsdaten für den ersten Admin aus der .env-Datei prüfen (E3/E7), bevor etwas gelöscht wird
const { ADMIN_NAME = 'Admin', ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Fehler: ADMIN_EMAIL und ADMIN_PASSWORD fehlen in server/.env (Vorlage: .env.example).');
  process.exit(1);
}
if (ADMIN_PASSWORD.length < MIN_PASSWORD_LENGTH) {
  console.error(`Fehler: ADMIN_PASSWORD muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`);
  process.exit(1);
}

// 1. Alte Tabellen löschen (zuerst die, die auf andere verweisen)
db.exec(`
  DROP TABLE IF EXISTS login_attempts;
  DROP TABLE IF EXISTS sessions;
  DROP TABLE IF EXISTS status_history;
  DROP TABLE IF EXISTS notes;
  DROP TABLE IF EXISTS attachments;
  DROP TABLE IF EXISTS applications;
  DROP TABLE IF EXISTS candidates;
  DROP TABLE IF EXISTS jobs;
  DROP TABLE IF EXISTS users;
`);

// 2. Tabellen nach dem ER-Diagramm (E2) anlegen
db.exec(`
  CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('recruiter', 'admin')),
    active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at    TEXT NOT NULL DEFAULT ${NOW}
  );

    CREATE TABLE sessions (
    id           TEXT PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at   INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL
  );

    CREATE TABLE login_attempts (
    email        TEXT PRIMARY KEY,
    failed       INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER
  );
  
  CREATE TABLE jobs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL,
    department      TEXT NOT NULL,
    location        TEXT NOT NULL,
    employment_type TEXT NOT NULL CHECK (employment_type IN ('Vollzeit', 'Teilzeit', 'Werkstudium', 'Ausbildung')),
    description     TEXT NOT NULL,
    requirements    TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
    created_by      INTEGER REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT ${NOW},
    updated_at      TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE candidates (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name  TEXT NOT NULL,
    email      TEXT NOT NULL,
    phone      TEXT,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE applications (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id         INTEGER NOT NULL REFERENCES jobs(id),
    candidate_id   INTEGER NOT NULL REFERENCES candidates(id),
    status         TEXT NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new', 'screening', 'interview', 'offer', 'hired', 'rejected')),
    rating         INTEGER CHECK (rating BETWEEN 1 AND 5),
    cover_letter   TEXT NOT NULL CHECK (length(cover_letter) <= 5000),
    privacy_ack_at TEXT NOT NULL,
    status_token   TEXT NOT NULL UNIQUE,
    revealed_at    TEXT,
    delete_after   TEXT,
    created_at     TEXT NOT NULL DEFAULT ${NOW},
    updated_at     TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE attachments (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    original_name  TEXT NOT NULL,
    stored_name    TEXT NOT NULL UNIQUE,
    mime_type      TEXT NOT NULL,
    size_bytes     INTEGER NOT NULL CHECK (size_bytes <= 5242880),
    uploaded_at    TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE notes (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    user_id        INTEGER NOT NULL REFERENCES users(id),
    body           TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
    created_at     TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE status_history (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_status    TEXT,
    to_status      TEXT NOT NULL,
    user_id        INTEGER REFERENCES users(id),
    changed_at     TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE INDEX idx_jobs_status           ON jobs(status);
  CREATE INDEX idx_applications_job      ON applications(job_id);
  CREATE INDEX idx_applications_status   ON applications(status);
  CREATE INDEX idx_applications_delete   ON applications(delete_after);
  CREATE INDEX idx_attachments_app       ON attachments(application_id);
  CREATE INDEX idx_notes_app             ON notes(application_id);
  CREATE INDEX idx_history_app           ON status_history(application_id);
`);

// 3. Startdaten: Stellen
const insert = db.prepare(`
  INSERT INTO jobs (title, department, location, employment_type, description, requirements, status)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
insert.run('Disponent:in Straßenverkehr (m/w/d)', 'Disposition', 'Hamburg', 'Vollzeit',
  'Du planst Touren für unsere Lkw-Flotte und bist Ansprechperson für Fahrer:innen.',
  'Ausbildung in Spedition oder Logistik, sicherer Umgang mit Tourenplanung.', 'published');
insert.run('Lagerlogistiker:in (m/w/d)', 'Lager', 'Bremen', 'Teilzeit',
  'Du nimmst Ware an, lagerst sie ein und stellst Sendungen zusammen.',
  'Erfahrung im Lager, Staplerschein von Vorteil.', 'published');
insert.run('Werkstudent:in IT-Support (m/w/d)', 'IT', 'Hamburg', 'Werkstudium',
  'Du hilfst Kolleg:innen bei Problemen mit Hardware und Software.',
  'Studium der Informatik oder ähnlich, 15–20 Stunden pro Woche.', 'published');
insert.run('Ausbildung Kaufmann/-frau für Spedition (m/w/d)', 'Disposition', 'Bremen', 'Ausbildung',
  'Drei Jahre Ausbildung in allen Bereichen der Spedition.',
  'Guter Schulabschluss, Interesse an Logistik.', 'published');
insert.run('Teamleitung Lager (m/w/d)', 'Lager', 'Hamburg', 'Vollzeit',
  'Du führst ein Team von zwölf Personen im Lager.',
  'Mehrjährige Erfahrung im Lager, erste Führungserfahrung.', 'draft');


// 4. Erster Admin aus der .env-Datei anlegen
db.prepare(`
  INSERT INTO users (name, email, password_hash, role)
  VALUES (?, ?, ?, 'admin')
`).run(ADMIN_NAME, ADMIN_EMAIL.toLowerCase(), await hashPassword(ADMIN_PASSWORD));

// 5. Kontrolle: welche Tabellen gibt es jetzt?
const tables = db.prepare(`
  SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name
`).all().map((row) => row.name);

console.log('Datenbank angelegt. Tabellen:', tables.join(', '));
console.log('Admin angelegt:', ADMIN_EMAIL.toLowerCase());