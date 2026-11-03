# Bewerberportal – Frontend

React 18 · Vite 6 · Tailwind CSS 4 · React Router 6

Das Frontend ist komplett fertig und läuft **ohne Backend**: Alle Daten kommen vorerst aus einem Mock
(`src/api/mock.js`), der im Browser einen Server nachspielt. Das Backend baust Du selbst und stellst
dann Funktion für Funktion vom Mock auf Deinen Server um.

## Starten

```bash
npm install
npm run dev
```

Dann <http://localhost:5173> öffnen. Demo-Zugänge für den Recruiting-Bereich:

- admin@kranich.test · `Admin!Demo2026`
- recruiter@kranich.test · `Recruiter!Demo2026`

Alles, was Du anlegst oder änderst, speichert der Mock im localStorage Deines Browsers.
„Demo-Daten zurücksetzen“ unten rechts stellt den Ausgangszustand wieder her.

## Aufbau

```
src/
├── main.jsx              Einstieg: Router, Toasts, Session
├── App.jsx               alle Routen (welche URL zeigt welche Seite)
├── index.css             Tailwind + eigene Farben (brand, accent)
├── api/
│   ├── index.js          ← HIER stellst Du von Mock auf Backend um (eine Funktion pro Endpunkt)
│   ├── http.js           fetch-Helfer für Dein echtes Backend
│   ├── ApiError.js       einheitlicher Fehlertyp (status + data)
│   ├── mock.js           Fake-Backend im Browser (fliegt am Ende raus)
│   └── mockSeed.js       Demodaten
├── context/
│   ├── SessionContext.jsx  wer ist eingeloggt?
│   └── ToastContext.jsx    kurze Meldungen
├── hooks/useAsync.js     Daten laden: data, error, loading, reload
├── lib/                  Konstanten (Pipeline-Stufen …), Datumsformat
├── components/           Layout, UI-Bausteine (Button, Field, Table, Badge …)
└── pages/                öffentliche Seiten, pages/admin/ für den Recruiting-Bereich
```

## Vom Mock zum echten Backend

1. Dein Express-Server läuft auf Port 3000 und kann z. B. `GET /api/jobs`.
2. In `src/api/index.js` bei `getJobs` die Mock-Zeile auskommentieren und die `request(...)`-Zeile einkommentieren.
3. Seite neu laden – die Stellenliste kommt jetzt aus Deiner Datenbank. Im Browser unter DevTools → Netzwerk siehst Du die Anfrage.

Welche Antwort jeder Endpunkt liefern muss, steht in **[API.md](./API.md)**.
