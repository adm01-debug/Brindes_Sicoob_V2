import { type ReactNode, type RefObject, useRef, useCallback, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowUp } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { ProductListItem } from "./ProductListItem";
import { ProductCardSkeleton } from "./ProductCardSkeleton";
import { InlineFilterBar } from "@/components/filters/StickyFilterBar";
import type { Product } from "@/hooks/useProducts";
import type { ActiveColorFilter } from "@/utils/color-image-resolver";

interface VirtualizedProductGridProps {
  products: Product[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  columns?: number;
  onProductClick?: (product: Product) => void;
  isFavorited?: (productId: string) => boolean;
  onToggleFavorite?: (productId: string) => void;
  isInCompare?: (productId: string) => boolean;
  onToggleCompare?: (productId: string) => { added: boolean; isFull: boolean };
  canAddToCompare?: boolean;
  onShare?: (product: Product) => void;
  // Filter controls
  activeFiltersCount?: number;
  sortBy?: string;
  onSortChange?: (value: string) => void;
  onOpenFilters?: () => void;
  onClearFilters?: () => void;
  viewMode?: "grid" | "list" | "table";
  onViewModeChange?: (mode: "grid" | "list" | "table") => void;
  showFilterBar?: boolean;
  /** Filtros de cor ativos para mostrar imagem específica da cor no card */
  activeColorFilter?: ActiveColorFilter | null;
  /** Column selector React node to render in the filter bar */
  columnSelector?: ReactNode;
  /** External selection mode */
  selectionMode?: boolean;
  /** External selected IDs */
  selectedIds?: Set<string>;
  /** External toggle handler */
  onToggleSelect?: (id: string) => void;
}

type ProductActions = Pick<VirtualizedProductGridProps, "onProductClick" | "isFavorited" | "onToggleFavorite" | "isInCompare" | "onToggleCompare" | "canAddToCompare" | "onShare" | "activeColorFilter" | "selectionMode" | "selectedIds" | "onToggleSelect">;

function GridProductCell({ product, actions }: { product: Product; actions: ProductActions }) {
  const selected = actions.selectedIds?.has(product.id) ?? false;
  return (
    <div className={cn("relative transition-all duration-200", actions.selectionMode && selected && "ring-2 ring-primary/50 rounded-2xl shadow-md")} style={{ zIndex: 1 }}>
      {actions.selectionMode && <button className={cn("absolute top-2 left-2 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200", selected ? "bg-primary border-primary text-primary-foreground scale-100" : "border-muted-foreground/40 bg-card/80 backdrop-blur-sm hover:border-primary/60")} onClick={(event) => { event.stopPropagation(); actions.onToggleSelect?.(product.id); }}>{selected && <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M11.5 3.5L5.5 10L2.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}</button>}
      <ProductCard product={product} onClick={() => actions.onProductClick?.(product)} isFavorited={actions.isFavorited?.(product.id)} onToggleFavorite={actions.onToggleFavorite} isInCompare={actions.isInCompare?.(product.id)} onToggleCompare={actions.onToggleCompare} canAddToCompare={actions.canAddToCompare} onShare={actions.onShare} activeColorFilter={actions.activeColorFilter} />
    </div>
  );
}

function ProductCell({ product, viewMode, actions }: { product: Product; viewMode: VirtualizedProductGridProps["viewMode"]; actions: ProductActions }) {
  if (viewMode === "list") return <ProductListItem product={product} onClick={() => actions.onProductClick?.(product)} isFavorited={actions.isFavorited?.(product.id)} onToggleFavorite={actions.onToggleFavorite} isInCompare={actions.isInCompare?.(product.id)} onToggleCompare={actions.onToggleCompare} canAddToCompare={actions.canAddToCompare} activeColorFilter={actions.activeColorFilter} />;
  return <GridProductCell product={product} actions={actions} />;
}

function rowStyle(viewMode: VirtualizedProductGridProps["viewMode"], effectiveColumns: number, columnGap: number, rowGap: number) {
  const shared = { position: "absolute" as const, top: 0, left: 0, width: "100%", paddingLeft: "0.5rem", paddingRight: "1.5rem", paddingBottom: `${rowGap}px` };
  if (viewMode === "list") return { ...shared, display: "flex", flexDirection: "column" as const };
  return { ...shared, display: "grid", gridTemplateColumns: `repeat(${effectiveColumns}, minmax(0, 1fr))`, columnGap: `${columnGap}px`, isolation: "isolate" as const };
}

function ProductVirtualRow({ row, rowCount, hasMore, products, effectiveColumns, viewMode, columnGap, rowGap, measureElement, actions }: { row: { index: number; size: number; start: number; key: string | number | bigint }; rowCount: number; hasMore: boolean; products: Product[]; effectiveColumns: number; viewMode: VirtualizedProductGridProps["viewMode"]; columnGap: number; rowGap: number; measureElement: (node: Element | null) => void; actions: ProductActions }) {
  if (row.index === rowCount && hasMore) {
    return <div key="loader" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: `${row.size}px`, transform: `translateY(${row.start}px)` }} className="flex items-center justify-center py-8"><div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><span>Carregando mais produtos...</span></div></div>;
  }
  const startIndex = row.index * effectiveColumns;
  const rowProducts = products.slice(startIndex, startIndex + effectiveColumns);
  return (
    <div key={row.key} data-index={row.index} ref={measureElement} style={{ ...rowStyle(viewMode, effectiveColumns, columnGap, rowGap), transform: `translateY(${row.start}px)` }}>
      {rowProducts.map((product) => <ProductCell key={product.id} product={product} viewMode={viewMode} actions={actions} />)}
    </div>
  );
}

