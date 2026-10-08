import React, { useState, useEffect, forwardRef } from 'react';





import { useDevGate } from "@/hooks/useDevGate";

interface DebugLog {
  ts: string;
  scope: string;
  message: string;
  data: unknown;
  type: 'info' | 'error';
}

export const AuthDiagnosticsWidget = forwardRef<HTMLDivElement>((_props, ref) => {
  const { isAllowed } = useDevGate();
  const [, setLogs] = useState<DebugLog[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isAllowed) return;

    const checkDev = () => {
      // O useDevGate já cuida do papel, aqui apenas decidimos abrir automaticamente
      setIsOpen(true);
    };
    
    checkDev();
    
    const loadLogs = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('auth_debug_history') || '[]');
        setLogs(stored.reverse());
      } catch {
        setLogs([]);
      }
    };

    loadLogs();
    window.addEventListener('auth_debug_update', loadLogs);
    window.addEventListener('storage', loadLogs);
    
    return () => {
      window.removeEventListener('auth_debug_update', loadLogs);
      window.removeEventListener('storage', loadLogs);
    };
  }, [isAllowed]);

  if (!isAllowed || !isOpen) return null;

  return (
    <div ref={ref} className="fixed bottom-4 right-4 z-[9999] max-w-md w-full animate-in slide-in-from-right-4">
      {/* ... keep existing code */}
    </div>
  );
});

AuthDiagnosticsWidget.displayName = 'AuthDiagnosticsWidget';
