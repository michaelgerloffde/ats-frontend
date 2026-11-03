/**
 * Fehler, den jede API-Funktion wirft, wenn der Server nicht mit 2xx antwortet.
 * - status: HTTP-Statuscode (401, 403, 404, 422, …)
 * - data:   die JSON-Antwort, z. B. { error: 'Text' } oder { errors: { email: 'Text' } }
 * Mock und echtes Backend werfen denselben Fehlertyp → die Seiten merken keinen Unterschied.
 */
export class ApiError extends Error {
  constructor(status, data = {}) {
    super(data.error ?? 'Es ist ein Fehler aufgetreten.');
    this.status = status;
    this.data = data;
  }

  /** Feldfehler aus einer 422-Antwort, z. B. { email: 'Ungültige E-Mail' } */
  get fieldErrors() {
    return this.data.errors ?? null;
  }
}
