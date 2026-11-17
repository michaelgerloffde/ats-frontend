export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_COVER_LETTER = 5000;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_PATTERN = /^\+?[0-9 ()/-]{6,30}$/;

export function validateApplication(fields, file) {
  const firstName = String(fields.firstName ?? '').trim();
  const lastName = String(fields.lastName ?? '').trim();
  const email = String(fields.email ?? '').trim().toLowerCase();
  const phone = String(fields.phone ?? '').trim();
  const coverLetter = String(fields.coverLetter ?? '').trim();

  const errors = {};

  if (firstName.length < 1 || firstName.length > 100) {
    errors.firstName = 'Bitte gib Deinen Vornamen an (höchstens 100 Zeichen).';
  }
  if (lastName.length < 1 || lastName.length > 100) {
    errors.lastName = 'Bitte gib Deinen Nachnamen an (höchstens 100 Zeichen).';
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    errors.email = 'Bitte gib eine gültige E-Mail-Adresse an.';
  }
  if (phone && !PHONE_PATTERN.test(phone)) {
    errors.phone = 'Bitte gib eine gültige Telefonnummer an.';
  }
  if (coverLetter.length < 1) {
    errors.coverLetter = 'Bitte schreib ein kurzes Anschreiben.';
  } else if (coverLetter.length > MAX_COVER_LETTER) {
    errors.coverLetter = 'Das Anschreiben darf höchstens 5.000 Zeichen lang sein.';
  }
  if (fields.consent !== 'true') {
    errors.consent = 'Bitte bestätige, dass Du die Datenschutzhinweise gelesen hast.';
  }
  if (!file) {
    errors.cv = 'Bitte lade Deinen Lebenslauf als PDF hoch.';
  } else if (!isPdf(file.buffer)) {
    errors.cv = 'Die Datei ist keine gültige PDF.';
  }

  return {
    errors,
    values: { firstName, lastName, email, phone: phone || null, coverLetter },
  };
}

function isPdf(buffer) {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}


// Erlaubte Werte für Stellen (gleich wie die CHECK-Regeln in init-db.js)
const EMPLOYMENT_TYPES = ['Vollzeit', 'Teilzeit', 'Werkstudium', 'Ausbildung'];
const JOB_STATUSES = ['draft', 'published', 'closed'];

// Stelle prüfen: gibt Fehler und bereinigte Werte zurück
export function validateJob(fields) {
  const values = {};
  for (const key of ['title', 'department', 'location', 'employment_type', 'description', 'requirements', 'status']) {
    values[key] = String(fields?.[key] ?? '').trim();
  }

  const errors = {};
  for (const [key, max] of [['title', 150], ['department', 100], ['location', 100]]) {
    if (!values[key] || values[key].length > max) {
      errors[key] = `Pflichtfeld, höchstens ${max} Zeichen.`;
    }
  }
  for (const key of ['description', 'requirements']) {
    if (values[key].length < 20 || values[key].length > 10000) {
      errors[key] = 'Bitte zwischen 20 und 10.000 Zeichen.';
    }
  }
  if (!EMPLOYMENT_TYPES.includes(values.employment_type)) errors.employment_type = 'Ungültige Auswahl.';
  if (!JOB_STATUSES.includes(values.status)) errors.status = 'Ungültige Auswahl.';

  return { errors, values };
}