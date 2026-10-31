import { useNavigate } from "react-router-dom";
import { useCallback, useState, useRef, lazy, Suspense, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { SharePreviewDialog } from "@/components/products/share/SharePreviewDialog";
import { VariantPickerDialog } from "@/components/products/VariantPickerDialog";
import type { Product } from "@/hooks/useProducts";
import type { ExternalVariantStock } from "@/hooks/useExternalVariantStock";
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { FilterPanel, type FilterState, defaultFilters } from "@/components/filters/FilterPanel";
import { SORT_OPTIONS } from "@/constants/filters";
import { PresetsBar } from "@/components/filters/PresetsBar";
import { VirtualizedProductGrid } from "@/components/products/VirtualizedProductGrid";
import { ProductList } from "@/components/products/ProductList";
import { ProductTableView } from "@/components/products/ProductTableView";
import { ColumnSelector } from "@/components/products/ColumnSelector";
import { BulkActionBar } from "@/components/products/BulkActionBar";
import { BulkAddToCartModal } from "@/components/catalog/BulkAddToCartModal";
import { BulkVariantWizard } from "@/components/catalog/BulkVariantWizard";
import { AddToCollectionModal } from "@/components/collections/AddToCollectionModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter, ArrowUpDown, X, CheckSquare, SearchX, Sparkles } from "lucide-react";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import { SmartSearchInput } from "@/components/search";
import { useFavoritesStore, type FavoriteVariantInfo } from "@/stores/useFavoritesStore";
import { useComparisonStore, type CompareVariantInfo } from "@/stores/useComparisonStore";
import type { VoiceAgentAction } from "@/hooks/voice/types";
import { useOracleVoiceBridge } from "@/stores/oracleVoiceBridge";
import { toast } from "sonner";
import { useFiltersPageState } from "./filters/useFiltersPageState";
import { useFiltersSelectionMode } from "./filters/useFiltersSelectionMode";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const LazyVoiceOverlay = lazy(() => import("@/components/search/VoiceSearchOverlayConnected"));
type FiltersState = ReturnType<typeof useFiltersPageState>;
type Navigate = ReturnType<typeof useNavigate>;
type SelectionState = ReturnType<typeof useFiltersSelectionMode>;
interface FavoritesState {
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string, variant?: FavoriteVariantInfo) => void;
}
interface ComparisonState {
  isInCompare: (productId: string, variantId?: string | null) => boolean;
  toggleCompare: (productId: string, variant?: CompareVariantInfo) => { added: boolean; isFull: boolean };
  canAddMore: boolean;
}

function filtersFromVoice(previous: FilterState, filters: NonNullable<NonNullable<VoiceAgentAction['data']>['filters']>): FilterState {
  const next = { ...previous };
  if (filters.color) next.colors = [...previous.colors, filters.color];
  if (filters.category) next.categories = [...previous.categories, filters.category];
  if (filters.material) next.materiais = [...previous.materiais, filters.material];
  if (filters.maxPrice) next.priceRange = [previous.priceRange[0], filters.maxPrice];
  if (filters.minPrice) next.priceRange = [filters.minPrice, previous.priceRange[1]];
  if (filters.inStock) next.inStock = true;
  if (filters.isKit) next.isKit = true;
  return next;
}

function applyVoiceFilter(action: VoiceAgentAction, state: FiltersState): void {
  const filters = action.data?.filters;
  if (filters) state.setFilters((previous) => filtersFromVoice(previous, filters));
}

function applyVoiceSearch(action: VoiceAgentAction, state: FiltersState): void {
  const query = action.data?.query;
  if (query) state.setFilters((previous) => ({ ...previous, search: query }));
}

function applyVoiceSort(action: VoiceAgentAction, state: FiltersState): void {
  const sortBy = action.data?.sortBy;
  if (!sortBy) return;
  const sortMap: Record<string, string> = { 'price-asc': 'price-asc', 'price-desc': 'price-desc', name: 'name', stock: 'stock', newest: 'newest', popularity: 'popularity' };
  state.setSortBy(sortMap[sortBy] || 'name');
}

