import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, ArrowUpDown, Building2, FolderTree, X, Sparkles, Search, CheckSquare, Loader2 } from "lucide-react";
import { useNoveltiesWithDetails, type NoveltyWithDetails } from "@/hooks/useNovelties";
import type { Product } from "@/hooks/useProducts";
import { useNoveltiesSelectionMode } from "@/hooks/useNoveltiesSelectionMode";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import { getDefaultColumns, type ColumnCount } from "@/components/products/ColumnSelector";
import { BulkActionBar } from "@/components/products/BulkActionBar";
import { BulkVariantWizard } from "@/components/catalog/BulkVariantWizard";
import { BulkAddToCartModal } from "@/components/catalog/BulkAddToCartModal";
import { AddToCollectionModal } from "@/components/collections/AddToCollectionModal";
import { ProductListItem } from "@/components/products/ProductListItem";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { NoveltyGridCard, NoveltyTableView } from "./NoveltyCards";

type ViewMode = "grid" | "list" | "table";
type SortMode = "name" | "price-asc" | "price-desc" | "newest" | "stock" | "best-seller-supplier" | "best-seller-promo";

type Novelty = NoveltyWithDetails;
type NoveltySelection = ReturnType<typeof useNoveltiesSelectionMode>;
type SelectOption = { id: string; name: string; count: number };

const EMPTY_NOVELTIES: Novelty[] = [];

function compareNovelties(a: Novelty, b: Novelty, sortMode: SortMode) {
  switch (sortMode) {
    case "name": return String(a.product_name).localeCompare(String(b.product_name), 'pt-BR');
    case "price-asc": return Number(a.base_price) - Number(b.base_price);
    case "price-desc": return Number(b.base_price) - Number(a.base_price);
    case "newest": return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
    default: return 0;
  }
}

function getGridColsClass(cols: ColumnCount): string {
  switch (cols) {
    case 3: return "grid-cols-2 sm:grid-cols-3";
    case 4: return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
    case 5: return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
    case 6: return "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";
    case 8: return "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8";
    default: return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
  }
}

function getGridGapClass(cols: ColumnCount): string {
  if (cols >= 8) return "gap-x-4 gap-y-8";
  if (cols >= 6) return "gap-x-6 gap-y-8";
  return "gap-x-8 gap-y-8";
}

function useLoadingProgress(isLoading: boolean) {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (progressRef.current) clearInterval(progressRef.current);
      setLoadingProgress(100);
      const timeout = setTimeout(() => setLoadingProgress(0), 800);
      return () => clearTimeout(timeout);
    }

    setLoadingProgress(0);
    progressRef.current = setInterval(() => {
      setLoadingProgress(previous => {
        if (previous < 90) return previous + Math.random() * 12 + 3;
        if (progressRef.current) clearInterval(progressRef.current);
        return previous;
      });
    }, 300);
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isLoading]);

  return loadingProgress;
}

function matchesSearch(product: Novelty, query: string) {
  if (!query) return true;
  const values = [product.product_name, product.product_sku, product.supplier_name];
  return values.some(value => value?.toLowerCase().includes(query));
}

interface NoveltyFilters {
  readonly searchQuery: string;
  readonly selectedSupplier: string;
  readonly selectedCategory: string;
  readonly sortMode: SortMode;
}

function filterNovelties(products: readonly Novelty[], filters: NoveltyFilters) {
  const query = filters.searchQuery.toLowerCase().trim();
  return products
    .filter(product => matchesSearch(product, query))
    .filter(product => filters.selectedSupplier === "all" || product.supplier_id === filters.selectedSupplier)
    .filter(product => filters.selectedCategory === "all" || product.category_id === filters.selectedCategory)
    .sort((a, b) => compareNovelties(a, b, filters.sortMode));
}

function hasAnyFilter(searchQuery: string, selectedSupplier: string, selectedCategory: string) {
  return [searchQuery.trim(), selectedSupplier === "all" ? "" : selectedSupplier, selectedCategory === "all" ? "" : selectedCategory].some(Boolean);
}

