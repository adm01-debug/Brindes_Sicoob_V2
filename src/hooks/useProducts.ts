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

function compareSearchRelevance(first: Product, second: Product, term: string): number {
  const firstName = first.name.toLowerCase();
  const secondName = second.name.toLowerCase();
  const firstStarts = firstName.startsWith(term);
  const secondStarts = secondName.startsWith(term);
  if (firstStarts !== secondStarts) return firstStarts ? -1 : 1;
  const firstIncludes = firstName.includes(term);
  const secondIncludes = secondName.includes(term);
  if (firstIncludes !== secondIncludes) return firstIncludes ? -1 : 1;
  return firstName.localeCompare(secondName);
}

function matchesCategory(product: Product, category: string): boolean {
  const normalized = category.toLowerCase();
  return (
    Boolean(product.category_name?.toLowerCase().includes(normalized)) ||
    product.category_id === category ||
    product.category?.id?.toString() === category
  );
}

function applyProductFilters(products: Product[], filters?: ProductFilters): Product[] {
  const sorted = sortProductsBySearch(products, filters?.search);
  const byCategory = filterByCategory(sorted, filters?.category);
  const byMinimum = filterByMinimumPrice(byCategory, filters?.minPrice);
  const byMaximum = filterByMaximumPrice(byMinimum, filters?.maxPrice);
  return filters?.inStock ? byMaximum.filter((product) => (product.stock || 0) > 0) : byMaximum;
}

function sortProductsBySearch(products: Product[], search?: string): Product[] {
  if (!search) return [...products];
  const normalizedSearch = search.toLowerCase();
  return [...products].sort((first, second) =>
    compareSearchRelevance(first, second, normalizedSearch),
  );
}

function filterByCategory(products: Product[], category?: string): Product[] {
  return category ? products.filter((product) => matchesCategory(product, category)) : products;
}

function filterByMinimumPrice(products: Product[], minimum?: number): Product[] {
  return minimum === undefined ? products : products.filter((product) => product.price >= minimum);
}

function filterByMaximumPrice(products: Product[], maximum?: number): Product[] {
  return maximum === undefined ? products : products.filter((product) => product.price <= maximum);
}

/**
 * Hook para buscar todos os produtos do catálogo externo.
 */
export function useProducts(
  filters?: ProductFilters,
  options?: Omit<UseQueryOptions<Product[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Product[]>({
    queryKey: ['promobrind-products', filters],
    queryFn: async () => {
      const products = await fetchPromobrindProducts({
        search: filters?.search,
        limit: filters?.limit ?? 50,
      });

      return applyProductFilters(products.map(mapPromobrindToProduct), filters);
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
        .filter((p) => p.id !== productId)
        .slice(0, limit);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!product,
  });
}
