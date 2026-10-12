import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNavigationStore } from '@/stores/useNavigationStore';
import { useNavigationGuardStore } from '@/stores/useNavigationGuardStore';
import { dismissTopmostOverlay } from '@/lib/overlay';
import { trackUx } from '@/lib/uxMetrics';
import { Haptics } from '@/utils/haptics';

interface BackNavigationDeps {
  navigate: ReturnType<typeof useNavigate>;
  pathname: string;
  fallbackPath?: string;
  isCriticalPath: boolean;
  force: boolean;
  getPrevious: () => { pathname: string; search: string } | undefined;
  pop: () => unknown;
  setDirection: (direction: 'forward' | 'backward') => void;
}

async function performBackNavigation(deps: BackNavigationDeps) {
  const { navigate, pathname, fallbackPath, isCriticalPath, force, getPrevious, pop, setDirection } = deps;
  const guard = useNavigationGuardStore.getState();
  if (!force && (isCriticalPath || guard.hasDirty())) {
    const confirmed = await guard.requestConfirmation();
    if (!confirmed) return;
  }

  Haptics.impactLight();
  setDirection('backward');
  const previous = getPrevious();

  if (previous) {
    pop(); // Remove o atual
    navigate(-1);
  } else if (fallbackPath) {
    navigate(fallbackPath);
  } else {
    // Lógica de subida hierárquica inteligente
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length <= 1) {
      navigate('/');
    } else {
      // Se estamos em /pedidos/123, sobe para /pedidos
      navigate('/' + pathParts.slice(0, -1).join('/'));
    }
  }
}

// Rastrear navegação no histórico persistido (dedup de entradas iguais fica no store).
function useTrackNavigation(location: ReturnType<typeof useLocation>, push: (item: {
  pathname: string; search: string; title: string; timestamp: number;
}) => void) {
  useEffect(() => {
    const title = document.title || 'Página';
    push({
      pathname: location.pathname,
      search: location.search,
      title,
      timestamp: Date.now(),
    });
  }, [location.pathname, location.search, push]);
}

// Rotas onde sair sem salvar sempre pede confirmação, independente de escopo sujo.
export function isCriticalPathname(pathname: string) {
  return pathname.includes('/simulador') ||
         pathname.includes('/orcamentos/novo') ||
         pathname.includes('/mockup-generator');
}

// Vários componentes instanciam o hook (BackButton, Breadcrumbs, swipe) —
// o evento 'smart-back' (atalho/swipe) dispara o goBack da instância mais
// recente apenas uma vez, senão cada listener navegaria um passo atrás.
// Pilha de registrantes: a instância mais recente atende o smart-back e,
// ao desmontar, devolve o controle para a anterior (breadcrumb, swipe etc.).
const goBackStack: Array<() => void> = [];
let smartBackListenerRegistered = false;

export function useSmartNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { push, getPrevious, pop, history, direction, setDirection } = useNavigationStore();

  const isCriticalPath = isCriticalPathname(location.pathname);

  useTrackNavigation(location, push);

  const goBack = useCallback((fallbackPath?: string, force = false) => {
    // Voltar fecha o modal/menu aberto antes de sair da página.
    if (!force && dismissTopmostOverlay()) {
      trackUx('nav.overlay-dismiss');
      return;
    }

    trackUx('nav.back');
    void performBackNavigation({
      navigate,
      pathname: location.pathname,
      fallbackPath,
      isCriticalPath,
      force,
      getPrevious,
      pop,
      setDirection,
    });
  }, [location.pathname, getPrevious, isCriticalPath, pop, navigate, setDirection]);

  const goForward = useCallback((path: string) => {
    trackUx('nav.forward');
    setDirection('forward');
    navigate(path);
  }, [navigate, setDirection]);

  useEffect(() => {
    goBackStack.push(goBack);
    if (!smartBackListenerRegistered) {
      smartBackListenerRegistered = true;
      window.addEventListener('smart-back', () => {
        goBackStack[goBackStack.length - 1]?.();
      });
    }
    return () => {
      const index = goBackStack.lastIndexOf(goBack);
      if (index >= 0) goBackStack.splice(index, 1);
    };
  }, [goBack]);

  return { goBack, goForward, previousItem: getPrevious(), history, direction };
}
