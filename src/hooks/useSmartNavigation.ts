import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNavigationStore } from '@/stores/useNavigationStore';
import { Haptics } from '@/utils/haptics';

export function useSmartNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { push, getPrevious, pop, history, direction, setDirection } = useNavigationStore();

  // Rastrear navegação
  useEffect(() => {
    // Pegar o título da página se possível
    const title = document.title || 'Página';
    push({
      pathname: location.pathname,
      search: location.search,
      title,
      timestamp: Date.now(),
    });
  }, [location.pathname, location.search, push]);

  const goBack = useCallback(() => {
    Haptics.impactLight();
    
    setDirection('backward');
    const previous = getPrevious();
    
    if (previous) {
      pop(); // Remove o atual
      navigate(-1);
    } else {
      const pathParts = location.pathname.split('/').filter(Boolean);
      if (pathParts.length <= 1) {
        navigate('/');
      } else {
        navigate('/' + pathParts.slice(0, -1).join('/'));
      }
    }
  }, [location.pathname, getPrevious, pop, navigate, setDirection]);

  const goForward = useCallback((path: string) => {
    setDirection('forward');
    navigate(path);
  }, [navigate, setDirection]);

  return { goBack, goForward, previousItem: getPrevious(), history, direction };
}
