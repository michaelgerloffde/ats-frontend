# Bewerbermanagementportal (ATS) – MVP

Studienprojekt zum Kurs DLBITPEWP01-01 „Projekt: Einstieg in die Web-Programmierung“ (IU Internationale Hochschule).
Fiktives Unternehmen „Kranich Logistik“, ausschließlich synthetische Daten.

Bewerber finden Stellen und bewerben sich ohne Konto mit PDF-Lebenslauf. Über einen persönlichen Status-Link sehen sie den Stand und können ihre Bewerbung jederzeit zurückziehen. Recruiter sichten Bewerbungen zunächst anonym, bewerten sie, schreiben Notizen und verschieben sie entlang einer Pipeline. Ein Admin verwaltet zusätzlich Zugänge und darf löschen.

**Technik:** React + Vite + Tailwind CSS (Frontend) · Node.js + Express 5 (Backend) · SQLite über das eingebaute Modul `node:sqlite`

---

## Voraussetzungen

- **Node.js ≥ 22.13** (prüfen mit `node -v`). `node:sqlite` ist ab dieser Version ohne Zusatzschalter verfügbar.
- npm (kommt mit Node.js)

Es werden keine weiteren Programme benötigt, auch kein separater Datenbankserver.

## Einrichtung (einmalig)

```bash
npm install
cd server
npm install
cp .env.example .env
```

In `server/.env` den ersten Admin-Zugang eintragen (Passwort mindestens 15 Zeichen):

```
ADMIN_NAME=Alex Admin
ADMIN_EMAIL=admin@kranich.test
ADMIN_PASSWORD=ein-langes-eigenes-passwort
```

Dann die Datenbank anlegen (im Ordner `server`):

```bash
npm run init-db
```

Das legt `server/data/ats.db` mit allen Tabellen, dem Admin-Zugang und fünf Beispielstellen an.
**Achtung:** `npm run init-db` löscht eine vorhandene Datenbank vollständig und beginnt neu.

## Starten

### Betrieb (ein Prozess)

```bash
npm run build      # im Hauptordner: baut das Frontend nach dist/
cd server
npm start          # Express liefert API und Frontend aus
```

Dann im Browser: <http://localhost:3000>

`npm start` setzt `NODE_ENV=production`. Damit liefert Express das gebaute Frontend aus `dist/` aus, und das Sitzungs-Cookie bekommt das Merkmal `Secure`. Chrome erlaubt das auf `localhost`. Auf einem echten Server ist HTTPS nötig (siehe „Grenzen“).
`npm run build` ist nur nach Änderungen am Frontend erneut nötig.

### Entwicklung (zwei Terminals, Änderungen sofort sichtbar)

```bash
# Terminal 1, im Ordner server
npm run dev        # Express auf Port 3000, startet bei Dateiänderungen neu

# Terminal 2, im Hauptordner
npm run dev        # Vite auf Port 5173 (oder nächster freier Port)
```

Dann die Adresse öffnen, die Vite anzeigt. Vite leitet alle Anfragen an `/api` an Port 3000 weiter, für den Browser ist es dieselbe Adresse (kein CORS nötig).

### Anmelden

Mit dem Admin-Zugang aus `server/.env` über den Login für den Recruiting-Bereich. Weitere Zugänge (Recruiter oder Admin) legt der Admin in der Nutzerverwaltung an.

## Tests

```bash
cd server
npm test           # 29 automatische Tests (node:test)
```

Die Tests laufen mit einer Datenbank im Arbeitsspeicher und einem eigenen Temp-Ordner für PDFs. Die echte Datenbank bleibt unberührt.

| Datei | Prüft |
|---|---|
| `test/apply.test.js` | Bewerbung absenden, Grenzwert Anschreiben (5.000/5.001 Zeichen), umbenannte Nicht-PDF |
| `test/status.test.js` | Status-Link, unbekannter Token, Zurückziehen mit Löschung von Daten und PDF |
| `test/auth.test.js` | Login, gleiche Fehlermeldung für falsche E-Mail und falsches Passwort, Logout, Sperre nach 5 Fehlversuchen |
| `test/admin.test.js` | Anonymität, erlaubte und verbotene Statuswechsel, Löschdatum, Rechte von Recruiter und Admin, Notizen, Nutzerverwaltung |
| `test/security.test.js` | Löschlauf, Sicherheits-Header, Rate-Limit, CSRF-Schutz, SQL-Injection |

Gemeinsames Test-Setup: `test/helpers.js`.

**Lasttest** (50 gleichzeitige Anfragen, jede Antwort unter 200 ms). Er braucht einen laufenden Server:

```bash
cd server
npm start                  # Terminal 1
npm run load-test          # Terminal 2
```

## Funktionen

**Bewerber (ohne Konto)**
- Karrierestartseite, Stellenliste mit Suche und Filtern, Stellendetail
- Bewerbungsformular mit PDF-Lebenslauf (höchstens 5 MB; geprüft wird der Dateiinhalt, nicht nur die Endung)
- Persönlicher Status-Link mit „Link kopieren“: Stand und Verlauf ohne Recruiter-Namen
- Zurückziehen: Daten und PDF werden sofort gelöscht

