import { useRef, useCallback, useEffect, useState, useMemo, type RefObject } from "react";
import type { ActiveColorFilter } from "@/utils/color-image-resolver";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import { ProductListItem } from "@/components/products/ProductListItem";
import { ProductTableView } from "@/components/products/ProductTableView";

import { ProductListSkeleton } from "@/components/products/ProductListItemSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { CatalogBulkModals } from "./CatalogBulkModals";
import { useCatalogSelection } from "./useCatalogSelection";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";
import type { ViewMode } from "@/hooks/useCatalogState";
import type { ColumnCount } from "@/components/products/ColumnSelector";
import { SparklineSalesProvider } from "@/hooks/useSparklineSales";
import { ProductGrid } from "@/components/products/ProductGrid";

interface CatalogContentProps {
  viewMode: ViewMode;
  shouldShowCatalogSkeleton: boolean;
  shouldShowEmptyState: boolean;
  catalogError?: Error | null;
  onRetryCatalog?: () => void;
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

const CONTAINER_CLASS = "h-[calc(100vh-180px)] min-h-[500px] overflow-y-auto rounded-xl border border-border/40 bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm scrollbar-products shadow-inner will-change-scroll";

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
  const virtualizer = useVirtualizer({ count: rowCount + 1, getScrollElement: () => parentRef.current, estimateSize: () => 88, overscan: 12 });

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
                <div className={cn("flex items-center gap-2 rounded-xl transition-all duration-200", isSelected && "ring-2 ring-sicoob-green/40 bg-sicoob-green/5")}>
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
type CatalogSelection = ReturnType<typeof useCatalogSelection>;

function CatalogErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const configurationMissing = /CATALOG_NOT_CONFIGURED|CATALOG_READ_ONLY/.test(error.message);
  const action = !configurationMissing && onRetry ? { label: "Tentar novamente", onClick: onRetry } : undefined;
  return <div className={`${CONTAINER_CLASS} p-4`} role="alert"><EmptyState variant="products" title={configurationMissing ? "Catálogo temporariamente indisponível" : "Não foi possível carregar o catálogo"} description={configurationMissing ? "A consulta aos produtos ainda precisa ser configurada. Tente novamente mais tarde ou fale com a equipe responsável." : "Houve uma falha na consulta aos produtos. Tente novamente em instantes."} action={action} className="min-h-[420px]" /></div>;
}

function CatalogEmptyState({ constrained, onReset }: { constrained: boolean; onReset?: () => void }) {
  const action = constrained && onReset ? { label: "Limpar tudo e ver catálogo completo", onClick: onReset } : undefined;
  return <div className={`${CONTAINER_CLASS} p-4`}><EmptyState variant={constrained ? "search" : "products"} title={constrained ? "Nenhum resultado para sua busca" : "Catálogo indisponível no momento"} description={constrained ? "Tente ajustar os filtros ou remover termos da busca para ampliar os resultados técnicos." : "O catálogo ainda não retornou itens para exibição."} action={action} className="min-h-[420px]" /></div>;
}

function buildSharedProps(props: CatalogContentProps, selection: CatalogSelection) {
  return {
    products: props.paginatedProducts, navigate: props.navigate, handleViewProduct: props.handleViewProduct, handleShareProduct: props.handleShareProduct,
    isFavorite: props.isFavorite, toggleFavorite: props.toggleFavorite, isInCompare: props.isInCompare, onToggleCompare: props.onToggleCompare, canAddToCompare: props.canAddToCompare,
    hasMore: props.hasMoreProducts, isLoadingMore: props.isLoadingMore, totalEstimate: props.totalEstimate,
    filteredCount: props.filteredProducts.length, loadMoreRef: props.loadMoreRef, itemsPerPage: props.itemsPerPage, onLoadMore: props.onLoadMore,
    selectionMode: props.selectionMode, selectedIds: selection.selectedIds, onToggleSelect: selection.toggleSelect,
    activeColorFilter: props.activeColorFilter,
  };
}

