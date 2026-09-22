/**
 * useProducts — Product data hooks
 * 
 * Hooks for fetching products from the external catalog.
 * Types and utilities are extracted to dedicated modules but
 * re-exported here for backward compatibility with 29+ consumers.
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { fetchPromobrindProducts, fetchPromobrindProductById } from '@/lib/external-db';

// Re-export types (backward compat — consumers import from '@/hooks/useProducts')
export type { Product, ProductColor, ProductFilters } from '@/types/product-catalog';

// Re-export utilities
export { findKnownHex } from '@/utils/product-colors';
export { mapPromobrindToProduct } from '@/utils/product-mapper';

import type { Product, ProductFilters } from '@/types/product-catalog';
import { mapPromobrindToProduct } from '@/utils/product-mapper';

function shouldRetryCatalog(failureCount: number, error: Error, maximum: number): boolean {
  return failureCount < maximum && !/CATALOG_NOT_CONFIGURED|CATALOG_READ_ONLY/.test(error.message);
}

/**
 * Hook para buscar todos os produtos do catálogo externo.
 */
export function useProducts(
  filters?: ProductFilters,
  options?: Omit<UseQueryOptions<Product[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Product[]>({
    queryKey: ['promobrind-products', filters],
    queryFn: async () => {
      const products = await fetchPromobrindProducts({
        search: filters?.search,
        limit: filters?.limit ?? 50,
      });

      let result = products.map(mapPromobrindToProduct);

      // Relevância simples no frontend (se houver termo de busca)
      if (filters?.search) {
        const term = filters.search.toLowerCase();
        result.sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          
          const aStartsWith = aName.startsWith(term);
          const bStartsWith = bName.startsWith(term);
          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;
          
          const aIncludes = aName.includes(term);
          const bIncludes = bName.includes(term);
          if (aIncludes && !bIncludes) return -1;
          if (!aIncludes && bIncludes) return 1;
          
          return aName.localeCompare(bName);
        });
      }

      if (filters?.category) {
        result = result.filter(p =>
          p.category_name?.toLowerCase().includes(filters.category!.toLowerCase()) ||
          p.category_id === filters.category ||
          p.category?.id?.toString() === filters.category
        );
      }
      if (filters?.minPrice !== undefined) {
        result = result.filter(p => p.price >= filters.minPrice!);
      }
      if (filters?.maxPrice !== undefined) {
        result = result.filter(p => p.price <= filters.maxPrice!);
      }
      if (filters?.inStock) {
        result = result.filter(p => (p.stock || 0) > 0);
      }

      return result;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => shouldRetryCatalog(failureCount, error, 3),
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook para buscar um produto específico por ID.
 */
export function useProduct(id: string) {
  return useQuery<Product | null>({
    queryKey: ['promobrind-product', id],
    queryFn: async () => {
      const product = await fetchPromobrindProductById(id);
      return product ? mapPromobrindToProduct(product) : null;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => shouldRetryCatalog(failureCount, error, 2),
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    enabled: !!id,
  });
}

/**
 * Hook leve para produtos relacionados (mesmo fornecedor ou categoria).
 */
export function useRelatedProducts(product: Product | null | undefined, limit = 20) {
  const supplierId = product?.supplier?.id;
  const categoryId = product?.category_id;
  const productId = product?.id;

  return useQuery<Product[]>({
    queryKey: ['related-products', productId, supplierId, categoryId],
    queryFn: async () => {
      const filters: Record<string, unknown> = {};
      if (supplierId && supplierId !== 'unknown') {
        filters.supplier_id = supplierId;
      } else if (categoryId) {
        filters.main_category_id = categoryId;
      }

      const raw = await fetchPromobrindProducts({
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        limit: limit + 1,
        orderBy: { column: 'name', ascending: true },
      });

      return raw
        .map(mapPromobrindToProduct)
        .filter(p => p.id !== productId)
        .slice(0, limit);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!product,
  });
}
