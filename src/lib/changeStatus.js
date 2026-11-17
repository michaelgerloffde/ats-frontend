import { changeApplicationStatus } from '../api';

// Text der Sicherheitsabfrage aus E4
const REVEAL_QUESTION =
  'Damit werden Name und Kontaktdaten aufgedeckt. Das kann nicht rückgängig gemacht werden. Fortfahren?';

// Status ändern; verlangt der Server eine Bestätigung zum Aufdecken, wird nachgefragt
export async function changeStatusWithReveal(id, status) {
  try {
    return await changeApplicationStatus(id, status);
  } catch (err) {
    if (err.status === 409 && err.data?.needsReveal) {
      if (!window.confirm(REVEAL_QUESTION)) {
        throw new Error('Abgebrochen: Der Status wurde nicht geändert, die Bewerbung bleibt anonym.');
      }
      return changeApplicationStatus(id, status, true);
    }
    throw err;
  }
}