function CatalogTable({ props, selection }: { props: CatalogContentProps; selection: CatalogSelection }) {
  return (
    <div className={`${CONTAINER_CLASS}`}>
      {props.shouldShowCatalogSkeleton ? (
         <div className="p-4"><ProductListSkeleton count={12} /></div>
      ) : (
        <>
          <ProductTableView
            products={props.paginatedProducts} onProductClick={(id) => props.navigate(`/produto/${id}`)}
            isFavorite={props.isFavorite} onToggleFavorite={props.toggleFavorite}
            isInCompare={props.isInCompare} onToggleCompare={props.onToggleCompare} canAddToCompare={props.canAddToCompare}
            onShareProduct={props.handleShareProduct} selectionMode={props.selectionMode}
            selectedIds={selection.selectedIds} onToggleSelect={selection.toggleSelect} activeColorFilter={props.activeColorFilter}
          />
          {props.hasMoreProducts && (
            <div ref={props.loadMoreRef} className="flex flex-col items-center gap-3 pt-8 pb-4 px-4" style={{ minHeight: "60px" }}>
              <p className="text-sm text-muted-foreground">Mostrando {props.paginatedProducts.length} de {(props.totalEstimate ?? props.filteredProducts.length).toLocaleString("pt-BR")} produtos</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CatalogList({ props, productIds, sharedProps }: { props: CatalogContentProps; productIds: string[]; sharedProps: ReturnType<typeof buildSharedProps> }) {
  return <SparklineSalesProvider productIds={productIds}>
      {props.shouldShowCatalogSkeleton ? (
        <div className={`${CONTAINER_CLASS} p-4`}><ProductListSkeleton count={8} /></div>
      ) : (
        <VirtualList {...sharedProps} />
      )}
    </SparklineSalesProvider>;
}

function CatalogGrid({ props, productIds, sharedProps, selection }: { props: CatalogContentProps; productIds: string[]; sharedProps: ReturnType<typeof buildSharedProps>; selection: CatalogSelection }) {
  return <SparklineSalesProvider productIds={productIds}>
      <div className="rounded-2xl bg-background">
        <ProductGrid
          {...sharedProps}
          products={props.paginatedProducts}
          isLoading={props.shouldShowCatalogSkeleton}
          columns={props.gridColumns}
          onProductClick={(id) => props.selectionMode ? selection.toggleSelect(id) : props.navigate(`/produto/${id}`)}
          onViewProduct={props.handleViewProduct}
          onShareProduct={props.handleShareProduct}
        />
        <VirtualFooter
          hasMore={props.hasMoreProducts}
          loadMoreRef={props.loadMoreRef}
          productsCount={props.paginatedProducts.length}
          totalEstimate={props.totalEstimate}
          filteredCount={props.filteredProducts.length}
          isLoadingMore={props.isLoadingMore}
          itemsPerPage={props.itemsPerPage}
          skeletonType="grid"
        />
      </div>
    </SparklineSalesProvider>;
}

function CatalogView({ props, productIds, selection }: { props: CatalogContentProps; productIds: string[]; selection: CatalogSelection }) {
  const sharedProps = buildSharedProps(props, selection);
  if (props.viewMode === "table") return <CatalogTable props={props} selection={selection} />;
  if (props.viewMode === "list") return <CatalogList props={props} productIds={productIds} sharedProps={sharedProps} />;
  return <CatalogGrid props={props} productIds={productIds} sharedProps={sharedProps} selection={selection} />;
}

export function CatalogContent(props: CatalogContentProps) {
  const productIds = useMemo(() => props.paginatedProducts.map(product => product.id), [props.paginatedProducts]);
  const selection = useCatalogSelection(props.paginatedProducts, props.selectionMode, props.onSelectedCountChange);
  if (props.catalogError && props.paginatedProducts.length === 0) return <CatalogErrorState error={props.catalogError} onRetry={props.onRetryCatalog} />;
  if (props.shouldShowEmptyState) return <CatalogEmptyState constrained={props.hasActiveCatalogConstraints} onReset={props.onResetFilters} />;

  return (
    <>
      <CatalogView props={props} productIds={productIds} selection={selection} />
      <CatalogBulkModals sel={selection} selectionMode={props.selectionMode} totalCount={props.paginatedProducts.length} />
    </>
  );
}
