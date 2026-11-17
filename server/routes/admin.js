import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin, requireLogin } from '../lib/session.js';
import { validateJob } from '../lib/validation.js';
import { STAGES } from '../lib/stages.js';

const router = Router();

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

export default router;