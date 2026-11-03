import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as api from '../api';
import { Spinner } from '../components/ui.jsx';

const SessionContext = createContext(null);

/**
 * Wer ist eingeloggt? Wird beim Start einmal von der API geholt.
 * Achtung: Das ist nur eine Kopie für die Anzeige. Ob jemand etwas DARF,
 * entscheidet immer der Server bei jeder einzelnen Anfrage.
 */
export function SessionProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = lädt noch, null = nicht eingeloggt

  const refresh = useCallback(async () => {
    try {
      const data = await api.getSession();
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await api.logout().catch(() => {});
    setUser(null);
  };

  if (user === undefined) {
    return <div className="grid min-h-screen place-items-center"><Spinner /></div>;
  }
  return (
    <SessionContext.Provider value={{ user, login, logout, refresh, isAdmin: user?.role === 'admin' }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
