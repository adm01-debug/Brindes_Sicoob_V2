import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNavigationStore } from '@/stores/useNavigationStore';
import { Haptics } from '@/utils/haptics';

export function useSmartNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { push, getPrevious, pop, history } = useNavigationStore();

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
    
    const previous = getPrevious();
    
    // Se temos um histórico rastreado, usamos ele para decidir
    if (previous) {
      // Se o anterior for uma sub-página do atual ou igual, retrocede no histórico real do navegador
      // caso contrário, vai para o caminho mapeado
      pop(); // Remove o atual
      navigate(-1);
    } else {
      // Fallback para o pai se não houver histórico útil
      const pathParts = location.pathname.split('/').filter(Boolean);
      if (pathParts.length <= 1) {
        navigate('/');
      } else {
        navigate('/' + pathParts.slice(0, -1).join('/'));
      }
    }
  }, [location.pathname, getPrevious, pop, navigate]);

  return { goBack, previousItem: getPrevious(), history };
}
