import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Marca o descarte do rascunho local para quando a tela realmente sair.
 *
 * Confirmar "sair sem salvar" nao garante que o formulario deixou de existir:
 * duas entradas de historico para o mesmo caminho (atalho usado duas vezes,
 * caminho igual com query diferente) trocam a URL sem desmontar a tela. Apagar
 * o rascunho ali deixaria o salvamento automatico sem base de comparacao e a
 * proxima edicao viraria conflito. O pedido fica pendente e so e executado no
 * desmonte; se a tela continua montada depois da navegacao, ele e cancelado.
 */
export function useDescartarRascunhoAoDesmontar(descartar: () => void) {
  const { pathname, search } = useLocation();
  const pendente = useRef(false);
  const descartarRef = useRef(descartar);
  descartarRef.current = descartar;

  useEffect(() => {
    // Chegou URL nova com a tela ainda montada: nada saiu de verdade.
    pendente.current = false;
  }, [pathname, search]);

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
