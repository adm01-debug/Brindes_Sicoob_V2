import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { type FilterState, defaultFilters } from "@/components/filters/FilterPanel";
import { getDefaultColumns, type ColumnCount } from "@/components/products/ColumnSelector";
import { useProductsCatalog } from "@/hooks/useProductsLightweight";
import { useDebounce } from "@/hooks/useDebounce";
import { useProductsByMaterial } from "@/hooks/useProductsByMaterial";
import { useProductsByCategory } from "@/hooks/useProductsByCategory";
import { useProductsByColor } from "@/hooks/useProductsByColor";
import { useProductsByActivity, useProductsBySize, useProductsByTag, useProductsByTechnique } from "@/hooks/useCatalogRelationFilters";
import { useProductFuzzySearch } from "@/hooks/useProductFuzzySearch";
import { useColorEnrichment } from "@/hooks/useColorEnrichment";
import { usePromoSalesRanking } from "@/hooks/usePromoSalesRanking";
import { useSupplierSalesRanking } from "@/hooks/useSupplierSalesRanking";
import { toast } from "sonner";
import { useProductsContext } from "@/contexts/ProductsContext";
import {
  applyProductFilters,
  buildActiveFiltersSummary,
  catalogLoadingState,
  catalogSearchOptions,
  countActiveFilters,
  deserializeFilters,
  enrichFilteredProducts,
  firstSearchValue,
  serializeFilters,
} from "./filters-page-helpers";

