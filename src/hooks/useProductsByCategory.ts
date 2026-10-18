import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseProductsByCategoryOptions {
  categoryIds: string[];
  includeDescendants?: boolean;
  enabled?: boolean;
}

interface UseProductsByCategoryResult {
  productIds: Set<string>;
  hasFilter: boolean;
  isLoading: boolean;
  error: string | null;
  hasData: boolean;
  categoriesCount: number;
  source: string | null;
  refetch: () => Promise<void>;
}

interface CategoryProductsResponse {
  productIds: string[];
  categoriesUsed?: number;
  source?: string | null;
}

async function loadCategoryProducts(categoryIds: string[], includeDescendants: boolean): Promise<CategoryProductsResponse> {
  const { data, error } = await supabase.functions.invoke('categories-api', {
    body: { action: 'products_by_categories', categoryIds, includeDescendants },
  });
  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Erro ao buscar produtos por categoria');
  return {
    productIds: data.productIds || [],
    categoriesUsed: data.categoriesUsed,
    source: data.source,
  };
}

function keepEmptyProductIds(current: Set<string>): Set<string> {
  return current.size === 0 ? current : new Set();
}

function shouldSkipCategoryFetch(force: boolean, currentKey: string, requestKey: string): boolean {
  return !force && currentKey === requestKey;
}

function shouldResetCategoryFilter(enabled: boolean, hasFilter: boolean): boolean {
  return !enabled || !hasFilter;
}

function categoryFetchErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido';
}

/**
 * Hook para buscar IDs de produtos vinculados a categorias via tabela relacional
 * Usa a tabela product_category_assignments (ou fallbacks)
 */
export function useProductsByCategory({
  categoryIds,
  includeDescendants = true,
  enabled = true,
}: UseProductsByCategoryOptions): UseProductsByCategoryResult {
  const [productIds, setProductIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [source, setSource] = useState<string | null>(null);
  
  const categoryIdsKey = useMemo(() => 
    categoryIds.length > 0 ? [...categoryIds].sort().join(',') : '', 
    [categoryIds]
  );
  const stableCategoryIds = useMemo(
    () => categoryIdsKey ? categoryIdsKey.split(',') : [],
    [categoryIdsKey],
  );
  
  const lastFetchedKey = useRef<string>('');
  const requestSequence = useRef(0);

  // Verificar se há filtro ativo
  const hasFilter = useMemo(() => {
    return categoryIds.length > 0;
  }, [categoryIds.length]);

  const requestKey = `${includeDescendants ? 'with-descendants' : 'direct'}:${categoryIdsKey}`;

  const fetchProductIds = useCallback(async (force = false) => {
    if (shouldSkipCategoryFetch(force, lastFetchedKey.current, requestKey)) return;
    if (shouldResetCategoryFilter(enabled, hasFilter)) {
      requestSequence.current += 1;
      setProductIds(keepEmptyProductIds);
      setCategoriesCount(0);
      setSource(null);
      lastFetchedKey.current = '';
      setIsLoading(false);
      return;
    }

    const requestId = ++requestSequence.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await loadCategoryProducts(stableCategoryIds, includeDescendants);
      if (requestId !== requestSequence.current) return;
      setProductIds(new Set(result.productIds));
      setCategoriesCount(result.categoriesUsed ?? stableCategoryIds.length);
      setSource(result.source ?? null);
      lastFetchedKey.current = requestKey;

    } catch (err) {
      if (requestId !== requestSequence.current) return;
      const message = categoryFetchErrorMessage(err);
      console.error('Erro ao buscar produtos por categoria:', err);
      setError(message);
    } finally {
      if (requestId === requestSequence.current) setIsLoading(false);
    }
  }, [enabled, hasFilter, includeDescendants, requestKey, stableCategoryIds]);

  // Buscar quando a chave de categorias muda
  useEffect(() => {
    if (requestKey !== lastFetchedKey.current || !hasFilter) {
      void fetchProductIds();
    }
  }, [requestKey, hasFilter, fetchProductIds]);

  useEffect(() => () => {
    requestSequence.current += 1;
  }, []);

  return {
    productIds,
    hasFilter,
    isLoading,
    error,
    hasData: lastFetchedKey.current === requestKey,
    categoriesCount,
    source,
    refetch: () => fetchProductIds(true),
  };
}

/**
 * Hook auxiliar para buscar descendentes de categorias
 */
export function useCategoryDescendants(categoryIds: string[]) {
  const [descendantIds, setDescendantIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (categoryIds.length === 0) {
      setDescendantIds([]);
      return;
    }

    const fetchDescendants = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('categories-api', {
          body: {
            action: 'descendants',
            categoryIds,
          },
        });

        if (!error && data.success) {
          setDescendantIds(data.data || []);
        }
      } catch (err) {
        console.error('Erro ao buscar descendentes:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDescendants();
  }, [categoryIds]);

  return { descendantIds, isLoading };
}
