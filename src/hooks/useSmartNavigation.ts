import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNavigationStore } from '@/stores/useNavigationStore';
import { askConfirm } from '@/stores/useConfirmDialogStore';
import { dismissTopmostOverlay } from '@/lib/overlay';
import { mensagemDaRota, rotaEstaSuja, rotaTemEstadoDeclarado } from '@/lib/navigation/dirty-registry';
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

/**
 * Pergunta só quando há motivo.
 *
 * Se a tela montada declarou o próprio estado, ela manda: é a única que sabe
 * se o usuário digitou algo. Enquanto uma rota não declarar nada, continua
 * valendo a lista de rotas críticas — trocar isso por silêncio seria piorar.
 */
function precisaConfirmarSaida(pathname: string, isCriticalPath: boolean): boolean {
  if (rotaTemEstadoDeclarado(pathname)) return rotaEstaSuja(pathname);
  return isCriticalPath;
}

async function performBackNavigation(deps: BackNavigationDeps) {
  const { navigate, pathname, fallbackPath, isCriticalPath, force, getPrevious, pop, setDirection } = deps;
  if (!force && precisaConfirmarSaida(pathname, isCriticalPath)) {
    trackUx('guard.shown');
    const confirmed = await askConfirm({
      title: 'Sair sem salvar?',
      description: mensagemDaRota(pathname) ?? 'Você tem alterações não salvas nesta tela.',
      variant: 'warning',
      confirmLabel: 'Sair',
      cancelLabel: 'Continuar aqui',
    });
    if (!confirmed) {
      trackUx('guard.cancel');
      return;
    }
    trackUx('guard.confirm');
  }

  // nav.back conta retorno efetivo: só depois de passar pela confirmação.
  trackUx('nav.back');
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

/**
 * Rede de segurança para rota que ainda não declara o próprio estado.
 *
 * As três rotas abaixo já declaram (`useScreenDirtyState` em
 * `SimuladorWizard`, `QuoteBuilderPage` e `MockupGenerator`), então na prática
 * quem decide por elas é o registro, não esta lista. Ela fica como piso: se
 * alguém criar uma tela que perde trabalho e esquecer de declarar, acrescentar
 * o caminho aqui volta a proteger — pedir demais é recuperável, perder em
 * silêncio não.
 */
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

function useSmartBackRegistration(goBack: () => void) {
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
}

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

  useSmartBackRegistration(goBack);

  return { goBack, goForward, previousItem: getPrevious(), history, direction };
}
