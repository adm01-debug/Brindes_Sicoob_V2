/**
 * useCatalogFiltering — Filtering and sorting logic extracted from useCatalogState
 */
import { useMemo } from "react";
import type { Product, ProductColor } from "@/hooks/useProducts";
import type { FilterState } from "@/components/filters/FilterPanel";
import type { SortOption } from "./useCatalogState";
import { sortProducts } from "@/utils/product-sorting";
import type { SupplierSalesEntry } from "@/hooks/useSupplierSalesRanking";

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
  supplierSalesMap?: Map<string, SupplierSalesEntry>;
}

interface CatalogFilterContext {
  filters: FilterState;
  colorFilterSet: Set<string>;
  colorGroupSet: Set<string>;
  colorVariationSet: Set<string>;
  categoryFilterSet: Set<string>;
  supplierFilterSet: Set<string>;
  genderFilterSet: Set<string>;
  hasMaterialFilter: boolean;
  materialFilteredProductIds: Set<string>;
  isLoadingMaterialFilter: boolean;
  hasCategoryFilter: boolean;
  categoryFilteredProductIds: Set<string>;
  isLoadingCategoryFilter: boolean;
}

function relationalCategoryFilter(products: Product[], context: CatalogFilterContext): Product[] {
  if (!context.hasCategoryFilter) return products;
  if (context.categoryFilteredProductIds.size > 0) return products.filter(product => context.categoryFilteredProductIds.has(product.id));
  return context.isLoadingCategoryFilter ? products : [];
}

function themeFilter(products: Product[], filters: FilterState): Product[] {
  if (!filters.sicoobThemes?.length) return products;
  const selected = new Set(filters.sicoobThemes.map(theme => theme.toLowerCase()));
  return products.filter(product => (product.tags?.temas || []).some(theme => selected.has(theme.toLowerCase())));
}

function minimumQuantityFilter(products: Product[], minimum?: number): Product[] {
  if (!minimum || minimum <= 0) return products;
  return products.filter(product => (product.minQuantity || 0) <= minimum);
}

function directColorFilter(products: Product[], selected: Set<string>): Product[] {
  if (selected.size === 0) return products;
  return products.filter(product => product.colors?.some(color => selected.has(color.name)));
}

function colorMatchesGroup(color: ProductColor, groups: Set<string>, normalizedGroups: string[]): boolean {
  const groupSlug = (color.groupSlug || '').toLowerCase().trim();
  const group = (color.group || '').toLowerCase().trim();
  if (groups.has(groupSlug) || groups.has(group)) return true;
  const name = (color.name || '').toLowerCase().trim();
  return normalizedGroups.some(candidate => name.includes(candidate));
}

function colorGroupFilter(products: Product[], groups: Set<string>): Product[] {
  if (groups.size === 0) return products;
  const normalized = Array.from(groups).map(group => group.toLowerCase());
  return products.filter(product => product.colors?.some(color => colorMatchesGroup(color, groups, normalized)));
}

function colorVariationFilter(products: Product[], variations: Set<string>): Product[] {
  if (variations.size === 0) return products;
  return products.filter(product => product.colors?.some(color => variations.has((color.variationSlug || '').toLowerCase().trim())));
}

function directCategoryFilter(products: Product[], categories: Set<string>): Product[] {
  return categories.size > 0 ? products.filter(product => categories.has(product.category_id || '')) : products;
}

function supplierFilter(products: Product[], suppliers: Set<string>): Product[] {
  if (suppliers.size === 0) return products;
  return products.filter(product => suppliers.has(product.brand || '') || suppliers.has(product.supplier_reference || ''));
}

function priceFilter(products: Product[], range: FilterState['priceRange']): Product[] {
  if (range[0] <= 0 && range[1] >= 500) return products;
  return products.filter(product => product.price >= range[0] && product.price <= range[1]);
}

function stockFilter(products: Product[], inStock: boolean): Product[] {
  return inStock ? products.filter(product => (product.stock ?? 0) > 0) : products;
}

function genderFilter(products: Product[], genders: Set<string>): Product[] {
  if (genders.size === 0) return products;
  return products.filter(product => genders.has((product.gender || '').toLowerCase().trim()));
}

function relationalMaterialFilter(products: Product[], context: CatalogFilterContext): Product[] {
  if (!context.hasMaterialFilter) return products;
  if (context.materialFilteredProductIds.size > 0) return products.filter(product => context.materialFilteredProductIds.has(product.id));
  return context.isLoadingMaterialFilter ? products : [];
}

function materialTextFilter(products: Product[], context: CatalogFilterContext): Product[] {
  if (context.hasMaterialFilter || context.filters.materiais.length === 0) return products;
  const selected = context.filters.materiais.map(material => material.toLowerCase());
  return products.filter(product => {
    const rawMaterials: unknown = product.materials;
    const text = Array.isArray(rawMaterials) ? rawMaterials.join(' ').toLowerCase() : String(rawMaterials || '').toLowerCase();
    return selected.some(material => text.includes(material));
  });
}

function applyCatalogFilters(products: Product[], context: CatalogFilterContext): Product[] {
  let result = relationalCategoryFilter(products, context);
  result = themeFilter(result, context.filters);
  result = minimumQuantityFilter(result, context.filters.minQuantity);
  result = directColorFilter(result, context.colorFilterSet);
  result = colorGroupFilter(result, context.colorGroupSet);
  result = colorVariationFilter(result, context.colorVariationSet);
  result = directCategoryFilter(result, context.categoryFilterSet);
  result = supplierFilter(result, context.supplierFilterSet);
  result = priceFilter(result, context.filters.priceRange);
  result = stockFilter(result, context.filters.inStock);
  result = genderFilter(result, context.genderFilterSet);
  result = relationalMaterialFilter(result, context);
  return materialTextFilter(result, context);
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
    const initial = hasFuzzySearch ? [...fuzzySearchResults] : [...realProducts];
    const context: CatalogFilterContext = {
      filters, colorFilterSet, colorGroupSet, colorVariationSet, categoryFilterSet, supplierFilterSet, genderFilterSet,
      hasMaterialFilter, materialFilteredProductIds, isLoadingMaterialFilter,
      hasCategoryFilter, categoryFilteredProductIds, isLoadingCategoryFilter,
    };
    const result = applyCatalogFilters(initial, context);

    // ⚠️ REGRA DE NEGÓCIO — NÃO ALTERAR — Ordem técnica Portal Sicoob
    const skipSort = hasFuzzySearch && sortBy === 'name';
    sortProducts(result, sortBy, { promoSalesMap, supplierSalesMap, skipSort });

    return result;
  }, [
    filters, sortBy, hasFuzzySearch, fuzzySearchResults, realProducts, 
    hasMaterialFilter, materialFilteredProductIds, isLoadingMaterialFilter, 
    hasCategoryFilter, categoryFilteredProductIds, isLoadingCategoryFilter, 
    promoSalesMap, supplierSalesMap, colorFilterSet, colorGroupSet, colorVariationSet, 
    categoryFilterSet, supplierFilterSet, genderFilterSet
  ]);
}
