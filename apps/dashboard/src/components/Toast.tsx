import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface Toast { id: number; message: string; type: 'success' | 'error'; }
interface ToastCtx { show: (message: string, type?: 'success' | 'error') => void; }

const Ctx = createContext<ToastCtx>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let nextId = 0;

  const show = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++nextId;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success'
              ? <CheckCircle size={16} color="var(--green)" />
              : <XCircle size={16} color="var(--red)" />}
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
