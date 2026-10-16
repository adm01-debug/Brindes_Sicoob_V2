import { useEffect } from 'react';
import { useNavigationGuardStore } from '@/stores/useNavigationGuardStore';

/** Registra alterações não salvas para o bloqueio central de navegação. */
export function useDirtyGuard(scope: string, dirty: boolean, message?: string) {
  const setDirty = useNavigationGuardStore((state) => state.setDirty);

  useEffect(() => {
    setDirty(scope, dirty, message);
    return () => setDirty(scope, false);
  }, [dirty, message, scope, setDirty]);
}
