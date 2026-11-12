import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

fs.mkdirSync('data', { recursive: true });

export const db = new DatabaseSync('data/ats.db');

db.exec('PRAGMA foreign_keys = ON');