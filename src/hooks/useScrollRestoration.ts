import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Posições de scroll por rota (pathname+search), persistidas em memória
// para a sessão inteira — voltar a uma listagem restaura exatamente onde
// o usuário estava; navegação para frente sempre começa no topo.
const scrollPositions = new Map<string, number>();
const MAX_ENTRIES = 50;

/**
 * Restaura o scroll da rota ao voltar e reinicia no topo ao avançar.
 * Usar uma vez no layout raiz (dentro do Router).
 */
export function useScrollRestoration(): void {
  const location = useLocation();
  const key = location.pathname + location.search;
  const restoreFrame = useRef(0);

  useEffect(() => {
    const saved = scrollPositions.get(key);
    const apply = () => window.scrollTo(0, saved ?? 0);
    apply();
    // A página pode crescer após o primeiro paint (conteúdo assíncrono):
    // reaplica no próximo frame para o alvo continuar alcançável.
    restoreFrame.current = requestAnimationFrame(apply);

    const onScroll = () => scrollPositions.set(key, window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(restoreFrame.current);
      window.removeEventListener('scroll', onScroll);
      if (scrollPositions.size >= MAX_ENTRIES) {
        const oldest = scrollPositions.keys().next().value;
        if (oldest !== undefined) scrollPositions.delete(oldest);
      }
    };
  }, [key]);
}
