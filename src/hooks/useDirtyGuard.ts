import { useEffect } from 'react';
import { useNavigationGuardStore } from '@/stores/useNavigationGuardStore';

/**
 * Registra que a página atual tem alterações não salvas, para que a
 * navegação global de "voltar" (botão, breadcrumbs, swipe, atalhos)
 * peça confirmação no diálogo unificado antes de sair.
 *
 * @param scope  Identificador estável do formulário (ex.: "kit-builder").
 * @param dirty  true enquanto houver alterações não salvas.
 */
export function useDirtyGuard(scope: string, dirty: boolean) {
  const setDirty = useNavigationGuardStore((s) => s.setDirty);

  useEffect(() => {
    setDirty(scope, dirty);
    return () => setDirty(scope, false);
  }, [scope, dirty, setDirty]);
}