function gridMetrics(columns: number, viewMode: VirtualizedProductGridProps["viewMode"]) {
  const effectiveColumns = viewMode === "list" ? 1 : columns;
  const columnGap = effectiveColumns >= 8 ? 16 : effectiveColumns >= 6 ? 24 : 32;
  const rowGap = viewMode === "list" ? 8 : 32;
  const estimatedRowHeight = viewMode === "list" ? 88 : effectiveColumns >= 8 ? 420 : effectiveColumns >= 6 ? 460 : 520;
  return { effectiveColumns, columnGap, rowGap, estimatedRowHeight };
}

function VirtualFilterBar({ props }: { props: Pick<VirtualizedProductGridProps, "showFilterBar" | "onSortChange" | "onOpenFilters" | "onClearFilters" | "onViewModeChange" | "activeFiltersCount" | "products" | "sortBy" | "viewMode" | "columnSelector"> }) {
  const { showFilterBar, onSortChange, onOpenFilters, onClearFilters, onViewModeChange, activeFiltersCount, products, sortBy, viewMode, columnSelector } = props;
  if (!showFilterBar || !onSortChange || !onOpenFilters || !onClearFilters || !onViewModeChange) return null;
  return <div className="sticky top-[calc(var(--header-h,56px)+var(--breadcrumb-h,0px))] z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-2.5 mb-2"><InlineFilterBar activeFiltersCount={activeFiltersCount ?? 0} totalProducts={products.length} sortBy={sortBy ?? "name"} onSortChange={onSortChange} onOpenFilters={onOpenFilters} onClearFilters={onClearFilters} viewMode={viewMode ?? "grid"} onViewModeChange={onViewModeChange} columnSelector={columnSelector} /></div>;
}

