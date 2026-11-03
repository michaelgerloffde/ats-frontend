/**
 * Datumswerte kommen als ISO-String (z. B. "2026-10-20T08:15:00.000Z").
 * Ausgabe im deutschen Format in der Zeitzone des Browsers.
 */
export function formatDate(iso, withTime = false) {
  if (!iso) return '–';
  const d = new Date(iso);
  const opts = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return withTime
    ? d.toLocaleString('de-DE', { ...opts, hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('de-DE', opts);
}

export function formatBytes(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
