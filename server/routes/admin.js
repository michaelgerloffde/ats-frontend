import { Router } from 'express';
import { db } from '../db.js';
import { requireLogin } from '../lib/session.js';
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

export default router;