import { useCallback, useEffect, useRef } from 'react';

/**
 * Marca o descarte do rascunho local para quando a tela realmente sair.
 *
 * Confirmar "sair sem salvar" nao garante que o formulario deixou de existir:
 * duas entradas de historico para o mesmo caminho (atalho usado duas vezes,
 * caminho igual com query diferente) trocam a URL sem desmontar a tela, e a
 * animacao de transicao mantem o editor antigo montado enquanto outro
 * orcamento entra. Apagar no clique deixaria o salvamento automatico sem base
 * de comparacao; apagar quando a URL muda perderia o descarte do editor que
 * ainda vai desmontar. O pedido fica pendente e e executado no desmonte desta
 * propria tela; se ela nunca desmontar, nada e apagado.
 */
export function useDescartarRascunhoAoDesmontar(descartar: () => void) {
  const pendente = useRef(false);
  const descartarRef = useRef(descartar);
  descartarRef.current = descartar;

  useEffect(
    () => () => {
      if (pendente.current) descartarRef.current();
    },
    [],
  );

  return useCallback(() => {
    pendente.current = true;
  }, []);
}
