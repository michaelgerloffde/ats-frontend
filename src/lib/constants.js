/** Stufen der Bewerbungs-Pipeline in fester Reihenfolge. `final` = Verfahren abgeschlossen. */
export const STAGES = [
  { key: 'new', label: 'Eingegangen', final: false },
  { key: 'screening', label: 'In Prüfung', final: false },
  { key: 'interview', label: 'Gespräch', final: false },
  { key: 'offer', label: 'Angebot', final: false },
  { key: 'hired', label: 'Eingestellt', final: true },
  { key: 'rejected', label: 'Abgesagt', final: true },
];

export const stageLabel = (key) => STAGES.find((s) => s.key === key)?.label ?? key;

export const EMPLOYMENT_TYPES = ['Vollzeit', 'Teilzeit', 'Werkstudium', 'Ausbildung'];

export const JOB_STATUSES = { draft: 'Entwurf', published: 'Veröffentlicht', closed: 'Geschlossen' };

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Löschfristen in Tagen nach Abschluss des Verfahrens (DSGVO-Löschkonzept). */
export const RETENTION_DAYS = { default: 180, talentPool: 730 };