function applyVoiceNavigate(action: VoiceAgentAction, navigate: Navigate): void {
  const route = action.data?.route;
  if (route) navigate(route);
}

function applyVoiceAction(action: VoiceAgentAction, state: FiltersState, navigate: Navigate, openOracle: (message?: string) => void): void {
  switch (action.action) {
    case 'open_oracle': openOracle(action.data?.oracleMessage || undefined); break;
    case 'open_cart': window.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', altKey: true })); break;
    case 'filter': applyVoiceFilter(action, state); break;
    case 'search': applyVoiceSearch(action, state); break;
    case 'sort': applyVoiceSort(action, state); break;
    case 'clear': state.setFilters(defaultFilters); break;
    case 'navigate': applyVoiceNavigate(action, navigate); break;
    default: return;
  }
  toast.success(action.response);
}

export default function FiltersPage() {
  const navigate = useNavigate();
  const favorites = useFavoritesStore();
  const comparison = useComparisonStore();

  const state = useFiltersPageState();
  const sel = useFiltersSelectionMode({ selectionMode: state.selectionMode, filteredProducts: state.filteredProducts });
  const openOracle = useOracleVoiceBridge((s) => s.openOracle);

  // ========== SHARE STATE ==========
  const [shareProduct, setShareProduct] = useState<Product | null>(null);
  const [variantForShare, setVariantForShare] = useState<ExternalVariantStock | null | undefined>(undefined);
  const variantSelectedRef = useRef(false);

  // ========== VOICE ==========
  const handleVoiceAction = useCallback((action: VoiceAgentAction) => {
    applyVoiceAction(action, state, navigate, openOracle);
  }, [state, navigate, openOracle]);

  const toggleSelectionMode = useCallback(() => {
    state.setSelectionMode((prev: boolean) => !prev);
  }, [state]);

  return (
    <>
      <PageSEO title="Filtros de Produtos" description="Filtre e encontre brindes por cor, categoria, preço e fornecedor." path="/produtos" />
      <div className="animate-fade-in">
        <div className="flex gap-8">
          <FiltersSidebar state={state} />
          <FiltersContent state={state} selection={sel} navigate={navigate} favorites={favorites}
            comparison={comparison} onToggleSelection={toggleSelectionMode} onShare={setShareProduct} />
        </div>
      </div>
      <FiltersOverlays state={state} onVoiceAction={handleVoiceAction} shareProduct={shareProduct}
        setShareProduct={setShareProduct} selectedVariant={variantForShare}
        setSelectedVariant={setVariantForShare} variantSelectedRef={variantSelectedRef} />
    </>
  );
}

function sidebarProgressVisible(state: FiltersState): boolean {
  return !state.isFullyLoaded && state.loadingProgress > 0 && state.loadingProgress < 100;
}

function resultSummary(state: FiltersState): string {
  if (state.isLoadingProducts && state.realProducts.length === 0) return 'Carregando catálogo...';
  if (state.activeFiltersCount > 0) {
    const count = state.filteredProducts.length;
    return `Ver ${count.toLocaleString('pt-BR')} resultado${count === 1 ? '' : 's'}`;
  }
  const count = state.totalEstimate ?? state.filteredProducts.length;
  return `${count.toLocaleString('pt-BR')}${state.isFullyLoaded ? '' : '+'} produtos disponíveis`;
}

