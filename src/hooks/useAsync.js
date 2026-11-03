import { useCallback, useEffect, useState } from 'react';

/**
 * Lädt Daten über eine API-Funktion und merkt sich Ladezustand, Fehler und Ergebnis.
 *
 *   const { data, error, loading, reload } = useAsync(() => getJob(id), [id]);
 *
 * Ändert sich etwas in `deps`, wird neu geladen. Nach Änderungen (z. B. Status gesetzt)
 * `reload()` aufrufen, um den neuen Stand vom Server zu holen.
 */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await run();
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState({ data: null, error, loading: false });
    }
  }, [run]);

  useEffect(() => { reload(); }, [reload]);

  return { ...state, reload };
}
