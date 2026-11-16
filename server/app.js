import express from 'express';
import multer from 'multer';
import publicRoutes from './routes/public.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';

// Express-App erstellen (gestartet wird sie in index.js)
export const app = express();

// Middleware: JSON-Daten aus Anfragen nach req.body lesen
app.use(express.json());

// Öffentliche Routen unter /api einhängen
app.use('/api', publicRoutes);
// Anmelden, Abmelden, Sitzung abfragen
app.use('/api', authRoutes);

// Verwaltungsbereich: nur mit Login
app.use('/api/admin', adminRoutes);

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