function FiltersSidebar({ state }: { state: FiltersState }) {
  const active = state.activeFiltersCount > 0;
  return (
    <aside className="hidden lg:flex lg:flex-col w-80 shrink-0 sticky top-4 max-h-[calc(100vh-6rem)] overflow-hidden rounded-b-xl">
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin pr-2 space-y-4 relative">
        <FilterPanel filters={state.filters} onFilterChange={state.handleFilterChange} onReset={state.handleReset}
          activeFiltersCount={state.activeFiltersCount} products={state.realProducts} filteredResultsCount={state.filteredProducts.length} />
        <div className="sticky bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </div>
      <div className="border-t border-border/40 bg-card px-3 py-2.5 shrink-0 space-y-2">
        <AnimatePresence>{sidebarProgressVisible(state) && <motion.div initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1 overflow-hidden">
          <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden"><motion.div
            className="h-full bg-gradient-to-r from-primary/70 via-primary to-primary/70 rounded-full"
            animate={{ width: `${state.loadingProgress}%` }} /></div>
          <p className="text-[10px] text-muted-foreground text-center tabular-nums">
            Carregando {state.loadedCount.toLocaleString('pt-BR')} de {(state.totalEstimate ?? 0).toLocaleString('pt-BR')} produtos ({state.loadingProgress}%)
          </p>
        </motion.div>}</AnimatePresence>
        <div className={cn("flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300",
          active ? "bg-gradient-to-r from-orange to-orange-hover text-orange-foreground shadow-md shadow-orange/20" : "bg-muted/60 text-muted-foreground")}>
          <Filter className="h-4 w-4" /><span className="tabular-nums">{resultSummary(state)}</span>
        </div>
      </div>
    </aside>
  );
}

interface FiltersContentProps {
  state: FiltersState;
  selection: SelectionState;
  navigate: Navigate;
  favorites: FavoritesState;
  comparison: ComparisonState;
  onToggleSelection: () => void;
  onShare: Dispatch<SetStateAction<Product | null>>;
}

function FiltersContent(props: FiltersContentProps) {
  return (
    <div className="flex-1 min-w-0 space-y-6">
      <FiltersToolbar {...props} />
      <ProductsSection {...props} />
    </div>
  );
}

function catalogCountLabel(state: FiltersState): string {
  if (state.isLoadingProducts && state.realProducts.length === 0) return 'carregando...';
  const count = state.activeFiltersCount > 0
    ? state.filteredProducts.length
    : (state.totalEstimate ?? state.filteredProducts.length);
  const suffix = !state.isFullyLoaded && state.activeFiltersCount === 0 ? '+' : '';
  return `${count.toLocaleString('pt-BR')}${suffix} produtos`;
}

function CatalogTitle({ state }: { state: FiltersState }) {
  const showProgress = sidebarProgressVisible(state) && state.activeFiltersCount === 0;
  return (
    <div className="flex-shrink-0">
      <h1 data-testid="page-title-produtos" className="font-display text-xl sm:text-2xl lg:text-3xl font-bold whitespace-nowrap">
        Catálogo de Produtos
        <span className="text-muted-foreground font-normal text-sm sm:text-base ml-2 inline-flex items-center gap-1.5">
          · <span className="tabular-nums">{catalogCountLabel(state)}</span>
          {showProgress && <span className="inline-flex items-center gap-1 ml-1" title="Sincronizando catálogo completo em background">
            <span className="h-1 w-12 bg-muted/50 rounded-full overflow-hidden inline-block align-middle">
              <motion.span className="block h-full bg-primary/60 rounded-full" initial={{ width: 0 }}
                animate={{ width: `${state.loadingProgress}%` }} transition={{ duration: 0.4, ease: "easeOut" }} />
            </span>
            <span className="text-[10px] tabular-nums opacity-60 animate-pulse">{state.loadingProgress}%</span>
          </span>}
        </span>
      </h1>
    </div>
  );
}

function searchResultLabel(state: FiltersState): string {
  if (state.isLoadingProducts && state.realProducts.length === 0) return 'Carregando...';
  const count = state.filteredProducts.length;
  return `${count.toLocaleString('pt-BR')} encontrado${count === 1 ? '' : 's'}`;
}

function SearchResultBadge({ state }: { state: FiltersState }) {
  const searching = Boolean(state.filters.search || state.searchParams.get('search'));
  if (!searching) return null;
  return <Badge variant="secondary" className="shrink-0 whitespace-nowrap">{searchResultLabel(state)}</Badge>;
}

