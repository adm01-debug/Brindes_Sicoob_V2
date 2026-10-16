import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { trackUx } from '@/lib/uxMetrics';

const windowPositions = new Map<string, number>();
const containerPositions = new Map<string, number>();
const MAX_ROUTES = 50;
const RESTORE_RETRIES_MS = [0, 150, 400, 900];

export function resetScrollRestoration(): void {
  windowPositions.clear();
  containerPositions.clear();
}

function trimOldest(map: Map<string, number>, limit: number) {
  while (map.size > limit) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) return;
    map.delete(oldest);
  }
}

function hasSavedContainerPosition(routeKey: string): boolean {
  const prefix = `${routeKey}::`;
  return Array.from(containerPositions.keys()).some((key) => key.startsWith(prefix));
}

/** Preserva o scroll da janela e de grades internas ao voltar/avançar. */
export function useScrollRestoration(): void {
  const location = useLocation();
  const navigationType = useNavigationType();
  const routeKey = `${location.pathname}${location.search}`;
  const activeRouteRef = useRef(routeKey);

  useEffect(() => {
    activeRouteRef.current = routeKey;

    const capturePosition = (event: Event) => {
      const target = event.target;
      if (target instanceof Document || target === window) {
        windowPositions.set(activeRouteRef.current, window.scrollY);
        trimOldest(windowPositions, MAX_ROUTES);
        return;
      }
      if (target instanceof HTMLElement && target.dataset.scrollRestore) {
        containerPositions.set(
          `${activeRouteRef.current}::${target.dataset.scrollRestore}`,
          target.scrollTop,
        );
        trimOldest(containerPositions, MAX_ROUTES * 4);
      }
    };
    document.addEventListener('scroll', capturePosition, { passive: true, capture: true });

    const timers: Array<ReturnType<typeof setTimeout>> = [];
    if (navigationType === 'POP') {
      const savedWindowPosition = windowPositions.get(routeKey);
      if (savedWindowPosition !== undefined || hasSavedContainerPosition(routeKey)) {
        trackUx('nav.scroll-restore');
      }

      const restore = () => {
        if (savedWindowPosition !== undefined) window.scrollTo(0, savedWindowPosition);
        document.querySelectorAll<HTMLElement>('[data-scroll-restore]').forEach((element) => {
          const id = element.dataset.scrollRestore;
          if (!id) return;
          const position = containerPositions.get(`${routeKey}::${id}`);
          if (position !== undefined) element.scrollTop = position;
        });
      };
      RESTORE_RETRIES_MS.forEach((delay) => timers.push(setTimeout(restore, delay)));
    }

    return () => {
      document.removeEventListener('scroll', capturePosition, { capture: true });
      timers.forEach(clearTimeout);
    };
  }, [navigationType, routeKey]);
}
