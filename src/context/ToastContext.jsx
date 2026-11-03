import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

/** Kurze Rückmeldungen ("Gespeichert", "Fehler …") unten rechts, verschwinden nach 4 Sekunden. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'success') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div aria-live="polite" className="fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} role="status"
            className={`rounded-lg border-l-4 px-4 py-3 text-sm shadow-lg ${t.type === 'error' ? 'border-red-600 bg-red-50 text-red-900' : 'border-brand-600 bg-white text-ink'}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
