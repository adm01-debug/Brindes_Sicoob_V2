import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { invokeBatchBridge } from '@/lib/external-db';
import { mapLightweightToProduct, PRODUCT_SELECT_LIGHTWEIGHT, CATALOG_PAGE_SIZE, CATALOG_BATCH_PAGES } from '@/hooks/useProductsLightweight';

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
    
    // Ensure we don't start prefetch if session is about to expire or invalid
    const userId = user.id;
    
    // Otimização: Delay de 2s para prefetch não competir com o render inicial crítico (LCP)
    const timer = setTimeout(() => {
      prefetchedRef.current = true;
      queryClient.prefetchInfiniteQuery({
        queryKey: ['promobrind-products-catalog', '', userId],
        queryFn: async () => {
          const batchQueries = Array.from({ length: CATALOG_BATCH_PAGES }, (_, i) => ({
            table: 'products',
            operation: 'select' as const,
            select: PRODUCT_SELECT_LIGHTWEIGHT,
            filters: { active: true },
            orderBy: { column: 'name', ascending: true },
            limit: CATALOG_PAGE_SIZE,
            offset: i * CATALOG_PAGE_SIZE,
            ...(i === 0 ? { countMode: 'exact' } : {}),
          }));
          const batchResults = await invokeBatchBridge(batchQueries);
          const products: ReturnType<typeof mapLightweightToProduct>[] = [];
          let totalEstimate: number | null = null;
          let lastPageSize = 0;
          for (const result of batchResults) {
            if (result.success && result.data?.records) {
              products.push(...(result.data.records as unknown[]).map(mapLightweightToProduct));
              lastPageSize = result.data.records.length;
              if (result.data.count != null && totalEstimate === null) {
                totalEstimate = result.data.count as number;
              }
            }
          }
          return {
            products,
            nextOffset: lastPageSize === CATALOG_PAGE_SIZE ? CATALOG_BATCH_PAGES * CATALOG_PAGE_SIZE : null,
            totalEstimate,
          };
        },
        initialPageParam: 0,
        staleTime: 15 * 60 * 1000, // Aumentado para 15 min
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, queryClient, user?.id]);
}