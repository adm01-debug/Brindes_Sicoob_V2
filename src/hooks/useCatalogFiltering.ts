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
  hasColorFilter: boolean;
  colorFilteredProductIds: Set<string>;
  isLoadingColorFilter: boolean;
  hasTagFilter: boolean;
  tagFilteredProductIds: Set<string>;
  isLoadingTagFilter: boolean;
  hasTechniqueFilter: boolean;
  techniqueFilteredProductIds: Set<string>;
  isLoadingTechniqueFilter: boolean;
  hasSizeFilter: boolean;
  sizeFilteredProductIds: Set<string>;
  isLoadingSizeFilter: boolean;
  hasActivityFilter: boolean;
  activityFilteredProductIds: Set<string>;
  isLoadingActivityFilter: boolean;
  hasMarketingFilter: boolean;
  marketingFilteredProductIds: Set<string>;
  isLoadingMarketingFilter: boolean;
  hasCommemorativeDateFilter: boolean;
  commemorativeDateProductIds: Set<string>;
  isLoadingCommemorativeDateFilter: boolean;
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
  hasColorFilter: boolean;
  colorFilteredProductIds: Set<string>;
  isLoadingColorFilter: boolean;
  hasTagFilter: boolean;
  tagFilteredProductIds: Set<string>;
  isLoadingTagFilter: boolean;
  hasTechniqueFilter: boolean;
  techniqueFilteredProductIds: Set<string>;
  isLoadingTechniqueFilter: boolean;
  hasSizeFilter: boolean;
  sizeFilteredProductIds: Set<string>;
  isLoadingSizeFilter: boolean;
  hasActivityFilter: boolean;
  activityFilteredProductIds: Set<string>;
  isLoadingActivityFilter: boolean;
  hasMarketingFilter: boolean;
  marketingFilteredProductIds: Set<string>;
  isLoadingMarketingFilter: boolean;
  hasCommemorativeDateFilter: boolean;
  commemorativeDateProductIds: Set<string>;
  isLoadingCommemorativeDateFilter: boolean;
}

function relationalIdFilter(products: Product[], active: boolean, ids: Set<string>, loading: boolean): Product[] {
  if (!active) return products;
  if (loading) return products;
  if (ids.size > 0) return products.filter(product => ids.has(product.id));
  return [];
}

function relationalCategoryFilter(products: Product[], context: CatalogFilterContext): Product[] {
  if (!context.hasCategoryFilter) return products;
  if (context.isLoadingCategoryFilter) return products;
  if (context.categoryFilteredProductIds.size > 0) return products.filter(product => context.categoryFilteredProductIds.has(product.id));
  return [];
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
  const normalized = new Set([...suppliers].map((supplier) => supplier.toLowerCase().trim()));
  return products.filter((product) => {
    const candidates = [
      product.supplier?.id,
      product.supplier?.name,
      product.brand,
      product.supplier_reference,
    ].filter((value): value is string => Boolean(value));
    return candidates.some((candidate) => normalized.has(candidate.toLowerCase().trim()));
  });
}

function priceFilter(products: Product[], range: FilterState['priceRange']): Product[] {
  if (range[0] <= 0 && range[1] >= 9999) return products;
  return products.filter(product => product.price >= range[0] && product.price <= range[1]);
}

