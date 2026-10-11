import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNavigationStore } from '@/stores/useNavigationStore';
import { useNavigationGuardStore } from '@/stores/useNavigationGuardStore';
import { Haptics } from '@/utils/haptics';

const OPEN_DIALOG_SELECTOR =
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]';

// Dispara Escape para que o Radix DismissableLayer feche o dialog aberto.
function closeTopmostOverlay(): boolean {
  if (!document.querySelector(OPEN_DIALOG_SELECTOR)) return false;
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
  );
  return true;
}

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
  if (!force && isCriticalPath) {
    const confirmed = await useNavigationGuardStore.getState().requestConfirmation();
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

export function useSmartNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { push, getPrevious, pop, history, direction, setDirection } = useNavigationStore();

  const isCriticalPath = location.pathname.includes('/simulador') ||
                         location.pathname.includes('/orcamentos/novo') ||
                         location.pathname.includes('/mockup-generator');

  useTrackNavigation(location, push);

  const goBack = useCallback((fallbackPath?: string, force = false) => {
    // Voltar fecha o modal/menu aberto antes de sair da página.
    if (!force && closeTopmostOverlay()) return;

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
    setDirection('forward');
    navigate(path);
  }, [navigate, setDirection]);

  useEffect(() => {
    const handleSmartBack = () => goBack();
    window.addEventListener('smart-back', handleSmartBack);
    return () => window.removeEventListener('smart-back', handleSmartBack);
  }, [goBack]);

  return { goBack, goForward, previousItem: getPrevious(), history, direction };
}
