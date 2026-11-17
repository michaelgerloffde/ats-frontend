import path from 'node:path';
import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin, requireLogin } from '../lib/session.js';
import { validateJob } from '../lib/validation.js';
import { STAGES } from '../lib/stages.js';

const router = Router();


// Gleicher Ordner wie beim Hochladen (routes/public.js)
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join('data', 'uploads');
const PER_PAGE = 10;

// Bewerbung für die Verwaltung aufbereiten: Name und Kontaktdaten erst nach dem Aufdecken (E4)
function presentApplication(row) {
  const base = {
    id: row.id,
    job_id: row.job_id,
    job_title: row.job_title,
    status: row.status,
    rating: row.rating,
    cover_letter: row.cover_letter,
    privacy_ack_at: row.privacy_ack_at,
    delete_after: row.delete_after,
    created_at: row.created_at,
  };
  if (!row.revealed_at) {
    return { ...base, anonymized: true, display_name: `Bewerbung #${String(row.id).padStart(4, '0')}` };
  }
  return {
    ...base,
    anonymized: false,
    display_name: `${row.first_name} ${row.last_name}`,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
  };
}

// Gemeinsamer Teil der Abfragen: Bewerbung mit Stelle und Bewerber
const APPLICATION_SELECT = `
  SELECT a.*, j.title AS job_title, c.first_name, c.last_name, c.email, c.phone
  FROM applications a
  JOIN jobs j ON j.id = a.job_id
  JOIN candidates c ON c.id = a.candidate_id
`;

// Alle Routen in dieser Datei nur mit Login (E3)
router.use(requireLogin);

// Dashboard: Kennzahlen, Anzahl je Stufe, die 5 neuesten Bewerbungen
router.get('/dashboard', (req, res) => {
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const stats = {
    published: db.prepare(`SELECT COUNT(*) AS n FROM jobs WHERE status = 'published'`).get().n,
    openApplications: db.prepare(`
      SELECT COUNT(*) AS n FROM applications WHERE status NOT IN ('hired', 'rejected')
    `).get().n,
    deletionsNext30Days: db.prepare(`
      SELECT COUNT(*) AS n FROM applications WHERE delete_after IS NOT NULL AND delete_after <= ?
    `).get(in30Days).n,
  };

  // Anzahl je Stufe; Stufen ohne Bewerbung erscheinen mit 0
  const rows = db.prepare('SELECT status, COUNT(*) AS n FROM applications GROUP BY status').all();
  const counts = STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    n: rows.find((row) => row.status === stage.key)?.n ?? 0,
  }));

  // Neueste Bewerbungen: Name nur, wenn die Daten schon aufgedeckt wurden (E4)
  const recent = db.prepare(`
    SELECT a.id, a.status, a.created_at, a.revealed_at, j.title AS job_title,
           c.first_name, c.last_name
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN candidates c ON c.id = a.candidate_id
    ORDER BY a.created_at DESC
    LIMIT 5
  `).all().map((row) => ({
    id: row.id,
    job_title: row.job_title,
    status: row.status,
    created_at: row.created_at,
    display_name: row.revealed_at
      ? `${row.first_name} ${row.last_name}`
      : `Bewerbung #${String(row.id).padStart(4, '0')}`,
  }));

  res.json({ stats, counts, recent });
});


// ---------- Stellen (E3: anlegen alle, bearbeiten nur Ersteller oder Admin, löschen nur Admin) ----------

// Stellenliste mit Anzahl der Bewerbungen; optional nach Status gefiltert
router.get('/jobs', (req, res) => {
  const status = ['draft', 'published', 'closed'].includes(req.query.status) ? req.query.status : null;

  const jobs = db.prepare(`
    SELECT j.*,
           COUNT(a.id) AS app_count,
           SUM(CASE WHEN a.status = 'new' THEN 1 ELSE 0 END) AS new_count
    FROM jobs j
    LEFT JOIN applications a ON a.job_id = j.id
    WHERE ? IS NULL OR j.status = ?
    GROUP BY j.id
    ORDER BY (j.status = 'published') DESC, j.updated_at DESC
  `).all(status, status).map((job) => ({ ...job, new_count: job.new_count ?? 0 }));

  res.json({ jobs });
});

