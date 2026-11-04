import express from 'express';
import { db } from './db.js';

const app = express();

const PER_PAGE = 10;

app.get('/api/jobs', (req, res) => {
  // 1. Filter aus der URL lesen
  const q = String(req.query.q ?? '').trim();
  const department = String(req.query.department ?? '');
  const location = String(req.query.location ?? '');
  const type = String(req.query.type ?? '');
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

  // 2. Bedingungen und Werte sammeln
  const conditions = ["status = 'published'"];
  const params = [];

  if (q) {
    conditions.push('(title LIKE ? OR department LIKE ? OR description LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (department) {
    conditions.push('department = ?');
    params.push(department);
  }
  if (location) {
    conditions.push('location = ?');
    params.push(location);
  }
  if (type) {
    conditions.push('employment_type = ?');
    params.push(type);
  }

  const where = 'WHERE ' + conditions.join(' AND ');

  // 3. Treffer zählen und Seiten berechnen
  const total = db.prepare(`SELECT COUNT(*) AS n FROM jobs ${where}`).get(...params).n;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const offset = (page - 1) * PER_PAGE;

  // 4. Nur die Stellen der aktuellen Seite holen
  const jobs = db.prepare(`
    SELECT id, title, department, location, employment_type, status, created_at
    FROM jobs
    ${where}
    ORDER BY created_at DESC, id DESC
    LIMIT ? OFFSET ?
  `).all(...params, PER_PAGE, offset);

  // 5. Auswahl für die Filterfelder (alle veröffentlichten, ungefiltert)
  const departments = db.prepare(`
    SELECT DISTINCT department FROM jobs
    WHERE status = 'published'
    ORDER BY department
  `).all().map((row) => row.department);

  const locations = db.prepare(`
    SELECT DISTINCT location FROM jobs
    WHERE status = 'published'
    ORDER BY location
  `).all().map((row) => row.location);

  res.json({
    jobs: jobs,
    pagination: { page: page, pages: pages, total: total },
    options: { departments: departments, locations: locations },
  });
});



// Detailroute

app.get('/api/jobs/:id', (req, res) => {
  const job = db.prepare(`
    SELECT id, title, department, location, employment_type,
           description, requirements, status, created_at, updated_at
    FROM jobs
    WHERE id = ? AND status = 'published'
  `).get(req.params.id);

  if (!job) {
    return res.status(404).json({ error: 'Diese Stelle gibt es nicht oder sie ist nicht mehr ausgeschrieben.' });
  }

  res.json({ job: job });
});


// Startseiten route 
app.get('/api/home', (req, res) => {
  const jobs = db.prepare(`
    SELECT id, title, department, location, employment_type, status, created_at
    FROM jobs
    WHERE status = 'published'
    ORDER BY created_at DESC, id DESC
    LIMIT 3
  `).all();

  const openCount = db.prepare(`
    SELECT COUNT(*) AS n
    FROM jobs
    WHERE status = 'published'
  `).get().n;

  const departments = db.prepare(`
    SELECT department, COUNT(*) AS n
    FROM jobs
    WHERE status = 'published'
    GROUP BY department
    ORDER BY department
  `).all();

  res.json({ jobs: jobs, openCount: openCount, departments: departments });
});





app.listen(3000, () => {
  console.log('Server läuft auf http://localhost:3000');
});