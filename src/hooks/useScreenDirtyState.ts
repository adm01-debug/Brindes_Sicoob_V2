/**
 * Liga o estado real de uma tela ao registro que o voltar consulta.
 *
 * Sem isto, a decisão de pedir confirmação depende do pathname e não do que o
 * usuário fez — ver `src/lib/navigation/dirty-registry.ts`.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { declararEstadoDaRota, esquecerRota } from '@/lib/navigation/dirty-registry';

export function useScreenDirtyState(
  temTrabalhoNaoSalvo: boolean,
  mensagem?: string,
  rotulo?: string,
  aoDescartar?: () => void,
): void {
  const { pathname } = useLocation();
  // Identidade estável: o descarte é lido do ref na hora da resposta, então
  // recriar o callback a cada render não re-declara a rota (e não abre janela
  // em que a rota fica sem registro).
  const descarteRef = useRef(aoDescartar);
  descarteRef.current = aoDescartar;
  useEffect(() => {
    declararEstadoDaRota(pathname, temTrabalhoNaoSalvo, mensagem, rotulo, () =>
      descarteRef.current?.(),
    );
    return () => esquecerRota(pathname);
  }, [pathname, temTrabalhoNaoSalvo, mensagem, rotulo]);
}