// Eine Stelle zum Bearbeiten laden
router.get('/jobs/:id', (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Stelle nicht gefunden.' });
  }
  res.json({ job });
});

// Neue Stelle anlegen; der Ersteller kommt aus dem Login
router.post('/jobs', (req, res) => {
  const { errors, values } = validateJob(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ errors });
  }

  const result = db.prepare(`
    INSERT INTO jobs (title, department, location, employment_type, description, requirements, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(values.title, values.department, values.location, values.employment_type,
    values.description, values.requirements, values.status, req.user.id);

  res.status(201).json({ id: result.lastInsertRowid });
});

// Stelle bearbeiten oder schließen: nur der Ersteller oder ein Admin
router.put('/jobs/:id', (req, res) => {
  const job = db.prepare('SELECT id, created_by FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Stelle nicht gefunden.' });
  }
  if (req.user.role !== 'admin' && job.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Diese Stelle darf nur bearbeiten, wer sie angelegt hat, oder ein Admin.' });
  }

  const { errors, values } = validateJob(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ errors });
  }

  db.prepare(`
    UPDATE jobs
    SET title = ?, department = ?, location = ?, employment_type = ?, description = ?, requirements = ?,
        status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ?
  `).run(values.title, values.department, values.location, values.employment_type,
    values.description, values.requirements, values.status, job.id);

  res.json({ ok: true });
});

// Stelle löschen: nur Admin und nur ohne Bewerbungen
router.delete('/jobs/:id', requireAdmin, (req, res) => {
  const job = db.prepare('SELECT id FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Stelle nicht gefunden.' });
  }

  const { n } = db.prepare('SELECT COUNT(*) AS n FROM applications WHERE job_id = ?').get(job.id);
  if (n > 0) {
    return res.status(409).json({ error: `Diese Stelle hat noch ${n} Bewerbung(en). Bitte setze sie stattdessen auf „Geschlossen“.` });
  }

  db.prepare('DELETE FROM jobs WHERE id = ?').run(job.id);
  res.json({ ok: true });
});


// ---------- Bewerbungen (E3: alle Recruiter sehen alle; E4: anonym bis zum Aufdecken) ----------

// Bewerbungsliste mit Filtern nach Stelle, Status und Suche; 10 pro Seite
router.get('/applications', (req, res) => {
  const conditions = [];
  const params = [];

  if (req.query.job) {
    conditions.push('a.job_id = ?');
    params.push(Number(req.query.job));
  }
  if (STAGES.some((stage) => stage.key === req.query.status)) {
    conditions.push('a.status = ?');
    params.push(req.query.status);
  }

  // Suche: Nummer bei allen Bewerbungen, Name/E-Mail nur bei aufgedeckten (sonst wäre die Anonymität umgangen)
  const q = String(req.query.q ?? '').trim();
  if (/^#?\d+$/.test(q)) {
    conditions.push('a.id = ?');
    params.push(Number(q.replace('#', '')));
  } else if (q) {
    conditions.push(`a.revealed_at IS NOT NULL
      AND (c.first_name || ' ' || c.last_name || ' ' || c.email) LIKE ?`);
    params.push(`%${q}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { total } = db.prepare(`
    SELECT COUNT(*) AS total
    FROM applications a JOIN candidates c ON c.id = a.candidate_id
    ${where}
  `).get(...params);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(Math.max(1, Number(req.query.page) || 1), pages);

  const applications = db.prepare(`
    ${APPLICATION_SELECT}
    ${where}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, PER_PAGE, (page - 1) * PER_PAGE).map(presentApplication);

  const jobs = db.prepare('SELECT id, title FROM jobs ORDER BY title').all();

  res.json({ applications, pagination: { page, pages, total }, jobs });
});

// Eine Bewerbung mit Anhängen, Notizen und Verlauf
router.get('/applications/:id', (req, res) => {
  const row = db.prepare(`${APPLICATION_SELECT} WHERE a.id = ?`).get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Diese Bewerbung existiert nicht (mehr).' });
  }

  const attachments = db.prepare(`
    SELECT id, size_bytes AS size FROM attachments WHERE application_id = ?
  `).all(row.id);

  const notes = db.prepare(`
    SELECT n.id, n.body, n.created_at, n.user_id, u.name AS author
    FROM notes n LEFT JOIN users u ON u.id = n.user_id
    WHERE n.application_id = ?
    ORDER BY n.created_at DESC
  `).all(row.id).map((note) => ({ ...note, editable: canEditNote(note, req.user) }));

  const history = db.prepare(`
    SELECT h.from_status, h.to_status, h.changed_at, u.name AS author
    FROM status_history h LEFT JOIN users u ON u.id = h.user_id
    WHERE h.application_id = ?
    ORDER BY h.changed_at, h.id
  `).all(row.id);

  res.json({ application: presentApplication(row), attachments, notes, history });
});

// Lebenslauf herunterladen: nur mit Login, immer als Download, neutraler Dateiname
router.get('/attachments/:id', (req, res) => {
  const file = db.prepare(`
    SELECT stored_name, application_id FROM attachments WHERE id = ?
  `).get(req.params.id);
  if (!file) {
    return res.status(404).json({ error: 'Datei nicht gefunden.' });
  }

  const downloadName = `Bewerbung-${String(file.application_id).padStart(4, '0')}-Lebenslauf.pdf`;
  res.download(path.resolve(UPLOAD_DIR, file.stored_name), downloadName);
});

// ---------- Statuswechsel und Bewertung (E4) ----------

const REVEAL_STAGES = ['interview', 'offer', 'hired'];   // ab hier sind Name und Kontaktdaten nötig
const FINAL_STAGES = ['hired', 'rejected'];              // Abschluss: Löschfrist beginnt
const RETENTION_MONTHS = 6;                              // E5: Löschung 6 Monate nach Abschluss

// Status ändern: Regeln aus E4, Verlauf, Aufdecken, Löschfrist
router.post('/applications/:id/status', (req, res) => {
  const app = db.prepare('SELECT id, status, revealed_at FROM applications WHERE id = ?').get(req.params.id);
  if (!app) {
    return res.status(404).json({ error: 'Diese Bewerbung existiert nicht (mehr).' });
  }

  const to = req.body?.status;
  if (!STAGES.some((stage) => stage.key === to)) {
    return res.status(422).json({ error: 'Unbekannter Status.' });
  }
  if (to === app.status) {
    return res.json({ ok: true });
  }

  // Regel 3: zurück auf "neu" ist gesperrt
  if (to === 'new') {
    return res.status(422).json({ error: 'Zurück auf „Eingegangen“ ist nicht möglich: Die Bewerbung wurde bereits gesichtet.' });
  }

  // Regel 6: erster Wechsel ins Gespräch oder später -> Aufdecken nur mit Bestätigung
  const mustReveal = REVEAL_STAGES.includes(to) && !app.revealed_at;
  if (mustReveal && req.body?.confirmReveal !== true) {
    return res.status(409).json({
      error: 'Dieser Schritt deckt Name und Kontaktdaten auf. Bitte bestätigen.',
      needsReveal: true,
    });
  }

  // Löschfrist: bei Abschluss heute + 6 Monate, beim Wiederöffnen entfernen (E4/E5)
  let deleteAfter = null;
  if (FINAL_STAGES.includes(to)) {
    const date = new Date();
    date.setMonth(date.getMonth() + RETENTION_MONTHS);
    deleteAfter = date.toISOString();
  }

  db.exec('BEGIN');
  try {
    db.prepare(`
      UPDATE applications
      SET status = ?,
          delete_after = ?,
          revealed_at = CASE WHEN ? THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now') ELSE revealed_at END,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?
    `).run(to, deleteAfter, mustReveal ? 1 : 0, app.id);

    // Regel 7: jeder Wechsel kommt in den Verlauf (von, nach, wer, wann)
    db.prepare(`
      INSERT INTO status_history (application_id, from_status, to_status, user_id)
      VALUES (?, ?, ?, ?)
    `).run(app.id, app.status, to, req.user.id);

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  res.json({ ok: true });
});

// Bewertung 1 bis 5 speichern
router.post('/applications/:id/rating', (req, res) => {
  const rating = Number(req.body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(422).json({ error: 'Bitte eine Bewertung von 1 bis 5 wählen.' });
  }

  const result = db.prepare(`
    UPDATE applications SET rating = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?
  `).run(rating, req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Diese Bewerbung existiert nicht (mehr).' });
  }
  res.json({ ok: true });
});


// ---------- Pipeline (Board je Stelle, gleiche Anonymität wie Liste und Detail) ----------

router.get('/pipeline', (req, res) => {
  // Auswahl: alle Stellen außer Entwürfen (dort gibt es keine Bewerbungen)
  const jobs = db.prepare(`SELECT id, title FROM jobs WHERE status != 'draft' ORDER BY title`).all();

  // Gewählte Stelle; ohne Angabe die erste aus der Liste
  const requested = Number(req.query.job);
  const jobId = jobs.some((job) => job.id === requested) ? requested : (jobs[0]?.id ?? null);

  // Eine leere Spalte je Stufe, dann die Bewerbungen einsortieren (beste Bewertung oben)
  const columns = Object.fromEntries(STAGES.map((stage) => [stage.key, []]));
  const rows = db.prepare(`
    ${APPLICATION_SELECT}
    WHERE a.job_id = ?
    ORDER BY COALESCE(a.rating, 0) DESC, a.created_at
  `).all(jobId);

  for (const row of rows) {
    columns[row.status].push(presentApplication(row));
  }

  res.json({ jobs, jobId, columns });
});






// ---------- Notizen (E3: alle sehen alle; nur der Verfasser darf 15 Minuten lang korrigieren) ----------

const NOTE_EDIT_MS = 15 * 60 * 1000;
const NOTE_MAX = 2000;

// Darf dieser Nutzer diese Notiz noch bearbeiten?
function canEditNote(note, user) {
  return note.user_id === user.id && Date.now() - Date.parse(note.created_at) < NOTE_EDIT_MS;
}

// Notiztext prüfen: 1 bis 2.000 Zeichen
function readNoteBody(body) {
  const text = String(body ?? '').trim();
  return text.length >= 1 && text.length <= NOTE_MAX ? text : null;
}

// Neue Notiz; der Verfasser kommt aus dem Login
router.post('/applications/:id/notes', (req, res) => {
  const app = db.prepare('SELECT id FROM applications WHERE id = ?').get(req.params.id);
  if (!app) {
    return res.status(404).json({ error: 'Diese Bewerbung existiert nicht (mehr).' });
  }

  const text = readNoteBody(req.body?.body);
  if (!text) {
    return res.status(422).json({ error: `Die Notiz muss 1 bis ${NOTE_MAX} Zeichen lang sein.` });
  }

  db.prepare('INSERT INTO notes (application_id, user_id, body) VALUES (?, ?, ?)').run(app.id, req.user.id, text);
  res.status(201).json({ ok: true });
});

// Notiz korrigieren: nur der Verfasser, nur in den ersten 15 Minuten
router.put('/notes/:id', (req, res) => {
  const note = db.prepare('SELECT id, user_id, created_at FROM notes WHERE id = ?').get(req.params.id);
  if (!note) {
    return res.status(404).json({ error: 'Notiz nicht gefunden.' });
  }
  if (!canEditNote(note, req.user)) {
    return res.status(403).json({ error: 'Notizen kann nur der Verfasser in den ersten 15 Minuten ändern. Ergänzungen bitte als neue Notiz.' });
  }

  const text = readNoteBody(req.body?.body);
  if (!text) {
    return res.status(422).json({ error: `Die Notiz muss 1 bis ${NOTE_MAX} Zeichen lang sein.` });
  }

  db.prepare('UPDATE notes SET body = ? WHERE id = ?').run(text, note.id);
  res.json({ ok: true });
});




export default router;