function stockFilter(products: Product[], filters: FilterState): Product[] {
  let result = filters.inStock ? products.filter(product => (product.stock ?? 0) > 0) : products;
  if (filters.minStock > 0) {
    result = result.filter(product => product.variations?.length
      ? product.variations.some(variation => variation.stock >= filters.minStock)
      : product.stock >= filters.minStock);
  }
  return result;
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

function quickOptionsFilter(products: Product[], filters: FilterState): Product[] {
  let result = products;
  if (filters.isKit) result = result.filter(product => product.isKit);
  if (filters.featured) result = result.filter(product => product.featured);
  if (filters.isNew) result = result.filter(product => product.newArrival);
  if (filters.hasPersonalization) result = result.filter(product => product.allowsPersonalization === true);
  if (filters.hasCommercialPackaging) result = result.filter(product => product.hasCommercialPackaging === true);
  return result;
}

function applyCatalogFilters(products: Product[], context: CatalogFilterContext): Product[] {
  let result = relationalCategoryFilter(products, context);
  result = relationalIdFilter(result, context.hasColorFilter, context.colorFilteredProductIds, context.isLoadingColorFilter);
  result = relationalIdFilter(result, context.hasTagFilter, context.tagFilteredProductIds, context.isLoadingTagFilter);
  result = relationalIdFilter(result, context.hasTechniqueFilter, context.techniqueFilteredProductIds, context.isLoadingTechniqueFilter);
  result = relationalIdFilter(result, context.hasSizeFilter, context.sizeFilteredProductIds, context.isLoadingSizeFilter);
  result = relationalIdFilter(result, context.hasActivityFilter, context.activityFilteredProductIds, context.isLoadingActivityFilter);
  result = relationalIdFilter(result, context.hasMarketingFilter, context.marketingFilteredProductIds, context.isLoadingMarketingFilter);
  result = relationalIdFilter(result, context.hasCommemorativeDateFilter, context.commemorativeDateProductIds, context.isLoadingCommemorativeDateFilter);
  result = minimumQuantityFilter(result, context.filters.minQuantity);
  if (!context.hasColorFilter) {
    result = directColorFilter(result, context.colorFilterSet);
    result = colorGroupFilter(result, context.colorGroupSet);
    result = colorVariationFilter(result, context.colorVariationSet);
  }
  result = directCategoryFilter(result, context.categoryFilterSet);
  result = supplierFilter(result, context.supplierFilterSet);
  result = priceFilter(result, context.filters.priceRange);
  result = stockFilter(result, context.filters);
  result = genderFilter(result, context.genderFilterSet);
  result = relationalMaterialFilter(result, context);
  result = materialTextFilter(result, context);
  return quickOptionsFilter(result, context.filters);
}

export function useCatalogFiltering({
  realProducts, filters, sortBy, hasFuzzySearch, fuzzySearchResults,
  hasMaterialFilter, materialFilteredProductIds, isLoadingMaterialFilter,
  hasCategoryFilter, categoryFilteredProductIds, isLoadingCategoryFilter,
  hasColorFilter, colorFilteredProductIds, isLoadingColorFilter,
  hasTagFilter, tagFilteredProductIds, isLoadingTagFilter,
  hasTechniqueFilter, techniqueFilteredProductIds, isLoadingTechniqueFilter,
  hasSizeFilter, sizeFilteredProductIds, isLoadingSizeFilter,
  hasActivityFilter, activityFilteredProductIds, isLoadingActivityFilter,
  hasMarketingFilter, marketingFilteredProductIds, isLoadingMarketingFilter,
  hasCommemorativeDateFilter, commemorativeDateProductIds, isLoadingCommemorativeDateFilter,
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
      hasColorFilter, colorFilteredProductIds, isLoadingColorFilter,
      hasTagFilter, tagFilteredProductIds, isLoadingTagFilter,
      hasTechniqueFilter, techniqueFilteredProductIds, isLoadingTechniqueFilter,
      hasSizeFilter, sizeFilteredProductIds, isLoadingSizeFilter,
      hasActivityFilter, activityFilteredProductIds, isLoadingActivityFilter,
      hasMarketingFilter, marketingFilteredProductIds, isLoadingMarketingFilter,
      hasCommemorativeDateFilter, commemorativeDateProductIds, isLoadingCommemorativeDateFilter,
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
    hasColorFilter, colorFilteredProductIds, isLoadingColorFilter,
    hasTagFilter, tagFilteredProductIds, isLoadingTagFilter,
    hasTechniqueFilter, techniqueFilteredProductIds, isLoadingTechniqueFilter,
    hasSizeFilter, sizeFilteredProductIds, isLoadingSizeFilter,
    hasActivityFilter, activityFilteredProductIds, isLoadingActivityFilter,
    hasMarketingFilter, marketingFilteredProductIds, isLoadingMarketingFilter,
    hasCommemorativeDateFilter, commemorativeDateProductIds, isLoadingCommemorativeDateFilter,
    promoSalesMap, supplierSalesMap, colorFilterSet, colorGroupSet, colorVariationSet, 
    categoryFilterSet, supplierFilterSet, genderFilterSet
  ]);
}
