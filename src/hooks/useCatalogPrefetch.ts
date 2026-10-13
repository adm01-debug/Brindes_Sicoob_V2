import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { invokeBatchBridge, type LightweightProduct } from '@/lib/external-db';
import { mapLightweightToProduct, PRODUCT_SELECT_LIGHTWEIGHT, CATALOG_INITIAL_PAGE_SIZE, CATALOG_BATCH_PAGES } from '@/hooks/useProductsLightweight';

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
        // o React Query reutiliza a promessa em vez de duplicar o lote.
        queryKey: ['promobrind-products-catalog', ''],
        queryFn: async () => {
          const batchQueries = Array.from({ length: CATALOG_BATCH_PAGES }, (_, i) => ({
            table: 'products',
            operation: 'select' as const,
            select: PRODUCT_SELECT_LIGHTWEIGHT,
            filters: { is_active: true },
            orderBy: { column: 'name', ascending: true },
            limit: CATALOG_INITIAL_PAGE_SIZE,
            offset: i * CATALOG_INITIAL_PAGE_SIZE,
            ...(i === 0 ? { countMode: 'exact' } : {}),
          }));
          const batchResults = await invokeBatchBridge(batchQueries);
          const products: ReturnType<typeof mapLightweightToProduct>[] = [];
          let totalEstimate: number | null = null;
          let lastPageSize = 0;
          for (const result of batchResults) {
            if (result.success && result.data?.records) {
              products.push(...(result.data.records as LightweightProduct[]).map(mapLightweightToProduct));
              lastPageSize = result.data.records.length;
              if (result.data.count !== null && result.data.count !== undefined && totalEstimate === null) {
                totalEstimate = result.data.count as number;
              }
            }
          }
          return {
            products,
            nextOffset: lastPageSize === CATALOG_INITIAL_PAGE_SIZE ? CATALOG_BATCH_PAGES * CATALOG_INITIAL_PAGE_SIZE : null,
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