**Recruiter**
- Dashboard mit Kennzahlen und anstehenden Löschungen
- Stellen anlegen und eigene Stellen bearbeiten, veröffentlichen, schließen
- Bewerbungsliste mit Filter, Suche und Seitenaufteilung
- Anonyme Sichtung: Name und Kontaktdaten liefert der Server erst, wenn die Bewerbung ins Gespräch wechselt. Vorher wird um Bestätigung gebeten, das Aufdecken ist endgültig.
- Bewertung 1–5, Notizen (vom Verfasser 15 Minuten lang änderbar), Statusverlauf mit Person und Zeit
- Pipeline je Stelle

**Admin** zusätzlich: Zugänge anlegen und sperren, Stellen (ohne Bewerbungen) und Bewerbungen löschen.

## Datenschutz und Sicherheit (Auswahl)

- **Datenminimierung:** kein Konto für Bewerber; das Formular bittet um einen Lebenslauf ohne Foto, Geburtsdatum und Adresse
- **Löschkonzept:** 6 Monate nach Abschluss (eingestellt oder abgesagt) setzt der Server ein Löschdatum. Ein Löschlauf im Server entfernt fällige Bewerbungen samt PDF beim Start und danach alle 24 Stunden. Ins Log kommt nur die Anzahl.
- **Passwörter:** scrypt mit zufälligem Salt, Mindestlänge 15 Zeichen
- **Sitzungen:** zufälliger Token im Cookie (`HttpOnly`, `SameSite=Strict`, im Betrieb `Secure`); in der Datenbank steht nur der SHA-256-Hash. Abmeldung nach 30 Minuten ohne Aktivität, spätestens nach 8 Stunden.
- **Login-Sperre:** nach 5 Fehlversuchen 15 Minuten; gleiche Meldung für unbekannte E-Mail und falsches Passwort
- **Rechte:** im Server geprüft (401 ohne Login, 403 ohne Berechtigung)
- **CSRF:** ändernde Anfragen im Admin-Bereich brauchen den Header `X-CSRF-Token`
- **Rate-Limits:** Bewerbung 10 pro Stunde, Status-Seite 30 pro Minute je IP-Adresse
- **SQL-Injection:** ausschließlich Prepared Statements
- **Sicherheits-Header:** Helmet (u. a. Content-Security-Policy, `nosniff`)
- **Uploads:** zufälliger Dateiname, außerhalb des Web-Verzeichnisses gespeichert, Download nur mit Login und neutralem Dateinamen

## Projektstruktur

```
ats-frontend/
├── src/                     Frontend (React)
│   ├── api/                 index.js (eine Funktion je Endpunkt), http.js, ApiError.js
│   ├── components/          Layout und UI-Bausteine
│   ├── context/             Sitzung, Meldungen
│   ├── hooks/, lib/         Datenladen, Konstanten, Hilfsfunktionen
│   └── pages/               öffentliche Seiten; pages/admin/ für den Recruiting-Bereich
├── server/                  Backend (Express)
│   ├── index.js             Start: Port 3000, Löschlauf
│   ├── app.js               Middleware, Routen, Fehlerbehandlung, Auslieferung von dist/
│   ├── db.js                SQLite-Verbindung
│   ├── routes/              public.js, auth.js, admin.js
│   ├── lib/                 Sitzungen, Passwörter, Login-Sperre, Prüfregeln, Löschen, Rate-Limit …
│   ├── scripts/             init-db.js, load-test.js
│   ├── test/                automatische Tests
│   ├── data/                Datenbank und hochgeladene PDFs (nicht im Repository)
│   └── .env.example         Vorlage für die Konfiguration
├── API.md                   Beschreibung aller Endpunkte
└── vite.config.js
```

## Grenzen des MVP und Ausbaustufen

- **E-Mail-Benachrichtigung** (Bestätigung mit Status-Link, Statusänderungen): erste Ausbaustufe. Bis dahin muss der Bewerber den Link selbst speichern.
- **Passwort ändern oder zurücksetzen** und ein vom Server erzeugtes Startpasswort fehlen noch.
- **Betrieb im Internet:** HTTPS über einen vorgeschalteten Webserver, dann in Express `trust proxy` setzen, damit das Rate-Limit die echte IP-Adresse sieht.
- **Rate-Limit-Zähler** liegen im Arbeitsspeicher; ein Neustart setzt sie zurück.
- **Löschlauf** läuft nur, solange der Server läuft; Überfälliges wird beim nächsten Start nachgeholt.
- **Virenscan** für Uploads (z. B. ClamAV) ist nicht eingebaut; PDFs werden nur vom Recruiter geöffnet und nie vom Server ausgeführt.
- **Anonymität des Lebenslaufs** ist eine Bitte im Formular, keine technische Prüfung.
- **Datenbank:** SQLite reicht für einen kleinen Betrieb. Bei vielen gleichzeitigen Schreibzugriffen wäre PostgreSQL der nächste Schritt.

## Einsatz von KI

- **Frontend:** Das React-Frontend wurde mit KI erzeugt (mit dem Betreuer abgestimmt) und lag zunächst mit Beispieldaten im Browser vor. Ich habe es schrittweise an mein Backend angeschlossen und an die Konzeptentscheidungen angepasst.
- **Konzept:** Bei den Konzeptentscheidungen hat die KI (Claude, Anthropic) Optionen erklärt und Fragen gestellt; die Entscheidungen habe ich getroffen.
- **Backend und Tests:** schrittweise mit Claude als Tutor erarbeitet. Die KI hat Code-Vorschläge mit Erklärungen geliefert; ich habe sie eingefügt, getestet, Fehler gefunden und mit Unterstützung behoben.
- Eine ausführliche Reflexion steht im Projektbericht.