/**
 * useCatalogState — Orchestrates catalog page state & logic.
 * Unified architecture for the Sicoob Portal.
 */
import { useState, useMemo, useEffect, useCallback, useTransition, type MouseEvent } from "react";
import { useColorEnrichment } from "@/hooks/useColorEnrichment";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProductsCatalog } from "@/hooks/useProductsLightweight";
import type { Product } from "@/hooks/useProducts";
import { useProductsContext } from "@/contexts/ProductsContext";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useFavoriteQuickAdd } from "@/hooks/useFavoriteQuickAdd";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { useProductsByMaterial } from "@/hooks/useProductsByMaterial";
import { useProductFuzzySearch } from "@/hooks/useProductFuzzySearch";
import { useProductsByCategory } from "@/hooks/useProductsByCategory";
import { useProductsByColor } from "@/hooks/useProductsByColor";
import { useProductsByActivity, useProductsBySize, useProductsByTag, useProductsByTechnique } from "@/hooks/useCatalogRelationFilters";
import { useCatalogMarketingProductFilter } from '@/hooks/useCatalogMarketing';
import { useProductsByCommemorativeDates } from '@/hooks/useCommemorativeDates';
import { useDebounce } from "@/hooks/useDebounce";
import { useCatalogRealStats } from "@/hooks/useCatalogRealStats";
import { useToast } from "@/hooks/use-toast";
import { usePromoSalesRanking } from "@/hooks/usePromoSalesRanking";
import { useSupplierSalesRanking } from "@/hooks/useSupplierSalesRanking";
import { useCatalogFiltering } from "./useCatalogFiltering";
import { useNoveltyProductIds } from "@/hooks/useNovelties";

// Specialized hooks
import { useCatalogDisplay, type ViewMode, type SortOption } from "./catalog/useCatalogDisplay";
import { useCatalogFilters } from "./catalog/useCatalogFilters";
import { useCatalogPagination, ITEMS_PER_PAGE } from "./catalog/useCatalogPagination";
import { useCatalogSearchState } from "./catalog/useCatalogSearchState";
import { useCatalogSelectionState } from "./catalog/useCatalogSelectionState";
import { useCatalogStats } from "./catalog/useCatalogStats";
import { defaultFilters } from "@/components/filters/FilterPanel";
import { useAuth } from "@/contexts/AuthContext";
import { canApplyCatalogFilter } from "@/lib/catalog-filter-state";

export type { ViewMode, SortOption };

type ColorEnrichmentMap = NonNullable<ReturnType<typeof useColorEnrichment>['data']>;
type ColorEnrichment = ColorEnrichmentMap extends Map<string, infer Value> ? Value : never;

function textOrEmpty(value: string | null): string {
  return value || '';
}

function listOrEmpty<T>(value: T[] | null | undefined): T[] {
  return value || [];
}

function buildSearchHistoryScope(
  userId: string | undefined,
  cooperativaId: string | null | undefined,
  paId: string | null | undefined,
): string {
  if (!userId) return 'public';
  return `user:${userId}:cooperativa:${cooperativaId || 'none'}:pa:${paId || 'none'}`;
}

function hasActiveColorFilter(colorGroups?: string[], colorVariations?: string[]): boolean {
  return Boolean(colorGroups?.length || colorVariations?.length);
}

function addColorEnrichment(
  product: Product,
  enrichment: ColorEnrichment,
  colorGroups?: string[],
  colorVariations?: string[],
): Product {
  const imageFields = enrichment.image ? {
    og_image_url: enrichment.image,
    images: [enrichment.image, ...product.images.filter(image => image !== enrichment.image)],
  } : {};
  const colors = enrichment.colorName ? [{
    name: enrichment.colorName,
    hex: enrichment.colorHex || '#CCCCCC',
    group: enrichment.colorName,
    groupSlug: colorGroups?.[0] || undefined,
    variationSlug: colorVariations?.[0] || undefined,
    image: enrichment.image || undefined,
    images: enrichment.image ? [enrichment.image] : undefined,
  }] : product.colors;
  return { ...product, ...imageFields, stock: enrichment.stock, stockStatus: enrichment.stockStatus, colors };
}

function enrichCatalogProducts(
  products: Product[],
  enrichmentMap: ColorEnrichmentMap | undefined,
  hasColorFilter: boolean,
  ...colors: [colorGroups?: string[], colorVariations?: string[]]
): Product[] {
  const [colorGroups, colorVariations] = colors;
  if (!enrichmentMap || enrichmentMap.size === 0 || !hasColorFilter) return products;
  return products.map(product => {
    const enrichment = enrichmentMap.get(product.id);
    return enrichment ? addColorEnrichment(product, enrichment, colorGroups, colorVariations) : product;
  });
}

