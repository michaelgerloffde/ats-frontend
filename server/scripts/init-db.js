import { db } from '../db.js';

// Tabelle neu anlegen (alte wird gelöscht)
db.exec(`
  DROP TABLE IF EXISTS jobs;

  CREATE TABLE jobs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL,
    department      TEXT NOT NULL,
    location        TEXT NOT NULL,
    employment_type TEXT NOT NULL CHECK (employment_type IN ('Vollzeit', 'Teilzeit', 'Werkstudium', 'Ausbildung')),
    description     TEXT NOT NULL,
    requirements    TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`);

// Startdaten einfügen
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

console.log('Datenbank angelegt.');