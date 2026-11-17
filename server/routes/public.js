// Bausteine von Node: Zufallswerte, Dateien schreiben, Pfade bauen
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { Router } from "express";
import multer from "multer";
import { db } from "../db.js";
import { validateApplication, MAX_FILE_BYTES } from "../lib/validation.js";
import { deleteApplication, UPLOAD_DIR } from '../lib/applications.js';

const router = Router();


const PER_PAGE = 10;

// Upload-Einstellungen: Datei erst im Arbeitsspeicher halten, max. 5 MB, 1 Datei, 20 Felder
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 20 },
});

router.get("/jobs", (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const department = String(req.query.department ?? "");
  const location = String(req.query.location ?? "");
  const type = String(req.query.type ?? "");
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

  const conditions = ["status = 'published'"];
  const params = [];

  if (q) {
    conditions.push(
      "(title LIKE ? OR department LIKE ? OR description LIKE ?)",
    );
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (department) {
    conditions.push("department = ?");
    params.push(department);
  }
  if (location) {
    conditions.push("location = ?");
    params.push(location);
  }
  if (type) {
    conditions.push("employment_type = ?");
    params.push(type);
  }

  const where = "WHERE " + conditions.join(" AND ");

  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM jobs ${where}`)
    .get(...params).n;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const offset = (page - 1) * PER_PAGE;

  const jobs = db
    .prepare(
      `
    SELECT id, title, department, location, employment_type, status, created_at
    FROM jobs
    ${where}
    ORDER BY created_at DESC, id DESC
    LIMIT ? OFFSET ?
  `,
    )
    .all(...params, PER_PAGE, offset);

  const departments = db
    .prepare(
      `
    SELECT DISTINCT department FROM jobs WHERE status = 'published' ORDER BY department
  `,
    )
    .all()
    .map((row) => row.department);

  const locations = db
    .prepare(
      `
    SELECT DISTINCT location FROM jobs WHERE status = 'published' ORDER BY location
  `,
    )
    .all()
    .map((row) => row.location);

  res.json({
    jobs: jobs,
    pagination: { page: page, pages: pages, total: total },
    options: { departments: departments, locations: locations },
  });
});

router.get("/jobs/:id", (req, res) => {
  const job = db
    .prepare(
      `
    SELECT id, title, department, location, employment_type,
           description, requirements, status, created_at, updated_at
    FROM jobs
    WHERE id = ? AND status = 'published'
  `,
    )
    .get(req.params.id);

  if (!job) {
    return res
      .status(404)
      .json({
        error:
          "Diese Stelle gibt es nicht oder sie ist nicht mehr ausgeschrieben.",
      });
  }

  res.json({ job: job });
});

router.get("/home", (req, res) => {
  const jobs = db
    .prepare(
      `
    SELECT id, title, department, location, employment_type, status, created_at
    FROM jobs
    WHERE status = 'published'
    ORDER BY created_at DESC, id DESC
    LIMIT 3
  `,
    )
    .all();

  const openCount = db
    .prepare(
      `
    SELECT COUNT(*) AS n FROM jobs WHERE status = 'published'
  `,
    )
    .get().n;

  const departments = db
    .prepare(
      `
    SELECT department, COUNT(*) AS n
    FROM jobs
    WHERE status = 'published'
    GROUP BY department
    ORDER BY department
  `,
    )
    .all();

  res.json({ jobs: jobs, openCount: openCount, departments: departments });
});

// POST /api/jobs/:id/apply – Bewerbung empfangen und prüfen (Speichern folgt in Etappe 4)
// upload.single('cv') liest das Feld "cv" als Datei nach req.file, die Textfelder nach req.body
router.post("/jobs/:id/apply", upload.single("cv"), (req, res) => {
  // Honeypot: Menschen sehen das Feld nicht, Bots füllen es aus → so tun, als ob es geklappt hätte
  if (req.body.website) {
    return res.status(200).json({ ok: true });
  }

  // 1. Gibt es die Stelle und ist sie veröffentlicht? Sonst 404
  const job = db
    .prepare(`SELECT id FROM jobs WHERE id = ? AND status = 'published'`)
    .get(req.params.id);
  if (!job) {
    return res
      .status(404)
      .json({
        error:
          "Diese Stelle gibt es nicht oder sie ist nicht mehr ausgeschrieben.",
      });
  }

  // 2. Felder und PDF nach den Regeln aus lib/validation.js prüfen
  const { errors, values } = validateApplication(req.body, req.file);

  // 3. Nur wenn alles gültig ist: laufende Bewerbung mit gleicher E-Mail auf diese Stelle?
  //    JOIN verbindet Bewerbung (applications) mit Person (candidates), weil die E-Mail bei der Person steht
  if (Object.keys(errors).length === 0) {
    const duplicate = db
      .prepare(
        `
      SELECT 1
      FROM applications a
      JOIN candidates c ON c.id = a.candidate_id
      WHERE a.job_id = ? AND c.email = ? AND a.status NOT IN ('hired', 'rejected')
    `,
      )
      .get(job.id, values.email);

    if (duplicate) {
      errors.email =
        "Mit dieser E-Mail-Adresse gibt es schon eine laufende Bewerbung auf diese Stelle.";
    }
  }

  // 4. Fehler gefunden? → 422 mit einem Text pro Feld (das Frontend zeigt sie unter den Feldern)
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ errors });
  }

  // Zufällige Werte: Token für den Status-Link, Dateiname für die PDF
  const token = crypto.randomBytes(24).toString("hex");
  const storedName = `${crypto.randomUUID()}.pdf`;
  const filePath = path.join(UPLOAD_DIR, storedName);

  // Alles in einer Transaktion speichern: entweder alles oder nichts
  db.exec("BEGIN");
  try {
    const candidate = db
      .prepare(
        `
      INSERT INTO candidates (first_name, last_name, email, phone)
      VALUES (?, ?, ?, ?)
    `,
      )
      .run(values.firstName, values.lastName, values.email, values.phone);

    const application = db
      .prepare(
        `
      INSERT INTO applications (job_id, candidate_id, cover_letter, privacy_ack_at, status_token)
      VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), ?)
    `,
      )
      .run(job.id, candidate.lastInsertRowid, values.coverLetter, token);

    const applicationId = application.lastInsertRowid;

    db.prepare(
      `
      INSERT INTO status_history (application_id, from_status, to_status)
      VALUES (?, NULL, 'new')
    `,
    ).run(applicationId);

    db.prepare(
      `
      INSERT INTO attachments (application_id, original_name, stored_name, mime_type, size_bytes)
      VALUES (?, ?, ?, 'application/pdf', ?)
    `,
    ).run(applicationId, req.file.originalname, storedName, req.file.size);

    // PDF erst ganz zum Schluss auf die Festplatte schreiben
    fs.writeFileSync(filePath, req.file.buffer);

    db.exec("COMMIT");
  } catch (err) {
    // Etwas ist schiefgegangen: Datenbank zurücksetzen und halbe Datei entfernen
    db.exec("ROLLBACK");
    fs.rmSync(filePath, { force: true });
    throw err;
  }

  // Erfolg: 201 = angelegt, mit dem Token für den Status-Link
  res.status(201).json({ token });
});



// Statusseite: Bewerbung über den Token aus dem Status-Link abrufen
router.get('/status/:token', (req, res) => {
  const application = db.prepare(`
    SELECT a.id, a.status, a.delete_after, a.created_at, j.title AS job_title
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE a.status_token = ?
  `).get(req.params.token);

  if (!application) {
    return res.status(404).json({ error: 'Zu diesem Link gibt es keine Bewerbung (mehr). Möglicherweise wurde sie bereits gelöscht.' });
  }

  // Verlauf nur mit Stufe und Datum, ohne Recruiter-Namen
  const history = db.prepare(`
    SELECT to_status, changed_at
    FROM status_history
    WHERE application_id = ?
    ORDER BY changed_at, id
  `).all(application.id);

  res.json({
    application: {
      job_title: application.job_title,
      status: application.status,
      delete_after: application.delete_after,
      created_at: application.created_at,
    },
    history,
  });
});


// Bewerbung zurückziehen: alle Daten und die PDF sofort löschen (E5)
router.post('/status/:token/withdraw', (req, res) => {
  if (req.body?.confirm !== true) {
    return res.status(422).json({ error: 'Bitte bestätige, dass Du Deine Bewerbung zurückziehen möchtest.' });
  }

  const application = db.prepare('SELECT id FROM applications WHERE status_token = ?').get(req.params.token);
  if (!application) {
    return res.status(404).json({ error: 'Zu diesem Link gibt es keine Bewerbung (mehr).' });
  }

  // Alles löschen: Datenbank und PDF (gemeinsame Funktion, lib/applications.js)
  deleteApplication(application.id);

  res.json({ ok: true });
});

export default router;
