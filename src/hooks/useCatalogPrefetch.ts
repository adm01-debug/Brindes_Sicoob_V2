import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCatalogPage } from '@/hooks/useProductsLightweight';

/**
 * Prefetch do catálogo SOMENTE após autenticação (#6).
 * Evita chamadas à bridge sem JWT.
 */
export function useCatalogPrefetch() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const prefetchedRef = useRef(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated || prefetchedRef.current || !user?.id) return;
    
    // Otimização: Delay de 2s para prefetch não competir com o render inicial crítico (LCP)
    const timer = setTimeout(() => {
      prefetchedRef.current = true;
      queryClient.prefetchInfiniteQuery({
        // Mesma chave do useProductsCatalog: se a página já iniciou a carga,
        // o React Query reutiliza a promessa e o mesmo carregador valida a
        // completude do batch antes de preencher o cache compartilhado.
        queryKey: ['promobrind-products-catalog', ''],
        queryFn: ({ pageParam }) => fetchCatalogPage(pageParam as number),
        initialPageParam: 0,
        staleTime: 15 * 60 * 1000, // Aumentado para 15 min
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, queryClient, user?.id]);
}
