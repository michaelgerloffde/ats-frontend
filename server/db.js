import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

fs.mkdirSync('data', { recursive: true });

// Datenbankdatei: normal data/ats.db, in Tests eine andere (über DB_FILE)
const DB_FILE = process.env.DB_FILE ?? 'data/ats.db';

export const db = new DatabaseSync(DB_FILE);

db.exec('PRAGMA foreign_keys = ON');