export function useFiltersPageState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isInitialMount = useRef(true);
  const { registerProducts } = useProductsContext();

  // Deserialize filters from URL on mount
  const [filters, setFilters] = useState<FilterState>(() => deserializeFilters(searchParams, defaultFilters));

  const debouncedServerSearch = useDebounce(filters.search, 400);
  const urlSearch = firstSearchValue(searchParams.get('search') ?? '');
  const debouncedUrlSearch = useDebounce(urlSearch, 400);
  const serverSearchTerm = firstSearchValue(debouncedServerSearch, debouncedUrlSearch);

  const { data: catalogData, isLoading: isLoadingProducts, hasNextPage, fetchNextPage, isFetchingNextPage } = useProductsCatalog(catalogSearchOptions(serverSearchTerm));

  useEffect(() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const realProducts = useMemo(() => catalogData?.pages ? catalogData.pages.flatMap(page => page.products) : [], [catalogData]);
  useEffect(() => {
    if (realProducts.length > 0) registerProducts(realProducts);
  }, [realProducts, registerProducts]);
  const totalEstimate = catalogData?.pages?.[0]?.totalEstimate ?? null;
  const loadedCount = realProducts.length;
  const { isFullyLoaded, loadingProgress } = catalogLoadingState(hasNextPage, isFetchingNextPage, totalEstimate, loadedCount);

  // Serialize filters to URL
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    setSearchParams(serializeFilters(filters), { replace: true });
  }, [filters, setSearchParams]);

  const { productIds: materialFilteredProductIds, hasFilter: hasMaterialFilter, isLoading: isLoadingMaterialFilter } = useProductsByMaterial({ materialGroupSlugs: filters.materialGroups, materialTypeSlugs: filters.materialTypes });
  const { productIds: categoryFilteredProductIds, hasFilter: hasCategoryFilter, isLoading: isLoadingCategoryFilter } = useProductsByCategory({ categoryIds: filters.categories, includeDescendants: true });
  const { productIds: colorFilteredProductIds, hasFilter: hasColorFilter, isLoading: isLoadingColorFilter } = useProductsByColor({ colorGroups: filters.colorGroups, colorVariations: filters.colorVariations, colorNuances: filters.colorNuances, colors: filters.colors });
  const { productIds: tagFilteredProductIds, hasFilter: hasTagFilter, isLoading: isLoadingTagFilter } = useProductsByTag(filters.tags);
  const { productIds: techniqueFilteredProductIds, hasFilter: hasTechniqueFilter, isLoading: isLoadingTechniqueFilter } = useProductsByTechnique(filters.techniques);
  const { productIds: sizeFilteredProductIds, hasFilter: hasSizeFilter, isLoading: isLoadingSizeFilter } = useProductsBySize(filters.sizes);
  const { productIds: activityFilteredProductIds, hasFilter: hasActivityFilter, isLoading: isLoadingActivityFilter } = useProductsByActivity(filters.ramosAtividade, filters.segmentosAtividade);

  const [activePresetId, setActivePresetId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<"grid" | "list" | "table">("grid");
  const [selectionMode, setSelectionMode] = useState(false);
  const [gridColumns, setGridColumns] = useState<ColumnCount>(getDefaultColumns);
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [commandAction, setCommandAction] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<Array<{ type: "category" | "color" | "price" | "material" | "stock" | "featured" | "kit"; label: string }>>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  const filtersJson = JSON.stringify(filters);
  useEffect(() => { 
    setIsFiltering(true); 
    const timer = setTimeout(() => setIsFiltering(false), 200); 
    return () => clearTimeout(timer); 
  }, [filtersJson]);

  const sortBy = filters.sortBy;
  const setSortBy = useCallback((value: string) => { 
    setFilters(prev => (prev.sortBy === value ? prev : { ...prev, sortBy: value })); 
  }, []);

  // Brindes Sicoob sales ranking (lazy — only fetched when needed)
  const { data: promoSalesMap } = usePromoSalesRanking();
  const { data: supplierSalesMap } = useSupplierSalesRanking();

  const handleApplyPreset = (presetFilters: FilterState, presetId?: string) => { setFilters(presetFilters); setActivePresetId(presetId); };
  const handleFilterChange = (newFilters: FilterState) => { setFilters(newFilters); setActivePresetId(undefined); };

  const activeFiltersCount = useMemo(() => countActiveFilters(filters), [filters]);

  const handleReset = () => {
    const hadFilters = activeFiltersCount > 0;
    setFilters(defaultFilters);
    setActivePresetId(undefined);
    if (hadFilters) toast.success('Filtros limpos', { description: 'Todos os filtros foram removidos.' });
  };

  const searchQuery = firstSearchValue(searchParams.get('search') ?? '');
  const { results: fuzzySearchResults, hasSearch: hasFuzzySearch } = useProductFuzzySearch(realProducts, searchQuery);

  // Apply filters
  const filteredProducts = useMemo(() => {
    return applyProductFilters({
      filters,
      products: hasFuzzySearch ? [...fuzzySearchResults] : [...realProducts],
      materialIds: materialFilteredProductIds,
      categoryIds: categoryFilteredProductIds,
      colorIds: colorFilteredProductIds,
      hasMaterialFilter,
      hasCategoryFilter,
      hasColorFilter,
      loadingMaterial: isLoadingMaterialFilter,
      loadingCategory: isLoadingCategoryFilter,
      loadingColor: isLoadingColorFilter,
      tagIds: tagFilteredProductIds,
      techniqueIds: techniqueFilteredProductIds,
      sizeIds: sizeFilteredProductIds,
      activityIds: activityFilteredProductIds,
      hasTagFilter,
      hasTechniqueFilter,
      hasSizeFilter,
      hasActivityFilter,
      loadingTag: isLoadingTagFilter,
      loadingTechnique: isLoadingTechniqueFilter,
      loadingSize: isLoadingSizeFilter,
      loadingActivity: isLoadingActivityFilter,
      sortBy,
      promoSalesMap,
      supplierSalesMap,
      skipSort: hasFuzzySearch && sortBy === 'name',
    });
  }, [filters, sortBy, hasFuzzySearch, fuzzySearchResults, realProducts, hasMaterialFilter, materialFilteredProductIds, isLoadingMaterialFilter, hasCategoryFilter, categoryFilteredProductIds, isLoadingCategoryFilter, hasColorFilter, colorFilteredProductIds, isLoadingColorFilter, tagFilteredProductIds, hasTagFilter, isLoadingTagFilter, techniqueFilteredProductIds, hasTechniqueFilter, isLoadingTechniqueFilter, sizeFilteredProductIds, hasSizeFilter, isLoadingSizeFilter, activityFilteredProductIds, hasActivityFilter, isLoadingActivityFilter, promoSalesMap, supplierSalesMap]);

  // Color enrichment: fetch variant images/stock for filtered products when color filter is active
  const filteredProductIds = useMemo(() => filteredProducts.map(p => p.id), [filteredProducts]);
  const { data: colorEnrichmentMap } = useColorEnrichment({
    productIds: filteredProductIds,
    colorGroups: filters.colorGroups,
    colorVariations: filters.colorVariations,
  });

  // Merge color enrichment data into products
  const enrichedFilteredProducts = useMemo(() => {
    return enrichFilteredProducts(filteredProducts, colorEnrichmentMap, filters);
  }, [filteredProducts, colorEnrichmentMap, filters]);

  // Search toast
  const prevSearchRef = useRef<string>('');
  useEffect(() => {
    const currentSearch = filters.search;
    if (currentSearch && currentSearch !== prevSearchRef.current) {
      toast.info(`${enrichedFilteredProducts.length.toLocaleString('pt-BR')} produto${enrichedFilteredProducts.length !== 1 ? 's' : ''} encontrado${enrichedFilteredProducts.length !== 1 ? 's' : ''}`, { description: `Busca: "${currentSearch}"`, duration: 3000 });
    }
    prevSearchRef.current = currentSearch;
  }, [filters.search, enrichedFilteredProducts.length]);

  // Active filters summary
  const activeFiltersSummary = useMemo(() => buildActiveFiltersSummary(filters), [filters]);

  const clearSingleFilter = (key: keyof FilterState) => {
    if (key === "colors") setFilters({ ...filters, colors: [], colorGroups: [], colorVariations: [], colorNuances: [] });
    else if (key === "materiais") setFilters({ ...filters, materiais: [], materialGroups: [], materialTypes: [] });
    else if (key === "ramosAtividade") setFilters({ ...filters, ramosAtividade: [], segmentosAtividade: [] });
    else if (Array.isArray(filters[key])) setFilters({ ...filters, [key]: [] });
    else if (typeof filters[key] === "boolean") setFilters({ ...filters, [key]: false });
    setActivePresetId(undefined);
  };

  return {
    filters, setFilters, searchParams, realProducts, isLoadingProducts, isFullyLoaded, totalEstimate, loadedCount, loadingProgress,
    isLoadingMaterialFilter, isLoadingCategoryFilter, isLoadingColorFilter,
    isLoadingTagFilter, isLoadingTechniqueFilter, isLoadingSizeFilter,
    isLoadingActivityFilter,
    activePresetId, viewMode, setViewMode, gridColumns, setGridColumns,
    selectionMode, setSelectionMode,
    voiceOverlayOpen, setVoiceOverlayOpen, commandAction, setCommandAction,
    appliedFilters, setAppliedFilters, mobileFiltersOpen, setMobileFiltersOpen,
    isFiltering, sortBy, setSortBy, filteredProducts: enrichedFilteredProducts, activeFiltersCount,
    activeFiltersSummary, clearSingleFilter, handleReset, handleFilterChange, handleApplyPreset,
  };
}
