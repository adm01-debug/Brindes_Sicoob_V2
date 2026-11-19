/**
 * Liga o estado real de uma tela ao registro que o voltar consulta.
 *
 * Sem isto, a decisão de pedir confirmação depende do pathname e não do que o
 * usuário fez — ver `src/lib/navigation/dirty-registry.ts`.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { declararEstadoDaRota, esquecerRota } from '@/lib/navigation/dirty-registry';

export function useScreenDirtyState(temTrabalhoNaoSalvo: boolean): void {
  const { pathname } = useLocation();
  useEffect(() => {
    declararEstadoDaRota(pathname, temTrabalhoNaoSalvo);
    return () => esquecerRota(pathname);
  }, [pathname, temTrabalhoNaoSalvo]);
}