function ScrollTopButton({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return <AnimatePresence>{visible && <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute bottom-4 right-4 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors z-30" onClick={onClick} title="Voltar ao topo"><ArrowUp className="h-5 w-5" /></motion.button>}</AnimatePresence>;
}

function LoadingProductGrid() {
  return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{Array.from({ length: 12 }).map((_, index) => <ProductCardSkeleton key={index} />)}</div>;
}

interface ProductVirtualizerOptions {
  parentRef: RefObject<HTMLDivElement>;
  rowCount: number;
  hasMore: boolean;
  estimatedRowHeight: number;
  viewMode: VirtualizedProductGridProps["viewMode"];
}

function useProductVirtualizer({ parentRef, rowCount, hasMore, estimatedRowHeight, viewMode }: ProductVirtualizerOptions) {
  return useVirtualizer({
    count: rowCount + Number(hasMore),
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: viewMode === "list" ? 8 : 3,
    measureElement: (element) => element.getBoundingClientRect().height,
  });
}

function isInitialProductLoad(isLoading: boolean, productCount: number) {
  return isLoading && productCount === 0;
}

function normalizeGridProps(props: VirtualizedProductGridProps) {
  return {
    ...props,
    isLoading: props.isLoading ?? false,
    hasMore: props.hasMore ?? false,
    columns: props.columns ?? 4,
    canAddToCompare: props.canAddToCompare ?? true,
    activeFiltersCount: props.activeFiltersCount ?? 0,
    sortBy: props.sortBy ?? "name",
    viewMode: props.viewMode ?? "grid",
    showFilterBar: props.showFilterBar ?? true,
    selectionMode: props.selectionMode ?? false,
  };
}

function useVirtualScroll({ hasMore, isLoading, onLoadMore, productCount }: { hasMore: boolean; isLoading: boolean; onLoadMore?: () => void; productCount: number }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const handleScroll = useCallback(() => {
    if (!parentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    setShowScrollTop(scrollTop > 300);
    if (!hasMore || loadingMore || isLoading || scrollHeight - scrollTop - clientHeight >= 500) return;
    setLoadingMore(true); onLoadMore?.();
  }, [hasMore, loadingMore, isLoading, onLoadMore]);
  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;
    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => element.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);
  useEffect(() => { setLoadingMore(false); }, [productCount]);
  const scrollToTop = () => parentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  return { parentRef, showScrollTop, scrollToTop };
}

export function VirtualizedProductGrid(props: VirtualizedProductGridProps) {
  const { products, isLoading, hasMore, onLoadMore, columns, onProductClick, isFavorited, onToggleFavorite, isInCompare, onToggleCompare, canAddToCompare, onShare, activeFiltersCount, sortBy, onSortChange, onOpenFilters, onClearFilters, viewMode, onViewModeChange, showFilterBar, activeColorFilter, columnSelector, selectionMode, selectedIds, onToggleSelect } = normalizeGridProps(props);
  const { parentRef, showScrollTop, scrollToTop } = useVirtualScroll({ hasMore, isLoading, onLoadMore, productCount: products.length });

  // In list mode, always 1 column; in grid mode use columns prop
  const { effectiveColumns, columnGap, rowGap, estimatedRowHeight } = gridMetrics(columns, viewMode);

  // Calculate rows based on columns
  const rowCount = Math.ceil(products.length / effectiveColumns);
  const virtualizer = useProductVirtualizer({ parentRef, rowCount, hasMore, estimatedRowHeight, viewMode });

  const virtualItems = virtualizer.getVirtualItems();

  if (isInitialProductLoad(isLoading, products.length)) {
    return <LoadingProductGrid />;
  }

  return (
    <div className="relative h-full">
      <div
        ref={parentRef}
        className="h-[calc(100vh-200px)] min-h-[600px] overflow-y-auto rounded-xl border border-border/40 
          bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm
          scrollbar-products shadow-inner"
        style={{ contain: "strict" }}
      >
        {/* Barra de filtros sticky DENTRO do container de scroll */}
        <VirtualFilterBar props={{ showFilterBar, onSortChange, onOpenFilters, onClearFilters, onViewModeChange, activeFiltersCount, products, sortBy, viewMode, columnSelector }} />
        
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
            padding: "1rem",
          }}
        >
          {virtualItems.map((row) => <ProductVirtualRow key={row.key} row={row} rowCount={rowCount} hasMore={hasMore} products={products} effectiveColumns={effectiveColumns} viewMode={viewMode} columnGap={columnGap} rowGap={rowGap} measureElement={virtualizer.measureElement} actions={{ onProductClick, isFavorited, onToggleFavorite, isInCompare, onToggleCompare, canAddToCompare, onShare, activeColorFilter, selectionMode, selectedIds, onToggleSelect }} />)}
        </div>
      </div>

      {/* Scroll to top button - posicionado dentro do container */}
      <ScrollTopButton visible={showScrollTop} onClick={scrollToTop} />
    </div>
  );
}
