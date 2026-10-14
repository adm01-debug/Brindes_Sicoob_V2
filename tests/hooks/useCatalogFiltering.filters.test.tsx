import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { defaultFilters } from '@/components/filters/FilterPanel';
import { useCatalogFiltering } from '@/hooks/useCatalogFiltering';
import type { Product } from '@/types/product-catalog';

function product(id: string, overrides: Partial<Product> = {}): Product {
  return {
    id,
    name: id,
    sku: id,
    price: 10,
    images: [],
    stock: 10,
    colors: [],
    materials: [],
    minQuantity: 1,
    stockStatus: 'in-stock',
    featured: false,
    newArrival: false,
    onSale: false,
    isKit: false,
    category: { id: 'categoria', name: 'Categoria' },
    supplier: { id: 'fornecedor', name: 'Fornecedor' },
    tags: { publicoAlvo: [], datasComemorativas: [], endomarketing: [], ramo: [], nicho: [] },
    ...overrides,
  };
}

function options(
  overrides: Partial<Parameters<typeof useCatalogFiltering>[0]> = {},
): Parameters<typeof useCatalogFiltering>[0] {
  return {
    realProducts: [
      product('A', { featured: true, allowsPersonalization: true }),
      product('B', { hasCommercialPackaging: true }),
    ],
    filters: defaultFilters,
    sortBy: 'name' as const,
    hasFuzzySearch: false,
    fuzzySearchResults: [],
    hasMaterialFilter: false,
    materialFilteredProductIds: new Set<string>(),
    isLoadingMaterialFilter: false,
    hasCategoryFilter: false,
    categoryFilteredProductIds: new Set<string>(),
    isLoadingCategoryFilter: false,
    hasColorFilter: false,
    colorFilteredProductIds: new Set<string>(),
    isLoadingColorFilter: false,
    hasTagFilter: false,
    tagFilteredProductIds: new Set<string>(),
    isLoadingTagFilter: false,
    hasTechniqueFilter: false,
    techniqueFilteredProductIds: new Set<string>(),
    isLoadingTechniqueFilter: false,
    hasSizeFilter: false,
    sizeFilteredProductIds: new Set<string>(),
    isLoadingSizeFilter: false,
    hasActivityFilter: false,
    activityFilteredProductIds: new Set<string>(),
    isLoadingActivityFilter: false,
    hasMarketingFilter: false,
    marketingFilteredProductIds: new Set<string>(),
    isLoadingMarketingFilter: false,
    hasCommemorativeDateFilter: false,
    commemorativeDateProductIds: new Set<string>(),
    isLoadingCommemorativeDateFilter: false,
    ...overrides,
  };
}

describe('filtros da vitrine principal', () => {
  it('aplica atributos diretos carregados pelo contrato leve', () => {
    const { result } = renderHook(() => useCatalogFiltering(options({
      filters: { ...defaultFilters, featured: true, hasPersonalization: true },
    })));
    expect(result.current.map((item) => item.id)).toEqual(['A']);
  });

  it('usa o conjunto relacional em filtros sem atributos embutidos', () => {
    const { result } = renderHook(() => useCatalogFiltering(options({
      hasTagFilter: true,
      tagFilteredProductIds: new Set(['B']),
    })));
    expect(result.current.map((item) => item.id)).toEqual(['B']);
  });

  it('combina curadoria editorial e data comemorativa com interseção', () => {
    const { result } = renderHook(() => useCatalogFiltering(options({
      hasMarketingFilter: true,
      marketingFilteredProductIds: new Set(['A', 'B']),
      hasCommemorativeDateFilter: true,
      commemorativeDateProductIds: new Set(['B']),
    })));
    expect(result.current.map((item) => item.id)).toEqual(['B']);
  });

  it('aplica limite superior de preço abaixo do teto padrão', () => {
    const { result } = renderHook(() => useCatalogFiltering(options({
      realProducts: [product('A', { price: 750 }), product('B', { price: 1_250 })],
      filters: { ...defaultFilters, priceRange: [0, 900] },
    })));

    expect(result.current.map((item) => item.id)).toEqual(['A']);
  });
});
