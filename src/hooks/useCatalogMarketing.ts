import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PAGE_SIZE = 1000;
const MAX_PAGES = 100;

export type CatalogMarketingCategory = 'publico_alvo' | 'endomarketing' | 'tema_sicoob';

export interface CatalogMarketingOption {
  id: string;
  category: CatalogMarketingCategory;
  slug: string;
  name: string;
  description: string | null;
  productCount: number;
}

function normalized(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function selectedValues(values: string[] = []): string[] {
  return [...new Set(values.map(normalized).filter(Boolean))].sort();
}

function termMatches(term: { slug: string; name: string }, wanted: Set<string>): boolean {
  return [term.slug, term.name].some((value) => wanted.has(normalized(value)));
}

async function fetchProductIdsForTerms(termIds: string[]): Promise<string[]> {
  const productIds = new Set<string>();
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const start = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from('catalog_product_marketing')
      .select('product_id')
      .in('term_id', termIds)
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw error;
    for (const row of data ?? []) productIds.add(row.product_id);
    if ((data?.length ?? 0) < PAGE_SIZE) return [...productIds];
  }
  throw new Error(`Classificações de marketing excederam ${MAX_PAGES * PAGE_SIZE} vínculos`);
}

export async function fetchCatalogMarketingOptions(
  category: CatalogMarketingCategory,
  includeUnused = false,
): Promise<CatalogMarketingOption[]> {
  let query = supabase
    .from('catalog_marketing_term_usage')
    .select('id,category,slug,name,description,sort_order,product_count')
    .eq('category', category)
    .order('sort_order')
    .order('name');
  if (!includeUnused) query = query.gt('product_count', 0);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).flatMap((term) => {
    if (!term.id || !term.category || !term.slug || !term.name) return [];
    return [{
      id: term.id,
      category: term.category as CatalogMarketingCategory,
      slug: term.slug,
      name: term.name,
      description: term.description,
      productCount: Number(term.product_count ?? 0),
    }];
  });
}

export async function fetchCatalogMarketingProductIds(
  category: CatalogMarketingCategory,
  values: string[],
): Promise<string[]> {
  const wanted = new Set(selectedValues(values));
  if (!wanted.size) return [];

  const { data: terms, error: termsError } = await supabase
    .from('catalog_marketing_terms')
    .select('id,slug,name')
    .eq('category', category)
    .eq('is_active', true);
  if (termsError) throw termsError;

  const termIds = (terms ?? [])
    .filter((term) => termMatches(term, wanted))
    .map((term) => term.id);
  if (!termIds.length) return [];
  return fetchProductIdsForTerms(termIds);
}

function useCategoryProductIds(category: CatalogMarketingCategory, values: string[]) {
  const valuesKey = selectedValues(values).join(',');
  const stableValues = useMemo(() => valuesKey ? valuesKey.split(',') : [], [valuesKey]);
  return useQuery({
    queryKey: ['catalog-marketing-products', category, valuesKey],
    queryFn: () => fetchCatalogMarketingProductIds(category, stableValues),
    enabled: stableValues.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });
}

function intersectProductIds(sets: Set<string>[]): Set<string> {
  if (!sets.length) return new Set();
  const [first, ...rest] = sets.sort((a, b) => a.size - b.size);
  return new Set([...first].filter((productId) => rest.every((set) => set.has(productId))));
}

export function useCatalogMarketingProductFilter({
  publicoAlvo = [],
  endomarketing = [],
  temas = [],
}: {
  publicoAlvo?: string[];
  endomarketing?: string[];
  temas?: string[];
}) {
  const publico = useCategoryProductIds('publico_alvo', publicoAlvo);
  const endo = useCategoryProductIds('endomarketing', endomarketing);
  const tema = useCategoryProductIds('tema_sicoob', temas);
  const activeQueries = [
    publicoAlvo.length ? publico : null,
    endomarketing.length ? endo : null,
    temas.length ? tema : null,
  ].filter((query): query is typeof publico => query !== null);
  const isLoading = activeQueries.some((query) => query.isPending || query.isFetching);
  const error = activeQueries.find((query) => query.error)?.error ?? null;
  const productIds = useMemo(
    () => intersectProductIds(activeQueries.map((query) => new Set(query.data ?? []))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [publico.data, endo.data, tema.data, publicoAlvo.length, endomarketing.length, temas.length],
  );
  return {
    productIds,
    hasFilter: activeQueries.length > 0,
    isLoading,
    error: error instanceof Error ? error : null,
  };
}

export function useCatalogMarketingOptions(category: CatalogMarketingCategory, includeUnused = false) {
  return useQuery({
    queryKey: ['catalog-marketing-options', category, includeUnused],
    queryFn: () => fetchCatalogMarketingOptions(category, includeUnused),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });
}
