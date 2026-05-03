import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import type { ActiveColorFilter } from "@/utils/color-image-resolver";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2, ArrowUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductListItem } from "@/components/products/ProductListItem";
import { ProductTableView } from "@/components/products/ProductTableView";
import { ProductGridSkeleton } from "@/components/products/ProductCardSkeleton";
import { ProductListSkeleton } from "@/components/products/ProductListItemSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { CatalogBulkModals } from "./CatalogBulkModals";
import { useCatalogSelection } from "./useCatalogSelection";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";
import type { ViewMode } from "@/hooks/useCatalogState";
import type { ColumnCount } from "@/components/products/ColumnSelector";
import type { RefObject } from "react";
import { SparklineSalesProvider } from "@/hooks/useSparklineSales";

interface CatalogContentProps {
  viewMode: ViewMode;
  shouldShowCatalogSkeleton: boolean;
  shouldShowEmptyState: boolean;
  hasActiveCatalogConstraints: boolean;
  paginatedProducts: Product[];
  filteredProducts: Product[];
  gridColumns: ColumnCount;
  hasMoreProducts: boolean;
  isLoadingMore: boolean;
  totalEstimate: number | null;
  loadMoreRef: RefObject<HTMLDivElement>;
  itemsPerPage: number;
  navigate: (path: string) => void;
  handleViewProduct: (p: Product) => void;
  handleShareProduct: (p: Product) => void;
  handleFavoriteProduct: (p: Product) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  isInCompare: (id: string) => boolean;
  onToggleCompare: (id: string) => { added: boolean; isFull: boolean };
  canAddToCompare: boolean;
  onLoadMore?: () => void;
  onResetFilters?: () => void;
  selectionMode?: boolean;
  onSelectedCountChange?: (count: number) => void;
  activeColorFilter?: ActiveColorFilter | null;
}

// ─── Shared scroll-to-top button ────────────────────────────────────
function ScrollToTopButton({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
          className="absolute bottom-4 right-4 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors z-30"
          onClick={onClick} title="Voltar ao topo">
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ─── Footer row (shared between grid & list) ────────────────────────
function VirtualFooter({ hasMore, loadMoreRef, productsCount, totalEstimate, filteredCount, isLoadingMore, itemsPerPage, skeletonType }: {
  hasMore: boolean; loadMoreRef: RefObject<HTMLDivElement>; productsCount: number;
  totalEstimate: number | null; filteredCount: number; isLoadingMore: boolean; itemsPerPage: number;
  skeletonType: "grid" | "list";
}) {
  const total = (totalEstimate ?? filteredCount).toLocaleString("pt-BR");
  if (hasMore) return (
    <div className="flex flex-col items-center gap-3 pt-8 pb-4 px-4">
      <div ref={loadMoreRef} style={{ minHeight: "1px" }} />
      <p className="text-sm text-muted-foreground">Mostrando {productsCount} de {total} produtos</p>
      {isLoadingMore && (skeletonType === "grid"
        ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full mt-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="space-y-3"><Skeleton className="aspect-square w-full rounded-xl" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>)}</div>
        : <ProductListSkeleton count={3} />
      )}
    </div>
  );
  if (productsCount > itemsPerPage) return <p className="text-sm text-muted-foreground text-center pt-8 pb-4">Todos os {total} produtos foram carregados ✓</p>;
  return null;
}

