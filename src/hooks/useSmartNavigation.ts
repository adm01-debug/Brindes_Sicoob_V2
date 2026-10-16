import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNavigationStore } from '@/stores/useNavigationStore';
import { Haptics } from '@/utils/haptics';

export function useSmartNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { push, getPrevious, history, direction, setDirection } = useNavigationStore();

  // Rastrear navegação
  useEffect(() => {
    // Só adiciona se o path mudou (evita search query loops se não for desejado)
    const title = document.title || 'Página';
    
    // Pegar labels de breadcrumbs para títulos mais precisos se possível
    // Aqui poderíamos injetar um resolver de títulos baseado no path
    
    push({
      pathname: location.pathname,
      search: location.search,
      title,
      timestamp: Date.now(),
    });
  }, [location.pathname, location.search, push]);

  const goBack = useCallback((fallbackPath?: string) => {
    Haptics.impactLight();
    setDirection('backward');

    if (Number(window.history.state?.idx) > 0) {
      navigate(-1);
    } else if (fallbackPath) {
      navigate(fallbackPath);
    } else {
      // Lógica de subida hierárquica inteligente
      const pathParts = location.pathname.split('/').filter(Boolean);
      if (pathParts.length <= 1) {
        navigate('/');
      } else {
        // Se estamos em /pedidos/123, sobe para /pedidos
        navigate('/' + pathParts.slice(0, -1).join('/'));
      }
    }
  }, [location.pathname, navigate, setDirection]);

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
