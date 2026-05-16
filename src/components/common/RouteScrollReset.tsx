import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * RouteScrollReset
 * -----------------
 * Em navegações SPA (PUSH/REPLACE), rola a window suavemente até o topo,
 * para que o conteúdo da nova rota seja exibido a partir do início.
 *
 * Regras:
 * - POP (back/forward) preserva o scroll do navegador.
 * - Se a URL contém hash âncora (#id), respeita o destino e não força topo.
 * - Honra `prefers-reduced-motion` (fallback para `behavior: "auto"`).
 * - Skip no primeiro mount (evita interferir em deep-links com âncora).
 */
export function RouteScrollReset() {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (navType === "POP") return;
    if (hash) {
      // Se houver hash, tenta rolar até o elemento após um micro-delay para garantir render
      setTimeout(() => {
        const element = document.getElementById(hash.replace('#', ''));
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return;
    }

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Rola para o topo suavemente, mas garante que seja imediato se o usuário já estiver no topo
    if (window.scrollY > 0) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: prefersReduced ? "auto" : "smooth",
      });
    }
  }, [pathname, hash, navType]);

  return null;
}

export default RouteScrollReset;
