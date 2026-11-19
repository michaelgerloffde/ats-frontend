# Abnahme-Checkliste

Statt eines Abnahmetests mit Auftraggeber (es gibt keinen echten): Prüfung des MVP gegen die Anforderungen aus der Aufgabenstellung und die Use Cases aus dem Konzept (E1).
Geprüft im Betriebsmodus (`npm run build`, dann `npm start` im Ordner `server`, Browser auf `http://localhost:3000`).

Datum der Prüfung: ____________

Legende: `[x]` erfüllt · `[ ]` offen · Bemerkung bei Abweichungen

## 1. Bewerber (ohne Konto)

| | Anforderung | Use Case | Prüfung | Bemerkung |
|---|---|---|---|---|
| [ ] | Karrierestartseite | – | Startseite öffnen: neueste Stellen und Bereiche sichtbar | |
| [ ] | Stellen finden (Liste, Suche, Filter) | UC-B1 (Must) | Stellenliste: Suchbegriff eingeben, Filter setzen, Seiten wechseln | |
| [ ] | Stellendetails ansehen | UC-B2 (Must) | eine Stelle öffnen: Aufgaben und Anforderungen sichtbar | |
| [ ] | Bewerbungsformular mit PDF-Upload | UC-B3 (Must) | Bewerbung mit PDF absenden; Bestätigung mit Status-Link | |
| [ ] | Fehlerhafte Eingaben werden abgelehnt | UC-B3 | ohne Pflichtfelder / mit Nicht-PDF absenden: Fehler am Feld | |
| [ ] | Status über Link ansehen | UC-B4 (Should) | Status-Link öffnen: Stand und Verlauf ohne Recruiter-Namen; „Link kopieren“ funktioniert | |
| [ ] | Bewerbung zurückziehen | UC-B5 (Should) | Zurückziehen bestätigen; Link danach „nicht gefunden“; Bewerbung im Admin-Bereich weg | |

## 2. Recruiter

| | Anforderung | Use Case | Prüfung | Bemerkung |
|---|---|---|---|---|
| [ ] | Anmelden und abmelden | UC-R1 (Must) | als Recruiter anmelden, abmelden; danach kein Zugriff auf `/admin` | |
| [ ] | Stellen anlegen und verwalten | UC-R2 (Must) | Stelle als Entwurf anlegen, bearbeiten, veröffentlichen (öffentlich sichtbar), schließen (nicht mehr sichtbar) | |
| [ ] | Bewerbungen sichten | UC-R3 (Must) | Bewerbungsliste öffnen, nach Stelle und Status filtern, Bewerbung öffnen, Lebenslauf öffnen | |
| [ ] | Neue Bewerbungen zuerst anonym | UC-R3 (Should) | neue Bewerbung: nur „Bewerbung #…“, kein Name, keine Kontaktdaten | |
| [ ] | Aufdecken nur mit Bestätigung | UC-R3 | Wechsel ins Gespräch: Rückfrage; nach Bestätigung Name sichtbar, Wechsel zurück deckt nicht wieder ab | |
| [ ] | Bewerbungen bewerten (1–5) | UC-R4 (Must) | Bewertung setzen; in der Pipeline nach Bewertung sortiert | |
| [ ] | In der Pipeline verschieben | UC-R5 (Must) | Status ändern in Detailansicht und Pipeline; Verlauf zeigt Person und Zeit | |
| [ ] | Notizen dokumentieren | UC-R6 (Must) | Notiz schreiben; innerhalb von 15 Minuten bearbeiten | |

## 3. Admin

| | Anforderung | Use Case | Prüfung | Bemerkung |
|---|---|---|---|---|
| [ ] | Zugänge anlegen und sperren | UC-A1 (Should) | Recruiter anlegen, sich damit anmelden; sperren, Anmeldung scheitert | |
| [ ] | Stellen und Bewerbungen löschen | UC-A2 (Should) | Bewerbung löschen; Stelle ohne Bewerbungen löschen; Stelle mit Bewerbungen wird abgelehnt | |
| [ ] | Löschen nur für Admin | UC-A2 | als Recruiter: kein Löschen möglich | |

## 4. Recht und Compliance

| | Anforderung | Prüfung | Bemerkung |
|---|---|---|---|
| [ ] | Einwilligung / Datenschutzhinweise | Formular ohne Häkchen absenden: abgelehnt; mit Häkchen: Zeitpunkt in der Detailansicht | |
| [ ] | Löschkonzept | Bewerbung auf „Abgesagt“: Löschdatum in 6 Monaten sichtbar (Detail und Status-Link) | |
| [ ] | Automatische Löschung | Test S05 grün (`npm test`) | |
| [ ] | Antidiskriminierung (AGG) | anonyme Sichtung (siehe 2.); Formular fragt nicht nach Geburtsdatum, Foto, Geschlecht | |
| [ ] | Datenminimierung | kein Konto für Bewerber; Status-Seite zeigt keine Personendaten | |

## 5. Qualität

| | Anforderung | Prüfung | Bemerkung |
|---|---|---|---|
| [ ] | Funktionstests | `npm test`: 29 von 29 grün | |
| [ ] | Last-/Performancetest | `npm run load-test`: bestanden (T10) | |
| [ ] | Sicherheit | Tests T07, T08, S06–S08, T09 grün | |
| [ ] | Usability | Usability-Test mit 3 Personen durchgeführt (Etappe 5) | |
| [ ] | Reproduzierbarkeit | Einrichtung nach README auf frischem Stand durchgespielt | |
| [ ] | Keine echten Daten | nur synthetische Daten, fiktives Unternehmen | |

## Ergebnis

Erfüllt: ___ von ___ · Offene Punkte und Abweichungen:

-