function catalogLoadingState(
  isLoadingProducts: boolean,
  isFetchingProducts: boolean,
  isLoadingMaterial: boolean,
  ...state: [isLoadingCategory: boolean, productCount: number]
) {
  const [isLoadingCategory, productCount] = state;
  const isLoading = isLoadingProducts || isLoadingMaterial || isLoadingCategory;
  return { isLoading, isInitial: (isLoadingProducts || isFetchingProducts) && productCount === 0 };
}

function catalogSearchOptions(search: string): { search: string } | undefined {
  return search ? { search } : undefined;
}

function nullableNumber(value: number | null | undefined): number | null {
  return value ?? null;
}

function catalogVisibility(
  initialLoading: boolean,
  loading: boolean,
  loadingProducts: boolean,
  ...state: [
    fetchingProducts: boolean,
    error: unknown,
    visibleCount: number,
    activeFilterCount: number,
    search: string,
  ]
) {
  const [fetchingProducts, error, visibleCount, activeFilterCount, search] = state;
  const empty = visibleCount === 0;
  const fullyLoaded = !loadingProducts && !fetchingProducts && !loading;
  return {
    shouldShowCatalogSkeleton: initialLoading || (loading && empty),
    hasActiveCatalogConstraints: activeFilterCount > 0 || search.trim().length > 0,
    shouldShowEmptyState: fullyLoaded && !error && empty,
  };
}