function reportLoadError(error: Error | null) {
  if (error) console.error("Erro ao carregar novidades:", error);
}

function buildFilterOptions(products: readonly Novelty[]) {
  const supplierMap = new Map<string, SelectOption>();
  const categoryMap = new Map<string, SelectOption>();
  products.forEach(product => {
    if (product.supplier_id && product.supplier_name) {
      const existing = supplierMap.get(product.supplier_id);
      supplierMap.set(product.supplier_id, {
        id: product.supplier_id,
        name: product.supplier_name,
        count: (existing?.count ?? 0) + 1,
      });
    }
    if (product.category_id && product.category_name) {
      const existing = categoryMap.get(product.category_id);
      categoryMap.set(product.category_id, {
        id: product.category_id,
        name: product.category_name,
        count: (existing?.count ?? 0) + 1,
      });
    }
  });
  return {
    suppliers: [...supplierMap.values()].sort((a, b) => b.count - a.count),
    categories: [...categoryMap.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  };
}

interface NoveltySearchProps {
  readonly query: string;
  readonly onChange: (query: string) => void;
  readonly mobile?: boolean;
}

function NoveltySearch({ query, onChange, mobile = false }: NoveltySearchProps) {
  return (
    <div className={mobile ? "relative flex-1" : "relative"}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        aria-label="Buscar novidades"
        placeholder={mobile ? "Buscar novidades..." : "Buscar novidades…  /"}
        value={query}
        onChange={event => onChange(event.target.value)}
        className="h-8 text-xs pl-8 bg-muted/40 border-border/50 focus:bg-background"
      />
      {query && (
        <button type="button" onClick={() => onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

interface LoadingIndicatorProps {
  readonly isLoading: boolean;
  readonly progress: number;
}

function LoadingIndicator({ isLoading, progress }: LoadingIndicatorProps) {
  const visible = isLoading && progress > 0 && progress < 100;
  return (
    <AnimatePresence>
      {visible && (
        <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 48 }} exit={{ opacity: 0, width: 0 }} className="inline-flex items-center gap-1 ml-1">
          <span className="h-1 w-12 bg-muted/50 rounded-full overflow-hidden inline-block align-middle">
            <motion.span className="block h-full bg-primary/60 rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: "easeOut" }} />
          </span>
          <span className="text-[10px] tabular-nums text-muted-foreground/60">{Math.round(progress)}%</span>
        </motion.span>
      )}
    </AnimatePresence>
  );
}

interface FilterControlsProps {
  readonly suppliers: readonly SelectOption[];
  readonly categories: readonly SelectOption[];
  readonly selectedSupplier: string;
  readonly selectedCategory: string;
  readonly sortMode: SortMode;
  readonly hasActiveFilters: boolean;
  readonly onSupplierChange: (value: string) => void;
  readonly onCategoryChange: (value: string) => void;
  readonly onSortChange: (value: SortMode) => void;
  readonly onClear: () => void;
}

function FilterControls(props: FilterControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Select value={props.selectedSupplier} onValueChange={props.onSupplierChange}>
        <SelectTrigger className="w-[160px] h-7 text-[11px] gap-1"><Building2 className="h-3 w-3 shrink-0" /><SelectValue placeholder="Fornecedor" /></SelectTrigger>
        <SelectContent><SelectItem value="all">Todos fornecedores</SelectItem>{props.suppliers.map(option => <SelectItem key={option.id} value={option.id}>{option.name} ({option.count})</SelectItem>)}</SelectContent>
      </Select>
      <Select value={props.selectedCategory} onValueChange={props.onCategoryChange}>
        <SelectTrigger className="w-[160px] h-7 text-[11px] gap-1"><FolderTree className="h-3 w-3 shrink-0" /><SelectValue placeholder="Categoria" /></SelectTrigger>
        <SelectContent><SelectItem value="all">Todas categorias</SelectItem>{props.categories.map(option => <SelectItem key={option.id} value={option.id}>{option.name} ({option.count})</SelectItem>)}</SelectContent>
      </Select>
      <Select value={props.sortMode} onValueChange={value => props.onSortChange(value as SortMode)}>
        <SelectTrigger className="w-[180px] h-7 text-[11px] gap-1"><ArrowUpDown className="h-3 w-3" /><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Nome (A-Z)</SelectItem><SelectItem value="price-asc">Preço (Menor → Maior)</SelectItem>
          <SelectItem value="price-desc">Preço (Maior → Menor)</SelectItem><SelectItem value="newest">Mais Recentes</SelectItem>
          <SelectItem value="stock">Maior Estoque</SelectItem><SelectItem value="best-seller-supplier">+ Vendidos Fornecedores</SelectItem>
          <SelectItem value="best-seller-promo">+ Vendidos Sicoob</SelectItem>
        </SelectContent>
      </Select>
      {props.hasActiveFilters && <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground" onClick={props.onClear}><X className="h-3 w-3 mr-0.5" />Limpar</Button>}
    </div>
  );
}

interface ActiveFilterBadgesProps {
  readonly query: string;
  readonly selectedSupplier: string;
  readonly selectedCategory: string;
  readonly suppliers: readonly SelectOption[];
  readonly categories: readonly SelectOption[];
  readonly onQueryChange: (value: string) => void;
  readonly onSupplierChange: (value: string) => void;
  readonly onCategoryChange: (value: string) => void;
}

function ActiveFilterBadges(props: ActiveFilterBadgesProps) {
  return (
    <div className="flex flex-wrap gap-1" role="list" aria-label="Filtros ativos">
      {props.query.trim() && <Badge role="listitem" variant="secondary" className="text-[10px] gap-0.5 cursor-pointer hover:bg-destructive/10 h-5" onClick={() => props.onQueryChange("")}><Search className="h-2.5 w-2.5" />&quot;{props.query}&quot;<X className="h-2.5 w-2.5" /></Badge>}
      {props.selectedSupplier !== "all" && <Badge role="listitem" variant="secondary" className="text-[10px] gap-0.5 cursor-pointer hover:bg-destructive/10 h-5" onClick={() => props.onSupplierChange("all")}><Building2 className="h-2.5 w-2.5" />{props.suppliers.find(option => option.id === props.selectedSupplier)?.name}<X className="h-2.5 w-2.5" /></Badge>}
      {props.selectedCategory !== "all" && <Badge role="listitem" variant="secondary" className="text-[10px] gap-0.5 cursor-pointer hover:bg-destructive/10 h-5" onClick={() => props.onCategoryChange("all")}><FolderTree className="h-2.5 w-2.5" />{props.categories.find(option => option.id === props.selectedCategory)?.name}<X className="h-2.5 w-2.5" /></Badge>}
    </div>
  );
}

interface NoveltyToolbarProps extends ActiveFilterBadgesProps {
  readonly filteredCount: number;
  readonly productCount: number;
  readonly isLoading: boolean;
  readonly loadingProgress: number;
  readonly selectionMode: boolean;
  readonly viewMode: ViewMode;
  readonly gridColumns: ColumnCount;
  readonly sortMode: SortMode;
  readonly hasActiveFilters: boolean;
  readonly onToggleSelection: () => void;
  readonly onClearFilters: () => void;
  readonly onViewModeChange: (value: ViewMode) => void;
  readonly onGridColumnsChange: (value: ColumnCount) => void;
  readonly onSortChange: (value: SortMode) => void;
}

function NoveltyToolbar(props: NoveltyToolbarProps) {
  const loadingFirstPage = props.isLoading && props.productCount === 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles className="h-4 w-4 text-success shrink-0" />
          <h2 className="text-base sm:text-lg font-semibold whitespace-nowrap">Novidades</h2>
          <Badge variant="secondary" className="text-[10px] tabular-nums px-1.5 shrink-0">
            {loadingFirstPage ? <span className="flex items-center gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin" />carregando...</span> : <>{props.filteredCount}{props.hasActiveFilters && <span className="text-muted-foreground">/{props.productCount}</span>}</>}
          </Badge>
          <LoadingIndicator isLoading={props.isLoading} progress={props.loadingProgress} />
          <div className="hidden sm:block w-80 lg:w-[25rem]">
            <NoveltySearch query={props.query} onChange={props.onQueryChange} />
          </div>
        </div>
        <Button variant={props.selectionMode ? "default" : "outline"} size="sm" className={cn("h-8 text-xs gap-1.5 shrink-0 transition-all", props.selectionMode && "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]")} onClick={props.onToggleSelection}>
          <CheckSquare className="h-3.5 w-3.5" /><span className="hidden sm:inline">{props.selectionMode ? "Cancelar" : "Selecionar"}</span>
        </Button>
        <LayoutPopover viewMode={props.viewMode} setViewMode={props.onViewModeChange} gridColumns={props.gridColumns} setGridColumns={props.onGridColumnsChange} />
      </div>
      <div className="flex items-center gap-2 w-full sm:hidden">
        <NoveltySearch query={props.query} onChange={props.onQueryChange} mobile />
      </div>
      <FilterControls
        suppliers={props.suppliers}
        categories={props.categories}
        selectedSupplier={props.selectedSupplier}
        selectedCategory={props.selectedCategory}
        sortMode={props.sortMode}
        hasActiveFilters={props.hasActiveFilters}
        onSupplierChange={props.onSupplierChange}
        onCategoryChange={props.onCategoryChange}
        onSortChange={props.onSortChange}
        onClear={props.onClearFilters}
      />
      {props.hasActiveFilters && <ActiveFilterBadges {...props} />}
    </div>
  );
}

function LoadingProducts({ progress }: { readonly progress: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span className="text-sm text-muted-foreground">Carregando {Math.round(progress)}% dos produtos...</span></div>
      <div className="w-64 h-1.5 bg-muted/50 rounded-full overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: "easeOut" }} /></div>
    </div>
  );
}

interface EmptyProductsProps {
  readonly filtered: boolean;
  readonly onClearFilters: () => void;
}

function EmptyProducts({ filtered, onClearFilters }: EmptyProductsProps) {
  return (
    <div className="text-center py-10">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted/80 mb-3"><Package className="h-7 w-7 text-muted-foreground/40" /></div>
      <p className="text-muted-foreground font-medium text-sm">{filtered ? "Nenhuma novidade com esses filtros" : "Nenhuma novidade encontrada"}</p>
      {filtered ? <Button variant="link" className="mt-1 text-xs" onClick={onClearFilters}>Limpar filtros</Button> : <p className="text-xs text-muted-foreground/70 mt-1">Produtos novos aparecerão aqui automaticamente</p>}
    </div>
  );
}

interface NoveltyListProps {
  readonly products: readonly Novelty[];
  readonly productMap: ReadonlyMap<string, Product>;
  readonly selection: NoveltySelection;
  readonly selectionMode: boolean;
  readonly onProductClick: (id: string) => void;
  readonly isFavorite: (id: string) => boolean;
  readonly toggleFavorite: (id: string) => void;
  readonly isInCompare: (id: string) => boolean;
  readonly onToggleCompare: (id: string) => { added: boolean; isFull: boolean };
  readonly canAddToCompare: boolean;
}

function NoveltyList(props: NoveltyListProps) {
  return (
    <div className="space-y-2">
      {props.products.map((novelty, index) => {
        const product = props.productMap.get(novelty.product_id);
        if (!product) return null;
        const selected = props.selection.selectedIds.has(novelty.product_id);
        const handleClick = () => props.selectionMode
          ? props.selection.toggleSelect(novelty.product_id)
          : props.onProductClick(novelty.product_id);
        return (
          <div key={novelty.novelty_id} className="stagger-item" style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}>
            <div className={cn("flex items-center gap-1", selected && "ring-2 ring-primary rounded-xl")}>
              {props.selectionMode && <div className="flex-shrink-0 ml-1"><SelectionCheckbox checked={selected} onChange={() => props.selection.toggleSelect(novelty.product_id)} size="md" /></div>}
              <div className="flex-1 min-w-0">
                <ProductListItem product={product} onClick={handleClick} isFavorited={props.isFavorite(novelty.product_id)} onToggleFavorite={props.toggleFavorite} isInCompare={props.isInCompare(novelty.product_id)} onToggleCompare={props.onToggleCompare} canAddToCompare={props.canAddToCompare} isNovelty noveltyDaysRemaining={novelty.days_remaining} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface NoveltyGridProps {
  readonly products: readonly Novelty[];
  readonly columns: ColumnCount;
  readonly selection: NoveltySelection;
  readonly selectionMode: boolean;
  readonly onProductClick: (id: string) => void;
}

function NoveltyGrid(props: NoveltyGridProps) {
  const effectiveColumns = Math.min(props.columns, props.products.length) as ColumnCount;
  return (
    <div className={`grid ${getGridColsClass(effectiveColumns)} ${getGridGapClass(effectiveColumns)}`}>
      {props.products.map((product, index) => (
        <div key={product.novelty_id} className="stagger-item" style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}>
          <NoveltyGridCard product={product} onClick={() => props.onProductClick(product.product_id)} selectionMode={props.selectionMode} isSelected={props.selection.selectedIds.has(product.product_id)} onToggleSelect={() => props.selection.toggleSelect(product.product_id)} />
        </div>
      ))}
    </div>
  );
}

interface NoveltyResultsProps extends NoveltyListProps {
  readonly isLoading: boolean;
  readonly loadingProgress: number;
  readonly hasActiveFilters: boolean;
  readonly viewMode: ViewMode;
  readonly gridColumns: ColumnCount;
  readonly onClearFilters: () => void;
}

function NoveltyResults(props: NoveltyResultsProps) {
  if (props.isLoading && props.products.length === 0) return <LoadingProducts progress={props.loadingProgress} />;
  if (props.products.length === 0) return <EmptyProducts filtered={props.hasActiveFilters} onClearFilters={props.onClearFilters} />;
  if (props.viewMode === "table") {
    return <NoveltyTableView products={[...props.products]} onProductClick={props.onProductClick} selectionMode={props.selectionMode} selectedIds={props.selection.selectedIds} onToggleSelect={props.selection.toggleSelect} />;
  }
  if (props.viewMode === "list") return <NoveltyList {...props} />;
  return <NoveltyGrid products={props.products} columns={props.gridColumns} selection={props.selection} selectionMode={props.selectionMode} onProductClick={props.onProductClick} />;
}

function FetchingOverlay({ visible }: { readonly visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="flex items-center gap-2 px-4 py-2 bg-background/90 border rounded-full shadow-sm"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span className="text-sm text-muted-foreground">Filtrando...</span></div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ResultSummaryProps {
  readonly visible: boolean;
  readonly filteredCount: number;
  readonly totalCount: number;
}

function ResultSummary({ visible, filteredCount, totalCount }: ResultSummaryProps) {
  if (!visible) return null;
  return <p className="text-[11px] text-muted-foreground">Mostrando <span className="font-medium text-foreground">{filteredCount}</span> de {totalCount} novidades</p>;
}

interface NoveltyBulkControlsProps {
  readonly selectionMode: boolean;
  readonly selection: NoveltySelection;
  readonly totalCount: number;
}

function NoveltyBulkControls({ selectionMode, selection, totalCount }: NoveltyBulkControlsProps) {
  return (
    <>
      {selectionMode && <BulkActionBar selectedCount={selection.selectedCount} totalCount={totalCount} onSelectAll={selection.selectAll} onClearSelection={selection.clearSelection} onBulkFavorite={selection.handleBulkFavorite} onBulkCompare={selection.handleBulkCompare} onBulkCollection={selection.handleBulkCollection} onBulkCart={selection.handleBulkCart} onBulkQuote={selection.handleBulkQuote} />}
      <BulkVariantWizard open={selection.variantWizardOpen} onOpenChange={selection.setVariantWizardOpen} products={selection.selectedProducts} mode={selection.wizardMode} onComplete={selection.handleWizardComplete} />
      <BulkAddToCartModal open={selection.cartModalOpen} onOpenChange={selection.setCartModalOpen} products={selection.bulkCartProducts} variantSelections={selection.wizardSelections} onDone={selection.clearSelection} />
      <AddToCollectionModal open={selection.collectionModalOpen} onOpenChange={selection.setCollectionModalOpen} productId={selection.firstSelectedId} productName={selection.firstSelectedProduct?.product_name ?? ""} />
    </>
  );
}

export function NoveltyProductGrid() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [gridColumns, setGridColumns] = useState<ColumnCount>(getDefaultColumns);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);

  const { data: novelties, isLoading, isFetching, error } = useNoveltiesWithDetails({ limit: 200 });
  const products = novelties ?? EMPTY_NOVELTIES;
  const loadingProgress = useLoadingProgress(isLoading);
  const { suppliers, categories } = useMemo(() => buildFilterOptions(products), [products]);
  const filteredProducts = useMemo(
    () => filterNovelties(products, { searchQuery, selectedSupplier, selectedCategory, sortMode }),
    [products, searchQuery, selectedSupplier, selectedCategory, sortMode],
  );

  const sel = useNoveltiesSelectionMode({ selectionMode, filteredProducts });
  const hasActiveFilters = hasAnyFilter(searchQuery, selectedSupplier, selectedCategory);
  const handleProductClick = useCallback((id: string) => navigate(`/produto/${id}`), [navigate]);
  const clearFilters = useCallback(() => {
    setSelectedSupplier("all");
    setSelectedCategory("all");
    setSearchQuery("");
  }, []);
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(current => !current);
    if (selectionMode) sel.clearSelection();
  }, [sel, selectionMode]);
  reportLoadError(error);

  // Favorites & Compare stores for ProductListItem integration
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { isInCompare, addToCompare, removeFromCompare, canAddMore: canAddToCompare } = useComparisonStore();
  const onToggleCompare = useCallback((productId: string) => {
    if (isInCompare(productId)) { removeFromCompare(productId); return { added: false, isFull: false }; }
    const result = addToCompare(productId);
    return { added: !!result, isFull: !canAddToCompare };
  }, [isInCompare, addToCompare, removeFromCompare, canAddToCompare]);

  // Convert novelties to Product for list view
  const productMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof sel.noveltyToProduct>>();
    filteredProducts.forEach(n => map.set(n.product_id, sel.noveltyToProduct(n)));
    return map;
  }, [filteredProducts, sel]);

  return (
    <div className="space-y-3">
      <NoveltyToolbar
        query={searchQuery}
        suppliers={suppliers}
        categories={categories}
        selectedSupplier={selectedSupplier}
        selectedCategory={selectedCategory}
        sortMode={sortMode}
        filteredCount={filteredProducts.length}
        productCount={products.length}
        isLoading={isLoading}
        loadingProgress={loadingProgress}
        selectionMode={selectionMode}
        viewMode={viewMode}
        gridColumns={gridColumns}
        hasActiveFilters={hasActiveFilters}
        onQueryChange={setSearchQuery}
        onSupplierChange={setSelectedSupplier}
        onCategoryChange={setSelectedCategory}
        onSortChange={setSortMode}
        onToggleSelection={toggleSelectionMode}
        onClearFilters={clearFilters}
        onViewModeChange={setViewMode}
        onGridColumnsChange={setGridColumns}
      />

      <ResultSummary visible={!isLoading && filteredProducts.length > 0 && hasActiveFilters} filteredCount={filteredProducts.length} totalCount={products.length} />

      <div className="relative">
        <NoveltyResults
          products={filteredProducts}
          productMap={productMap}
          selection={sel}
          selectionMode={selectionMode}
          isLoading={isLoading}
          loadingProgress={loadingProgress}
          hasActiveFilters={hasActiveFilters}
          viewMode={viewMode}
          gridColumns={gridColumns}
          onClearFilters={clearFilters}
          onProductClick={handleProductClick}
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
          isInCompare={isInCompare}
          onToggleCompare={onToggleCompare}
          canAddToCompare={canAddToCompare}
        />
        <FetchingOverlay visible={isFetching && products.length > 0} />
      </div>

      <NoveltyBulkControls selectionMode={selectionMode} selection={sel} totalCount={filteredProducts.length} />
    </div>
  );
}
