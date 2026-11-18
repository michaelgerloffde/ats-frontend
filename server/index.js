import { app } from './app.js';
import { startPurgeSchedule } from './lib/purge.js';

const PORT = 3000;

app.listen(PORT, (err) => {
  // Express 5 übergibt Startfehler hier, z. B. "Port schon belegt"
  if (err) {
    console.error(`Server konnte nicht starten: ${err.message}`);
    process.exit(1);
  }

  console.log(`Server läuft auf http://localhost:${PORT}`);

  // Automatischer Löschlauf: beim Start und alle 24 Stunden
  startPurgeSchedule();
});