export function useCatalogState() {
  const navigate = useNavigate();
  const { user, cooperativaId, paId } = useAuth();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { isFavorite, toggleFavorite, favoriteCount } = useFavoritesStore();
  const favQuickAdd = useFavoriteQuickAdd();
  const { isInCompare, toggleCompare, canAddMore } = useComparisonStore();
  const { registerProducts } = useProductsContext();
  const { data: promoSalesMap } = usePromoSalesRanking();
  const { data: supplierSalesMap } = useSupplierSalesRanking();
  const { data: noveltyIds } = useNoveltyProductIds();

  const searchQueryFromUrl = textOrEmpty(searchParams.get("search"));

  // Compose specialized state
  const [isPending, startTransition] = useTransition();
  const display = useCatalogDisplay();
  const filterState = useCatalogFilters();
  const selection = useCatalogSelectionState();
  
  // Data fetching
  const debouncedServerSearch = useDebounce(textOrEmpty(searchParams.get("search")), 400);
  const {
    data: catalogData,
    isLoading: isLoadingProducts,
    isFetching: isFetchingProducts,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error: catalogError,
    refetch: refetchCatalog,
  } = useProductsCatalog(catalogSearchOptions(debouncedServerSearch));

  const realProducts = useMemo(() => {
    if (!catalogData?.pages) return [] as Product[];
    return catalogData.pages.flatMap(page => page.products);
  }, [catalogData]);

  const totalEstimate = nullableNumber(catalogData?.pages?.[0]?.totalEstimate);

  // Background fetch
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => fetchNextPage());
      } else {
        setTimeout(() => fetchNextPage(), 1000);
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (realProducts.length > 0) registerProducts(realProducts);
  }, [realProducts, registerProducts]);

  const searchHistoryScope = buildSearchHistoryScope(user?.id, cooperativaId, paId);
  const search = useCatalogSearchState(realProducts, searchQueryFromUrl, searchHistoryScope);

  // Material & Category filters
  const { productIds: materialFilteredProductIds, hasFilter: hasMaterialFilter, isLoading: isLoadingMaterialFilter, error: materialFilterError, hasData: hasMaterialFilterData } = useProductsByMaterial({
    materialGroupSlugs: listOrEmpty(filterState.filters.materialGroups),
    materialTypeSlugs: listOrEmpty(filterState.filters.materialTypes),
  });

  const { productIds: categoryFilteredProductIds, hasFilter: hasCategoryFilter, isLoading: isLoadingCategoryFilter, error: categoryFilterError, hasData: hasCategoryFilterData } = useProductsByCategory({
    categoryIds: listOrEmpty(filterState.filters.categories?.map(String)),
    includeDescendants: true,
  });
  const { productIds: colorFilteredProductIds, hasFilter: hasColorFilter, hasData: hasColorFilterData, isLoading: isLoadingColorFilter, error: colorFilterError } = useProductsByColor({
    colorGroups: filterState.filters.colorGroups,
    colorVariations: filterState.filters.colorVariations,
    colorNuances: filterState.filters.colorNuances,
    colors: filterState.filters.colors,
  });
  const { productIds: tagFilteredProductIds, hasFilter: hasTagFilter, hasData: hasTagFilterData, isLoading: isLoadingTagFilter, error: tagFilterError } = useProductsByTag(filterState.filters.tags);
  const { productIds: techniqueFilteredProductIds, hasFilter: hasTechniqueFilter, hasData: hasTechniqueFilterData, isLoading: isLoadingTechniqueFilter, error: techniqueFilterError } = useProductsByTechnique(filterState.filters.techniques);
  const { productIds: sizeFilteredProductIds, hasFilter: hasSizeFilter, hasData: hasSizeFilterData, isLoading: isLoadingSizeFilter, error: sizeFilterError } = useProductsBySize(filterState.filters.sizes);
  const { productIds: activityFilteredProductIds, hasFilter: hasActivityFilter, hasData: hasActivityFilterData, isLoading: isLoadingActivityFilter, error: activityFilterError } = useProductsByActivity(filterState.filters.ramosAtividade, filterState.filters.segmentosAtividade);
  const { productIds: marketingFilteredProductIds, hasFilter: hasMarketingFilter, hasData: hasMarketingFilterData, isLoading: isLoadingMarketingFilter, error: marketingFilterError } = useCatalogMarketingProductFilter({
    publicoAlvo: filterState.filters.publicoAlvo,
    endomarketing: filterState.filters.endomarketing,
    temas: filterState.filters.sicoobThemes,
  });
  const { productIds: commemorativeDateProductIds, hasFilter: hasCommemorativeDateFilter, hasData: hasCommemorativeDateFilterData, isLoading: isLoadingCommemorativeDateFilter, error: commemorativeDateFilterError } = useProductsByCommemorativeDates(filterState.filters.datasComemorativas);
  const isLoadingRelations = [
    isLoadingMaterialFilter,
    isLoadingColorFilter,
    isLoadingTagFilter,
    isLoadingTechniqueFilter,
    isLoadingSizeFilter,
    isLoadingActivityFilter,
    isLoadingMarketingFilter,
    isLoadingCommemorativeDateFilter,
  ].some(Boolean);

  useEffect(() => {
    const error = [categoryFilterError ? new Error(categoryFilterError) : null,
      materialFilterError, colorFilterError, tagFilterError, techniqueFilterError, sizeFilterError,
      activityFilterError, marketingFilterError, commemorativeDateFilterError]
      .find((candidate): candidate is Error => Boolean(candidate));
    if (!error) return;
    toast({
      title: 'Não foi possível aplicar um filtro',
      description: error.message,
      variant: 'destructive',
    });
  }, [activityFilterError, categoryFilterError, colorFilterError, commemorativeDateFilterError, marketingFilterError, materialFilterError, sizeFilterError, tagFilterError, techniqueFilterError, toast]);

  const { data: realStats } = useCatalogRealStats();
  const { isLoading, isInitial: isInitialCatalogLoad } = catalogLoadingState(
    isLoadingProducts,
    isFetchingProducts,
    isLoadingRelations,
    isLoadingCategoryFilter,
    realProducts.length,
  );

  // Filtering & Search
  const debouncedSearchQuery = useDebounce(search.searchQuery, 350);
  const { results: fuzzySearchResults, hasSearch: hasFuzzySearch } = useProductFuzzySearch(realProducts, debouncedSearchQuery);

  const filteredProducts = useCatalogFiltering({
    realProducts, filters: filterState.filters, sortBy: display.sortBy, hasFuzzySearch, fuzzySearchResults,
    hasMaterialFilter, materialFilteredProductIds, isLoadingMaterialFilter,
    materialFilterError: materialFilterError && !hasMaterialFilterData ? materialFilterError : null,
    hasCategoryFilter, categoryFilteredProductIds, isLoadingCategoryFilter,
    categoryFilterError: categoryFilterError && !hasCategoryFilterData ? categoryFilterError : null,
    hasColorFilter: canApplyCatalogFilter(hasColorFilter, colorFilterError, hasColorFilterData), colorFilteredProductIds, isLoadingColorFilter,
    hasTagFilter: canApplyCatalogFilter(hasTagFilter, tagFilterError, hasTagFilterData), tagFilteredProductIds, isLoadingTagFilter,
    hasTechniqueFilter: canApplyCatalogFilter(hasTechniqueFilter, techniqueFilterError, hasTechniqueFilterData), techniqueFilteredProductIds, isLoadingTechniqueFilter,
    hasSizeFilter: canApplyCatalogFilter(hasSizeFilter, sizeFilterError, hasSizeFilterData), sizeFilteredProductIds, isLoadingSizeFilter,
    hasActivityFilter: canApplyCatalogFilter(hasActivityFilter, activityFilterError, hasActivityFilterData), activityFilteredProductIds, isLoadingActivityFilter,
    hasMarketingFilter: canApplyCatalogFilter(hasMarketingFilter, marketingFilterError, hasMarketingFilterData), marketingFilteredProductIds, isLoadingMarketingFilter,
    hasCommemorativeDateFilter: canApplyCatalogFilter(hasCommemorativeDateFilter, commemorativeDateFilterError, hasCommemorativeDateFilterData), commemorativeDateProductIds, isLoadingCommemorativeDateFilter,
    promoSalesMap, supplierSalesMap,
  });

  // Pagination
  const pagination = useCatalogPagination({
    isLoading,
    hasMoreProducts: filteredProducts.length > 0, // Simplified for now
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    filteredProductsLength: filteredProducts.length,
  });
  const { setDisplayCount } = pagination;

  // Override pagination's hasMoreProducts with real logic
  const hasMoreProducts = [pagination.displayCount < filteredProducts.length, Boolean(hasNextPage)].some(Boolean);
  
  // Reset pagination on filter change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [filterState.filters, display.sortBy, search.searchQuery, setDisplayCount]);

  // Color enrichment
  const rawPaginatedProducts = useMemo(() => filteredProducts.slice(0, pagination.displayCount), [filteredProducts, pagination.displayCount]);
  const hasColorFilterActive = hasActiveColorFilter(filterState.filters.colorGroups, filterState.filters.colorVariations);
  const paginatedProductIds = useMemo(() => rawPaginatedProducts.map(p => p.id), [rawPaginatedProducts]);
  
  const { data: catalogColorEnrichmentMap, isFetching: isEnrichingColors } = useColorEnrichment({
    productIds: paginatedProductIds,
    colorGroups: listOrEmpty(filterState.filters.colorGroups),
    colorVariations: listOrEmpty(filterState.filters.colorVariations),
  });

  const paginatedProducts = useMemo(() => {
    const productsToProcess = rawPaginatedProducts.map(product => ({
      ...product,
      isNovelty: noveltyIds?.has(product.id),
    }));

    return enrichCatalogProducts(
      productsToProcess,
      catalogColorEnrichmentMap,
      hasColorFilterActive,
      filterState.filters.colorGroups,
      filterState.filters.colorVariations,
    );
  }, [rawPaginatedProducts, catalogColorEnrichmentMap, hasColorFilterActive, filterState.filters.colorGroups, filterState.filters.colorVariations, noveltyIds]);

  const { shouldShowCatalogSkeleton, hasActiveCatalogConstraints, shouldShowEmptyState } = catalogVisibility(
    isInitialCatalogLoad,
    isLoading,
    isLoadingProducts,
    isFetchingProducts,
    catalogError,
    paginatedProducts.length,
    filterState.activeFiltersCount,
    search.searchQuery,
  );

  // Stats
  const statBadges = useCatalogStats({
    filteredProducts,
    totalEstimate,
    activeFiltersCount: filterState.activeFiltersCount,
    searchQuery: search.searchQuery,
    hasNextPage,
    realStats,
    isFavorite,
    favoriteCount,
  });

  // Handlers
  const resetFilters = useCallback(() => {
    startTransition(() => {
      filterState.setFilters(defaultFilters);
      display.setSortBy("name");
      search.setSearchQuery("");
      navigate("/", { replace: true });
    });
  }, [navigate, filterState, display, search]);

  const handleViewProduct = useCallback((product: Product) => {
    navigate(`/produto/${product.id}`);
  }, [navigate]);

  const [shareProduct, setShareProduct] = useState<Product | null>(null);

  const handleShareProduct = useCallback((product: Product) => {
    setShareProduct(product);
  }, []);

  const handleFavoriteProduct = useCallback((product: Product, e?: MouseEvent) => {
    const result = favQuickAdd.handleFavoriteClick(product, { shiftKey: e?.shiftKey });
    if (!result.resolved && result.reason === "picker-needed") {
      const target = favQuickAdd.defaultList;
      if (target) {
        void favQuickAdd.addToList(target.id, product);
        toast({
          title: "Adicionado aos Favoritos",
          description: `Salvo em "${target.name}". Use Shift+clique para confirmar a lista padrão sem confirmação.`,
        });
      } else {
        toggleFavorite(product.id);
      }
    }
  }, [favQuickAdd, toggleFavorite, toast]);

  return {
    searchHistoryScope,
    ...display,
    ...filterState,
    ...selection,
    ...search,
    ...pagination,

    filteredProducts,
    paginatedProducts,
    shouldShowCatalogSkeleton,
    shouldShowEmptyState,
    catalogError,
    refetchCatalog,
    hasActiveCatalogConstraints,
    hasMoreProducts,
    totalEstimate,
    hasNextPage,
    statBadges,
    isEnrichingColors,
    noveltyIds,

    resetFilters,
    handleViewProduct,
    handleShareProduct,
    shareProduct, 
    setShareProduct,
    handleFavoriteProduct,

    isFavorite,
    toggleFavorite,
    isInCompare,
    toggleCompare,
    canAddMore,
    navigate,
    ITEMS_PER_PAGE,
    isPending,
  };
}
