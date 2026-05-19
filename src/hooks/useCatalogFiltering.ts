/**
 * useCatalogFiltering — Filtering and sorting logic extracted from useCatalogState
 */
import { useMemo } from "react";
import type { Product } from "@/hooks/useProducts";
import type { FilterState } from "@/components/filters/FilterPanel";
import type { SortOption } from "./useCatalogState";
import { sortProducts } from "@/utils/product-sorting";

interface CatalogFilteringOptions {
  realProducts: Product[];
  filters: FilterState;
  sortBy: SortOption;
  hasFuzzySearch: boolean;
  fuzzySearchResults: Product[];
  hasMaterialFilter: boolean;
  materialFilteredProductIds: Set<string>;
  isLoadingMaterialFilter: boolean;
  hasCategoryFilter: boolean;
  categoryFilteredProductIds: Set<string>;
  isLoadingCategoryFilter: boolean;
  promoSalesMap?: Map<string, number>;
  supplierSalesMap?: Map<string, number>;
}

export function useCatalogFiltering({
  realProducts, filters, sortBy, hasFuzzySearch, fuzzySearchResults,
  hasMaterialFilter, materialFilteredProductIds, isLoadingMaterialFilter,
  hasCategoryFilter, categoryFilteredProductIds, isLoadingCategoryFilter,
  promoSalesMap, supplierSalesMap,
}: CatalogFilteringOptions): Product[] {
  // Otimização: Memoizamos conjuntos de filtros para lookup O(1)
  const colorFilterSet = useMemo(() => new Set(filters.colors), [filters.colors]);
  const colorGroupSet = useMemo(() => new Set(filters.colorGroups), [filters.colorGroups]);
  const colorVariationSet = useMemo(() => new Set(filters.colorVariations), [filters.colorVariations]);
  const categoryFilterSet = useMemo(() => new Set(filters.categories.map(String)), [filters.categories]);
  const supplierFilterSet = useMemo(() => new Set(filters.suppliers), [filters.suppliers]);
  const genderFilterSet = useMemo(() => new Set(filters.gender?.map(g => g.toLowerCase().trim())), [filters.gender]);

  return useMemo(() => {
    let result = hasFuzzySearch ? [...fuzzySearchResults] : [...realProducts];

    if (result.length === 0) return result;

    if (hasCategoryFilter && categoryFilteredProductIds.size > 0) {
      result = result.filter((p) => categoryFilteredProductIds.has(p.id));
    } else if (hasCategoryFilter && categoryFilteredProductIds.size === 0 && !isLoadingCategoryFilter) {
      return [];
    }

    // New Sicoob Theme Filter
    if (filters.sicoobThemes?.length > 0) {
      const selectedThemes = new Set(filters.sicoobThemes.map(t => t.toLowerCase()));
      result = result.filter(p => {
        const pThemes = (p.tags?.temas || []).map((t: string) => t.toLowerCase());
        return pThemes.some(t => selectedThemes.has(t));
      });
    }

    // New Minimum Quantity Filter
    if (filters.minQuantity && filters.minQuantity > 0) {
      result = result.filter(p => {
        const minQ = (p as any).min_quantity || 0;
        return minQ <= filters.minQuantity!;
      });
    }

    if (colorFilterSet.size > 0) {
      result = result.filter((p) =>
        p.colors?.some((c: Record<string, string>) => colorFilterSet.has(c.name))
      );
    }

    if (colorGroupSet.size > 0) {
      const lowerGroupFilters = Array.from(colorGroupSet).map(s => s.toLowerCase());
      result = result.filter((p) =>
        p.colors?.some((c: Record<string, string>) => {
          const groupSlug = (c.groupSlug || '').toLowerCase().trim();
          const group = (c.group || '').toLowerCase().trim();
          if (colorGroupSet.has(groupSlug) || colorGroupSet.has(group)) return true;
          
          const name = (c.name || '').toLowerCase().trim();
          return lowerGroupFilters.some(s => name.includes(s));
        })
      );
    }

    if (colorVariationSet.size > 0) {
      result = result.filter((p) =>
        p.colors?.some((c: Record<string, string>) => {
          const variationSlug = (c.variationSlug || '').toLowerCase().trim();
          return colorVariationSet.has(variationSlug);
        })
      );
    }

    if (categoryFilterSet.size > 0) {
      result = result.filter((p) => categoryFilterSet.has(p.category_id || ''));
    }

    if (supplierFilterSet.size > 0) {
      result = result.filter((p) =>
        supplierFilterSet.has(p.brand || '') ||
        supplierFilterSet.has(p.supplier_reference || '')
      );
    }

    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 500) {
      result = result.filter((p) => p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]);
    }

    if (filters.inStock) {
      result = result.filter((p) => {
        const stock = (p as any).stock_quantity ?? p.stock ?? 0;
        return stock > 0;
      });
    }

    if (genderFilterSet.size > 0) {
      result = result.filter((p) => {
        const productGender = (p.gender || '').toLowerCase().trim();
        return genderFilterSet.has(productGender);
      });
    }

    if (hasMaterialFilter && materialFilteredProductIds.size > 0) {
      result = result.filter((p) => materialFilteredProductIds.has(p.id));
    } else if (hasMaterialFilter && materialFilteredProductIds.size === 0 && !isLoadingMaterialFilter) {
      return [];
    }

    // Filtro por termo de produto (fallback legível do filtro de materiais)
    if (!hasMaterialFilter && filters.materiais.length) {
      const lowerMateriais = filters.materiais.map(m => m.toLowerCase());
      result = result.filter((p) => {
        const materialsStr = Array.isArray(p.materials) ? p.materials.join(' ').toLowerCase() : (p.materials || '').toLowerCase();
        return lowerMateriais.some((m) => materialsStr.includes(m));
      });
    }

    // ⚠️ REGRA DE NEGÓCIO — NÃO ALTERAR
    const skipSort = hasFuzzySearch && sortBy === 'name';
    sortProducts(result, sortBy, { promoSalesMap, supplierSalesMap, skipSort });

    return result;
  }, [
    filters.sicoobThemes, filters.minQuantity,
    filters, sortBy, hasFuzzySearch, fuzzySearchResults, realProducts, 
    hasMaterialFilter, materialFilteredProductIds, isLoadingMaterialFilter, 
    hasCategoryFilter, categoryFilteredProductIds, isLoadingCategoryFilter, 
    promoSalesMap, supplierSalesMap, colorFilterSet, colorGroupSet, colorVariationSet, 
    categoryFilterSet, supplierFilterSet, genderFilterSet
  ]);
}