function MobileFilters({ state }: { state: FiltersState }) {
  return (
    <Sheet open={state.mobileFiltersOpen} onOpenChange={state.setMobileFiltersOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden shrink-0">
          <Filter className="h-4 w-4 mr-2" />Filtros
          {state.activeFiltersCount > 0 && <Badge variant="secondary" className="ml-2">{state.activeFiltersCount}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-2"><SheetTitle>Filtros</SheetTitle></SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-4 relative">
          <FilterPanel filters={state.filters} onFilterChange={state.handleFilterChange} onReset={state.handleReset}
            activeFiltersCount={state.activeFiltersCount} products={state.realProducts} filteredResultsCount={state.filteredProducts.length} />
          <div className="sticky bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </div>
        <MobileFiltersFooter state={state} />
      </SheetContent>
    </Sheet>
  );
}

function MobileFiltersFooter({ state }: { state: FiltersState }) {
  return (
    <div className="border-t border-border/40 bg-card px-4 py-3 space-y-2 shrink-0">
      {sidebarProgressVisible(state) && <div className="h-1 w-full bg-muted/50 rounded-full overflow-hidden">
        <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${state.loadingProgress}%` }} transition={{ duration: 0.4 }} />
      </div>}
      <div className="flex gap-2">
        {state.activeFiltersCount > 0 && <Button variant="outline" size="sm" onClick={state.handleReset}
          className="text-xs shrink-0">Limpar ({state.activeFiltersCount})</Button>}
        <Button size="sm" className="flex-1 tabular-nums" onClick={() => state.setMobileFiltersOpen(false)}>
          <Filter className="h-3.5 w-3.5 mr-1.5" />{resultSummary(state)}
        </Button>
      </div>
    </div>
  );
}

function SelectionToggle({ state, selection, onToggle }: {
  state: FiltersState; selection: SelectionState; onToggle: () => void;
}) {
  return (
    <Button variant={state.selectionMode ? "default" : "outline"} size="sm"
      className={cn("gap-1.5 h-8 transition-all relative", state.selectionMode
        ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
        : "hover:border-primary/50")} onClick={onToggle}>
      <CheckSquare className="h-3.5 w-3.5" />
      <span className="hidden sm:inline text-xs">{state.selectionMode ? "Cancelar" : "Selecionar"}</span>
      <AnimatePresence>{state.selectionMode && selection.selectedCount > 0 && <motion.div
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }} className="absolute -top-2 -right-2">
        <Badge className="bg-destructive text-destructive-foreground h-5 min-w-5 text-[10px] font-bold px-1.5 py-0 flex items-center justify-center tabular-nums shadow-lg">
          {selection.selectedCount}
        </Badge>
      </motion.div>}</AnimatePresence>
    </Button>
  );
}

function handleSearchSelection(result: { type: string; id: string; label: string }, state: FiltersState, navigate: Navigate): void {
  if (result.type === 'product') navigate(`/produto/${result.id}`);
  else state.handleFilterChange({ ...state.filters, search: result.label });
}

function FiltersToolbar({ state, selection, navigate, onToggleSelection }: FiltersContentProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <CatalogTitle state={state} />
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <SmartSearchInput placeholder="Buscar produtos..." onSelect={(result) => handleSearchSelection(result, state, navigate)}
          onSearch={(query) => state.handleFilterChange({ ...state.filters, search: query })} className="flex-1" />
        <SearchResultBadge state={state} />
        <MobileFilters state={state} />
        <Select value={state.sortBy} onValueChange={state.setSortBy}>
          <SelectTrigger className="w-44 sm:w-52 shrink-0"><ArrowUpDown className="h-4 w-4 mr-2" /><SelectValue placeholder="Ordenar" /></SelectTrigger>
          <SelectContent>{SORT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
        <PresetsBar currentFilters={state.filters} onApplyPreset={state.handleApplyPreset} activePresetId={state.activePresetId} />
        <SelectionToggle state={state} selection={selection} onToggle={onToggleSelection} />
        <div className="hidden sm:block shrink-0">
          <LayoutPopover viewMode={state.viewMode} setViewMode={state.setViewMode} gridColumns={state.gridColumns} setGridColumns={state.setGridColumns} />
        </div>
      </div>
      <ActiveFilterSummary state={state} />
    </div>
  );
}

function ActiveFilterSummary({ state }: { state: FiltersState }) {
  if (state.activeFiltersSummary.length === 0) return null;
  return (
    <div className="hidden sm:flex items-center gap-1.5 flex-wrap w-full">
      {state.activeFiltersSummary.slice(0, 3).map((filter) => <Badge key={filter.key} variant="secondary"
        className="gap-1 cursor-pointer hover:bg-destructive/20 text-xs py-0.5 px-2" onClick={() => state.clearSingleFilter(filter.key)}>
        {filter.label}: {filter.value} <X className="h-3 w-3" />
      </Badge>)}
      {state.activeFiltersSummary.length > 3 && <Badge variant="outline" className="text-xs py-0.5 px-2">+{state.activeFiltersSummary.length - 3}</Badge>}
      <Button variant="ghost" size="sm" onClick={state.handleReset} className="text-muted-foreground h-6 px-2 text-xs">Limpar</Button>
    </div>
  );
}

function initialProductsLoading(state: FiltersState): boolean {
  return (state.isLoadingProducts || state.isLoadingMaterialFilter || state.isLoadingCategoryFilter)
    && state.realProducts.length === 0;
}

function ProductsSection(props: FiltersContentProps) {
  const { state } = props;
  let content;
  if (initialProductsLoading(state)) content = <ProductsSkeleton viewMode={state.viewMode} />;
  else if (state.filteredProducts.length === 0) content = <EmptyProducts state={state} />;
  else content = <LoadedProducts {...props} />;
  return (
    <div className="min-h-[calc(100vh-10rem)] relative">
      {state.isFiltering && <FilteringOverlay />}
      {content}
    </div>
  );
}

function FilteringOverlay() {
  return <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[1px] flex items-start justify-center pt-32 transition-opacity duration-200 pointer-events-none rounded-xl">
    <div className="flex items-center gap-2 px-4 py-2 bg-background/90 border rounded-full shadow-sm">
      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-muted-foreground">Filtrando...</span>
    </div>
  </div>;
}

function skeletonContainerClass(viewMode: FiltersState['viewMode']): string {
  if (viewMode === 'grid') return 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6';
  if (viewMode === 'table') return 'space-y-0';
  return 'space-y-3';
}

function ProductsSkeleton({ viewMode }: { viewMode: FiltersState['viewMode'] }) {
  return (
    <div className="rounded-xl border border-border/40 bg-gradient-to-b from-background/80 to-background/40 p-4 sm:p-6 shadow-inner">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 animate-pulse" />
        <div className="space-y-1.5 flex-1"><div className="h-4 w-48 rounded-md bg-muted/60 animate-pulse" /><div className="h-3 w-32 rounded-md bg-muted/40 animate-pulse" /></div>
      </div>
      <div className={skeletonContainerClass(viewMode)}>
        {viewMode === 'table' ? <TableSkeleton /> : <CardsSkeleton viewMode={viewMode} />}
      </div>
    </div>
  );
}

function TableSkeleton() {
  return <div className="rounded-xl border border-border/50 overflow-hidden">
    <div className="h-10 bg-muted/40 border-b border-border/30" />
    {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-14 border-b border-border/20 flex items-center gap-4 px-4">
      <div className="h-9 w-9 rounded-lg bg-muted/40 animate-pulse shrink-0" /><div className="h-3.5 flex-1 max-w-[200px] rounded bg-muted/50 animate-pulse" />
    </div>)}
  </div>;
}

function CardsSkeleton({ viewMode }: { viewMode: FiltersState['viewMode'] }) {
  const count = viewMode === 'grid' ? 6 : 8;
  return <>{Array.from({ length: count }).map((_, index) => viewMode === 'grid'
    ? <div key={index} className="overflow-hidden rounded-2xl border border-border/50 bg-card">
      <div className="aspect-[4/5] bg-muted/40 animate-pulse" /><div className="space-y-3 p-4"><div className="h-3 w-24 rounded bg-muted/50 animate-pulse" /><div className="h-5 w-full rounded bg-muted/40 animate-pulse" /></div>
    </div>
    : <div key={index} className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
      <div className="h-20 w-20 rounded-lg bg-muted/40 animate-pulse shrink-0" /><div className="h-5 w-2/3 rounded bg-muted/40 animate-pulse" />
    </div>)}</>;
}

function activeColorFilter(state: FiltersState) {
  if (state.filters.colorGroups.length === 0 && state.filters.colorVariations.length === 0) return null;
  return { groups: state.filters.colorGroups, variations: state.filters.colorVariations };
}

function handleProductClick(productId: string, state: FiltersState, selection: SelectionState, navigate: Navigate): void {
  if (state.selectionMode) selection.toggleSelect(productId);
  else navigate(`/produto/${productId}`);
}

function LoadedProducts(props: FiltersContentProps) {
  return <><ProductViews {...props} /><BulkControls state={props.state} selection={props.selection} /></>;
}

function ProductViews({ state, selection, navigate, favorites, comparison, onShare }: FiltersContentProps) {
  const common = { products: state.filteredProducts, isFavorite: favorites.isFavorite, onToggleFavorite: favorites.toggleFavorite,
    isInCompare: comparison.isInCompare, onToggleCompare: comparison.toggleCompare, canAddToCompare: comparison.canAddMore,
    activeColorFilter: activeColorFilter(state), selectionMode: state.selectionMode };
  const onProductClick = (productId: string) => handleProductClick(productId, state, selection, navigate);
  if (state.viewMode === 'grid') return <VirtualizedProductGrid {...common} columns={state.gridColumns}
    onProductClick={(product) => onProductClick(product.id)} onShare={onShare}
    columnSelector={<ColumnSelector value={state.gridColumns} onChange={state.setGridColumns} />}
    activeFiltersCount={state.activeFiltersCount} sortBy={state.sortBy} onSortChange={state.setSortBy}
    onOpenFilters={() => state.setMobileFiltersOpen(true)} onClearFilters={state.handleReset} viewMode={state.viewMode}
    onViewModeChange={state.setViewMode} showFilterBar={false} selectedIds={selection.selectedIds} onToggleSelect={selection.toggleSelect} />;
  if (state.viewMode === 'list') return <div className="h-[calc(100vh-280px)] min-h-[500px] overflow-y-auto rounded-xl border border-border/40 bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm scrollbar-products shadow-inner p-4">
    <ProductList {...common} onProductClick={onProductClick} onShareProduct={onShare}
      externalSelectedIds={selection.selectedIds} onToggleSelect={selection.toggleSelect} />
  </div>;
  return <div className="h-[calc(100vh-280px)] min-h-[500px] overflow-y-auto rounded-xl border border-border/40 bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm shadow-inner">
    <ProductTableView {...common} onProductClick={onProductClick} onShareProduct={onShare}
      selectedIds={selection.selectedIds} onToggleSelect={selection.toggleSelect} />
  </div>;
}

function closeCollection(open: boolean, selection: SelectionState): void {
  selection.setCollectionModalOpen(open);
  if (!open) selection.clearSelection();
}

function BulkControls({ state, selection }: { state: FiltersState; selection: SelectionState }) {
  return <>
    {state.selectionMode && <BulkActionBar selectedCount={selection.selectedIds.size} totalCount={state.filteredProducts.length}
      onSelectAll={selection.selectAll} onClearSelection={selection.clearSelection} onBulkFavorite={selection.handleBulkFavorite}
      onBulkCompare={selection.handleBulkCompare} onBulkCollection={selection.handleBulkCollection}
      onBulkQuote={selection.handleBulkQuote} onBulkCart={selection.handleBulkCart} />}
    {selection.firstSelectedProduct && selection.firstSelectedId && <AddToCollectionModal open={selection.collectionModalOpen}
      onOpenChange={(open) => closeCollection(open, selection)} productId={selection.firstSelectedId}
      productName={`${selection.selectedIds.size} produtos selecionados`} />}
    <BulkAddToCartModal open={selection.cartModalOpen} onOpenChange={selection.setCartModalOpen}
      products={selection.bulkCartProducts} variantSelections={selection.wizardSelections} onDone={selection.clearSelection} />
    <BulkVariantWizard open={selection.variantWizardOpen} onOpenChange={selection.setVariantWizardOpen}
      products={selection.bulkCartProducts} mode={selection.wizardMode} onComplete={selection.handleWizardComplete} />
  </>;
}

function EmptyProducts({ state }: { state: FiltersState }) {
  const message = state.activeFiltersCount > 1
    ? 'A combinação de filtros não retornou resultados. Tente remover algum filtro.'
    : 'Tente ajustar os filtros ou buscar por outro termo.';
  return <div className="text-center py-16 rounded-xl border border-dashed border-border/60 bg-gradient-to-b from-muted/20 to-muted/5">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/40 mb-5"><SearchX className="h-8 w-8 text-muted-foreground/60" /></div>
    <h3 className="text-lg font-semibold font-display text-foreground">Nenhum produto encontrado</h3>
    <p className="text-muted-foreground mt-1.5 mb-6 max-w-sm mx-auto text-sm">{message}</p>
    <Button variant="outline" onClick={state.handleReset} className="gap-1.5"><Sparkles className="h-3.5 w-3.5" />Limpar filtros</Button>
  </div>;
}

interface FiltersOverlaysProps {
  state: FiltersState;
  onVoiceAction: (action: VoiceAgentAction) => void;
  shareProduct: Product | null;
  setShareProduct: Dispatch<SetStateAction<Product | null>>;
  selectedVariant: ExternalVariantStock | null | undefined;
  setSelectedVariant: Dispatch<SetStateAction<ExternalVariantStock | null | undefined>>;
  variantSelectedRef: MutableRefObject<boolean>;
}

function FiltersOverlays(props: FiltersOverlaysProps) {
  return <><VoiceOverlay state={props.state} onAction={props.onVoiceAction} /><ShareFlow {...props} /></>;
}

function VoiceOverlay({ state, onAction }: { state: FiltersState; onAction: (action: VoiceAgentAction) => void }) {
  if (!state.voiceOverlayOpen) return null;
  return <Suspense fallback={null}><LazyVoiceOverlay isOpen onClose={() => state.setVoiceOverlayOpen(false)} onAction={onAction} /></Suspense>;
}

function closeVariantPicker(open: boolean, props: FiltersOverlaysProps): void {
  if (!open && !props.variantSelectedRef.current) props.setShareProduct(null);
  props.variantSelectedRef.current = false;
}

function completeVariant(variant: ExternalVariantStock | null | undefined, props: FiltersOverlaysProps): void {
  props.variantSelectedRef.current = true;
  props.setSelectedVariant(variant ?? null);
}

function closeShareDialog(open: boolean, props: FiltersOverlaysProps): void {
  if (open) return;
  props.setShareProduct(null);
  props.setSelectedVariant(undefined);
  props.variantSelectedRef.current = false;
}

function ShareFlow(props: FiltersOverlaysProps) {
  const { shareProduct, selectedVariant } = props;
  if (!shareProduct) return null;
  if (selectedVariant === undefined) return <VariantPickerDialog open onOpenChange={(open) => closeVariantPicker(open, props)}
    productId={shareProduct.id} productName={shareProduct.name} mode="share" onComplete={(variant) => completeVariant(variant, props)} />;
  const variant = selectedVariant ? { variantName: selectedVariant.color_name, colorHex: selectedVariant.color_hex,
    thumbnailUrl: selectedVariant.selected_thumbnail } : null;
  return <SharePreviewDialog open onOpenChange={(open) => closeShareDialog(open, props)}
    product={shareProduct} selectedVariant={variant} />;
}
