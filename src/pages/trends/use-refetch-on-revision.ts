import { useEffect, useRef } from 'react';

/**
 * Dispara uma nova busca explicita quando o usuario pede atualizacao, sem
 * trocar a chave de cache. Fica inerte na montagem e enquanto a consulta
 * estiver desabilitada, porque `refetch` ignora `enabled` e faria o modo
 * demonstrativo bater nas fontes reais.
 */
export function useRefetchOnRevision(
  revision: number,
  enabled: boolean,
  refetch: () => void,
): void {
  const appliedRevision = useRef(revision);
  useEffect(() => {
    if (appliedRevision.current === revision) return;
    if (!enabled) {
      appliedRevision.current = revision;
      return;
    }
    appliedRevision.current = revision;
    refetch();
  }, [revision, enabled, refetch]);
}