// ─── useScrollableVirtualizer — shared scroll logic ─────────────────
function useScrollableContainer(hasMore: boolean, isLoadingMore: boolean, onLoadMore?: () => void) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = useCallback(() => {
    if (!parentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    setShowScrollTop(scrollTop > 400);
    if (hasMore && !isLoadingMore && onLoadMore && scrollHeight - scrollTop - clientHeight < 500) onLoadMore();
  }, [hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToTop = useCallback(() => parentRef.current?.scrollTo({ top: 0, behavior: "smooth" }), []);

  return { parentRef, showScrollTop, scrollToTop };
}

const CONTAINER_CLASS = "h-[calc(100vh-200px)] min-h-[550px] overflow-y-auto rounded-xl border border-border/40 bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm scrollbar-products shadow-inner";

// ─── VirtualGrid ────────────────────────────────────────────────────
function VirtualGrid({ products, columns, navigate, handleViewProduct, handleShareProduct, isFavorite, toggleFavorite, isInCompare, onToggleCompare, canAddToCompare, hasMore, isLoadingMore, totalEstimate, filteredCount, loadMoreRef, itemsPerPage, onLoadMore, selectionMode, selectedIds, onToggleSelect, activeColorFilter }: {
  products: Product[]; columns: ColumnCount; navigate: (p: string) => void;
  handleViewProduct: (p: Product) => void; handleShareProduct: (p: Product) => void;
  isFavorite: (id: string) => boolean; toggleFavorite: (id: string) => void;
  isInCompare: (id: string) => boolean; onToggleCompare: (id: string) => { added: boolean; isFull: boolean }; canAddToCompare: boolean;
  hasMore: boolean; isLoadingMore: boolean; totalEstimate: number | null; filteredCount: number;
  loadMoreRef: RefObject<HTMLDivElement>; itemsPerPage: number; onLoadMore?: () => void;
  selectionMode?: boolean; selectedIds?: Set<string>; onToggleSelect?: (id: string) => void;
  activeColorFilter?: ActiveColorFilter | null;
}) {
  const { parentRef, showScrollTop, scrollToTop } = useScrollableContainer(hasMore, isLoadingMore, onLoadMore);
  const rowCount = Math.ceil(products.length / columns);

  const estimateRowHeight = useCallback(() => {
    if (columns <= 1) return 520; if (columns <= 2) return 500;
    if (columns >= 8) return 380; if (columns >= 6) return 420; if (columns >= 5) return 460;
    return 500;
  }, [columns]);

  const virtualizer = useVirtualizer({ count: rowCount + 1, getScrollElement: () => parentRef.current, estimateSize: estimateRowHeight, overscan: 3 });
  const gap = columns >= 8 ? 16 : columns >= 6 ? 24 : 32;

  return (
    <div className="relative h-full">
      <div ref={parentRef} className={CONTAINER_CLASS} style={{ contain: "strict" }}>
        <div style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%", position: "relative", padding: "1rem" }}>
          {virtualizer.getVirtualItems().map((vr) => {
            if (vr.index === rowCount) return (
              <div key="footer" style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vr.start}px)` }}>
                <VirtualFooter hasMore={hasMore} loadMoreRef={loadMoreRef} productsCount={products.length} totalEstimate={totalEstimate} filteredCount={filteredCount} isLoadingMore={isLoadingMore} itemsPerPage={itemsPerPage} skeletonType="grid" />
              </div>
            );
            const startIdx = vr.index * columns;
            const rowProducts = products.slice(startIdx, startIdx + columns);
            return (
              <div key={vr.key} data-index={vr.index} ref={virtualizer.measureElement}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vr.start}px)`, display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, columnGap: `${gap}px`, paddingBottom: `${gap}px` }}>
                {rowProducts.map((product) => {
                  const isSelected = selectionMode && selectedIds?.has(product.id);
                  return (
                    <div key={product.id} className="relative">
                      {selectionMode && <div className="absolute top-2.5 left-2.5 z-20"><SelectionCheckbox checked={!!isSelected} onChange={() => onToggleSelect?.(product.id)} size="lg" animateEntry /></div>}
                      <div className={cn("transition-all duration-200 rounded-xl", isSelected && "ring-2 ring-primary/50 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.3)]")}>
                        <ProductCard
                          product={product}
                          onClick={() => selectionMode ? onToggleSelect?.(product.id) : navigate(`/produto/${product.id}`)}
                          onView={handleViewProduct}
                          onShare={handleShareProduct}
                          isFavorited={isFavorite(product.id)}
                          onToggleFavorite={toggleFavorite}
                          isInCompare={isInCompare(product.id)}
                          onToggleCompare={onToggleCompare}
                          canAddToCompare={canAddToCompare}
                          activeColorFilter={activeColorFilter}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <ScrollToTopButton show={showScrollTop} onClick={scrollToTop} />
    </div>
  );
}

// ─── VirtualList ────────────────────────────────────────────────────
function VirtualList({ products, navigate, handleViewProduct, handleShareProduct, isFavorite, toggleFavorite, isInCompare, onToggleCompare, canAddToCompare, hasMore, isLoadingMore, totalEstimate, filteredCount, loadMoreRef, itemsPerPage, onLoadMore, selectionMode, selectedIds, onToggleSelect, activeColorFilter }: {
  products: Product[]; navigate: (p: string) => void;
  handleViewProduct: (p: Product) => void; handleShareProduct: (p: Product) => void;
  isFavorite: (id: string) => boolean; toggleFavorite: (id: string) => void;
  isInCompare: (id: string) => boolean; onToggleCompare: (id: string) => { added: boolean; isFull: boolean }; canAddToCompare: boolean;
  hasMore: boolean; isLoadingMore: boolean; totalEstimate: number | null; filteredCount: number;
  loadMoreRef: RefObject<HTMLDivElement>; itemsPerPage: number; onLoadMore?: () => void;
  selectionMode?: boolean; selectedIds?: Set<string>; onToggleSelect?: (id: string) => void;
  activeColorFilter?: ActiveColorFilter | null;
}) {
  const { parentRef, showScrollTop, scrollToTop } = useScrollableContainer(hasMore, isLoadingMore, onLoadMore);
  const rowCount = products.length;
  const virtualizer = useVirtualizer({ count: rowCount + 1, getScrollElement: () => parentRef.current, estimateSize: () => 88, overscan: 8 });

  return (
    <div className="relative h-full">
      <div ref={parentRef} className={CONTAINER_CLASS} style={{ contain: "strict" }}>
        <div style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%", position: "relative", padding: "1rem" }}>
          {virtualizer.getVirtualItems().map((vr) => {
            if (vr.index === rowCount) return (
              <div key="footer" style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vr.start}px)` }}>
                <VirtualFooter hasMore={hasMore} loadMoreRef={loadMoreRef} productsCount={products.length} totalEstimate={totalEstimate} filteredCount={filteredCount} isLoadingMore={isLoadingMore} itemsPerPage={itemsPerPage} skeletonType="list" />
              </div>
            );
            const product = products[vr.index];
            if (!product) return null;
            const isSelected = selectionMode && selectedIds?.has(product.id);
            return (
              <div key={vr.key} data-index={vr.index} ref={virtualizer.measureElement}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vr.start}px)`, paddingBottom: "8px" }}>
                <div className={cn("flex items-center gap-2 rounded-xl transition-all duration-200", isSelected && "ring-2 ring-primary/40 bg-primary/5")}>
                  {selectionMode && <div className="flex-shrink-0 ml-1"><SelectionCheckbox checked={!!isSelected} onChange={() => onToggleSelect?.(product.id)} size="md" /></div>}
                  <div className="flex-1 min-w-0">
                    <ProductListItem product={product} onClick={() => selectionMode ? onToggleSelect?.(product.id) : navigate(`/produto/${product.id}`)} onView={handleViewProduct} onShare={handleShareProduct} isFavorited={isFavorite(product.id)} onToggleFavorite={toggleFavorite} isInCompare={isInCompare(product.id)} onToggleCompare={onToggleCompare} canAddToCompare={canAddToCompare} activeColorFilter={activeColorFilter} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <ScrollToTopButton show={showScrollTop} onClick={scrollToTop} />
    </div>
  );
}

// ─── CatalogContent — Orchestrator ──────────────────────────────────
export function CatalogContent({
  viewMode, shouldShowCatalogSkeleton, shouldShowEmptyState, hasActiveCatalogConstraints,
  paginatedProducts, filteredProducts, gridColumns, hasMoreProducts, isLoadingMore, totalEstimate,
  loadMoreRef, itemsPerPage, navigate, handleViewProduct, handleShareProduct,
  handleFavoriteProduct, isFavorite, toggleFavorite, isInCompare, onToggleCompare, canAddToCompare,
  onLoadMore, onResetFilters, selectionMode, onSelectedCountChange, activeColorFilter,
}: CatalogContentProps) {
  const sparklineProductIds = useMemo(() => paginatedProducts.map(p => p.id), [paginatedProducts]);
  const sel = useCatalogSelection(paginatedProducts, selectionMode, onSelectedCountChange);

  const sharedProps = {
    products: paginatedProducts, navigate, handleViewProduct, handleShareProduct,
    isFavorite, toggleFavorite, isInCompare, onToggleCompare, canAddToCompare,
    hasMore: hasMoreProducts, isLoadingMore, totalEstimate,
    filteredCount: filteredProducts.length, loadMoreRef, itemsPerPage, onLoadMore,
    selectionMode, selectedIds: sel.selectedIds, onToggleSelect: sel.toggleSelect,
    activeColorFilter,
  };

  if (shouldShowCatalogSkeleton) {
    return (
      <div className={`${CONTAINER_CLASS} p-4`}>
        {viewMode === "grid" ? <ProductGridSkeleton count={8} /> : <ProductListSkeleton count={viewMode === "table" ? 12 : 8} />}
      </div>
    );
  }

  if (shouldShowEmptyState) {
    return (
      <div className={`${CONTAINER_CLASS} p-4`}>
        <EmptyState
          variant={hasActiveCatalogConstraints ? "search" : "products"}
          title={hasActiveCatalogConstraints ? "Nenhum produto encontrado" : "Catálogo indisponível no momento"}
          description={hasActiveCatalogConstraints ? "Tente ajustar os filtros, remover termos da busca ou buscar em todas as categorias." : "O catálogo ainda não retornou itens para exibição."}
          action={hasActiveCatalogConstraints && onResetFilters ? { label: "Limpar tudo e ver catálogo completo", onClick: onResetFilters } : undefined}
          className="min-h-[420px]"
        />
      </div>
    );
  }

  const content = viewMode === "table" ? (
    <div className={`${CONTAINER_CLASS}`}>
      <ProductTableView
        products={paginatedProducts} onProductClick={(id) => navigate(`/produto/${id}`)}
        isFavorite={isFavorite} onToggleFavorite={toggleFavorite}
        isInCompare={isInCompare} onToggleCompare={onToggleCompare} canAddToCompare={canAddToCompare}
        onShareProduct={handleShareProduct} selectionMode={selectionMode}
        selectedIds={sel.selectedIds} onToggleSelect={sel.toggleSelect} activeColorFilter={activeColorFilter}
      />
      {hasMoreProducts && (
        <div ref={loadMoreRef} className="flex flex-col items-center gap-3 pt-8 pb-4 px-4" style={{ minHeight: "60px" }}>
          <p className="text-sm text-muted-foreground">Mostrando {paginatedProducts.length} de {(totalEstimate ?? filteredProducts.length).toLocaleString("pt-BR")} produtos</p>
        </div>
      )}
    </div>
  ) : viewMode === "list" ? (
    <SparklineSalesProvider productIds={sparklineProductIds}><VirtualList {...sharedProps} /></SparklineSalesProvider>
  ) : (
    <SparklineSalesProvider productIds={sparklineProductIds}><VirtualGrid {...sharedProps} columns={gridColumns} /></SparklineSalesProvider>
  );

  return (
    <>
      {content}
      <CatalogBulkModals sel={sel} selectionMode={selectionMode} totalCount={paginatedProducts.length} />
    </>
  );
}
