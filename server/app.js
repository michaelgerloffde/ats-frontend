import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import publicRoutes from './routes/public.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';

// Express-App erstellen (gestartet wird sie in index.js)
export const app = express();


// Sicherheits-Header für alle Antworten (E7); entfernt auch "X-Powered-By: Express"
app.use(helmet());

// Middleware: JSON-Daten aus Anfragen nach req.body lesen
app.use(express.json());

// Öffentliche Routen unter /api einhängen
app.use('/api', publicRoutes);
// Anmelden, Abmelden, Sitzung abfragen
app.use('/api', authRoutes);

// Verwaltungsbereich: nur mit Login
app.use('/api/admin', adminRoutes);

// Unbekannte API-Adressen: 404 als JSON statt der HTML-Standardseite von Express
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Diese Adresse gibt es nicht.' });
});

// Im Betrieb liefert der Server auch das fertige Frontend aus (Vite-Build im Ordner dist)
if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(import.meta.dirname, '..', 'dist');
  app.use(express.static(distDir));

  // Alle übrigen Adressen (z. B. /admin/applications/3) -> index.html, React-Router übernimmt
  app.get('/{*pfad}', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Fehlerbehandlung: Middleware mit 4 Parametern, läuft nur nach einem Fehler.
// Muss nach den Routen stehen, damit sie deren Fehler auffängt.
app.use((err, req, res, next) => {
  // Upload-Fehler (z. B. Datei zu groß) → verständliche 422 am Feld "cv"
  if (err instanceof multer.MulterError) {
    const text = err.code === 'LIMIT_FILE_SIZE'
      ? 'Die Datei ist zu groß (höchstens 5 MB).'
      : 'Beim Hochladen ist etwas schiefgegangen.';
    return res.status(422).json({ errors: { cv: text } });
  }

  // Alle anderen Fehler: Details nur ins Server-Log, Browser bekommt allgemeine Meldung (E6)
  console.error(err);
  res.status(500).json({ error: 'Es ist ein Fehler aufgetreten. Bitte versuche es später noch einmal.' });
});