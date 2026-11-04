import express from 'express';
import { db } from './db.js';

const app = express();


app.get('/api/jobs', (req, res) => {
  const jobs = db.prepare(`
    SELECT id, title, department, location, employment_type, status, created_at
    FROM jobs
    WHERE status = 'published'
    ORDER BY created_at DESC, id DESC
  `).all();

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
    pagination: { page: 1, pages: 1, total: jobs.length },
    options: { departments: departments, locations: locations },
  });
});
















app.listen(3000, () => {
  console.log('Server läuft auf http://localhost:3000');
});