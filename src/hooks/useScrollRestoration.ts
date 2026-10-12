import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Posições de scroll por rota (pathname+search), persistidas em memória
// para a sessão inteira — voltar a uma listagem restaura exatamente onde
// o usuário estava; navegação para frente continua no topo (RouteScrollReset).
const scrollPositions = new Map<string, number>();
const containerPositions = new Map<string, number>();
const MAX_ENTRIES = 50;

// Tentativas de restauração de contêineres internos após voltar: grades
// virtualizadas só remontam quando os dados chegam, então reaplicamos.
const RESTORE_RETRIES_MS = [0, 150, 400, 900];

/**
 * Restaura o scroll ao voltar (POP) — window e contêineres internos
 * marcados com `data-scroll-restore="<id>"` (ex.: grade de produtos).
 * Em PUSH/REPLACE não faz nada: o RouteScrollReset já leva ao topo.
 * Usar uma vez no layout raiz (dentro do Router).
 */
export function useScrollRestoration(): void {
  const location = useLocation();
  const navType = useNavigationType();
  const key = location.pathname + location.search;
  const routeKey = useRef(key);

  useEffect(() => {
    routeKey.current = key;

    // capture: scroll não borbulha, mas desce pelo documento — assim
    // registramos tanto o scroll da window quanto o de contêineres internos.
    const onScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Document || target === window) {
        scrollPositions.set(routeKey.current, window.scrollY);
        if (scrollPositions.size > MAX_ENTRIES) {
          const oldest = scrollPositions.keys().next().value;
          if (oldest !== undefined) scrollPositions.delete(oldest);
        }
        return;
      }
      if (target instanceof HTMLElement && target.dataset.scrollRestore) {
        containerPositions.set(`${routeKey.current}::${target.dataset.scrollRestore}`, target.scrollTop);
        if (containerPositions.size > MAX_ENTRIES * 4) {
          const oldest = containerPositions.keys().next().value;
          if (oldest !== undefined) containerPositions.delete(oldest);
        }
      }
    };
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });

    const timers: ReturnType<typeof setTimeout>[] = [];
    if (navType === 'POP') {
      const saved = scrollPositions.get(key);
      if (saved !== undefined) window.scrollTo(0, saved);

      const restoreContainers = () => {
        document.querySelectorAll<HTMLElement>('[data-scroll-restore]').forEach((el) => {
          const position = containerPositions.get(`${key}::${el.dataset.scrollRestore}`);
          if (position !== undefined) el.scrollTop = position;
        });
      };
      RESTORE_RETRIES_MS.forEach((ms) => timers.push(setTimeout(restoreContainers, ms)));
    }

    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      timers.forEach(clearTimeout);
    };
  }, [key, navType]);
}
