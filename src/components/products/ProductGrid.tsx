import { ProductCard } from "./ProductCard";
import type { Product } from "@/hooks/useProducts";
import type { ActiveColorFilter } from "@/utils/color-image-resolver";
import { useEffect, useState, useRef, useMemo } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

export interface ProductGridProps {
  products: Product[];
  onProductClick?: (productId: string) => void;
  onViewProduct?: (product: Product) => void;
  onShareProduct?: (product: Product) => void;
  onFavoriteProduct?: (product: Product) => void;
  isFavorite?: (productId: string) => boolean;
  onToggleFavorite?: (productId: string) => void;
  isInCompare?: (productId: string) => boolean;
  onToggleCompare?: (productId: string) => { added: boolean; isFull: boolean };
  canAddToCompare?: boolean;
  highlightColors?: string[];
  hideCategoryBadges?: boolean;
  activeColorFilter?: ActiveColorFilter | null;
  columns?: number;
  /** Selection mode props */
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

function ProductCardWrapper({ 
  product, 
  index, 
  isVisible,
  hideCategoryBadges,
  selectionMode,
  selectedIds,
  onToggleSelect,
  ...restProps 
}: { 
  product: Product; 
  index: number; 
  isVisible: boolean;
  hideCategoryBadges?: boolean;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
} & Omit<React.ComponentProps<typeof ProductCard>, 'product'>) {
  const reducedMotion = useReducedMotion();
  const [hasAnimated, setHasAnimated] = useState(reducedMotion);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) { setHasAnimated(true); return; }
    if (!hasAnimated) {
      const timer = setTimeout(() => setHasAnimated(true), Math.min(index * 80, 800));
      return () => clearTimeout(timer);
    }
  }, [hasAnimated, index, reducedMotion]);

  const isSelected = selectionMode && selectedIds?.has(product.id);

  return (
    <div
      ref={ref}
      className={cn(
        reducedMotion ? '' : `transition-all duration-500 ease-out ${
          hasAnimated ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
        }`,
        "relative",
        isSelected && "ring-2 ring-primary/40 rounded-xl"
      )}
      role="gridcell"
      aria-selected={isSelected}
      style={reducedMotion ? undefined : {
        transitionDelay: hasAnimated ? '0ms' : `${Math.min(index * 80, 800)}ms`,
      }}
    >
      {selectionMode && onToggleSelect && (
        <div 
          className="absolute top-2 left-2 z-20"
          onClick={(e) => { e.stopPropagation(); onToggleSelect(product.id); }}
        >
          <SelectionCheckbox
            checked={!!isSelected}
            onChange={() => onToggleSelect(product.id)}
            size="md"
          />
        </div>
      )}
      <ProductCard 
        product={product} 
        hideCategoryBadges={hideCategoryBadges} 
        {...restProps}
        onClick={selectionMode ? () => onToggleSelect?.(product.id) : restProps.onClick}
      />
    </div>
  );
}

const columnClasses: Record<number, string> = {
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  6: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
  8: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8",
};

export function ProductGrid({ 
  products,
  onProductClick,
  onViewProduct, 
  onShareProduct, 
  onFavoriteProduct,
  isFavorite,
  onToggleFavorite,
  isInCompare,
  onToggleCompare,
  canAddToCompare = true,
  highlightColors,
  hideCategoryBadges = false,
  activeColorFilter,
  columns = 5,
  selectionMode,
  selectedIds,
  onToggleSelect,
}: ProductGridProps) {
  const [isGridVisible, setIsGridVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determinar número de colunas baseado no viewport (breakpoints Tailwind padrão)
  const [currentCols, setCurrentCols] = useState(columns);
  
  useEffect(() => {
    const updateCols = () => {
      const width = window.innerWidth;
      if (width < 640) setCurrentCols(2);
      else if (width < 1024) setCurrentCols(3);
      else if (width < 1280) setCurrentCols(Math.min(columns, 4));
      else setCurrentCols(columns);
    };
    
    updateCols();
    const handleResize = () => {
      // Debounce opcional ou apenas throttle simples via requestAnimationFrame
      window.requestAnimationFrame(updateCols);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [columns]);

  const rowCount = useMemo(() => Math.ceil(products.length / currentCols), [products.length, currentCols]);
  
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 480, // Estimativa de altura do card + gap
    overscan: 3,
  });

  useEffect(() => {
    setIsGridVisible(false);
    const timer = setTimeout(() => setIsGridVisible(true), 50);
    return () => clearTimeout(timer);
  }, [products]);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="text-3xl">📦</span>
        </div>
        <h3 className="font-display text-lg font-semibold text-foreground mb-2">
          Nenhum produto encontrado
        </h3>
        <p className="text-muted-foreground max-w-md">
          Tente ajustar os filtros ou realizar uma nova busca para encontrar os produtos desejados.
        </p>
      </div>
    );
  }

  const currentCol = currentCols;

  return (
    <div 
      ref={containerRef}
      className="relative w-full overflow-hidden"
      role="grid"
      aria-label="Catálogo de produtos"
      aria-busy={!isGridVisible}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * currentCol;
          const rowProducts = products.slice(startIndex, startIndex + currentCol);

          return (
            <div
              key={virtualRow.key}
              className={`grid ${columnClasses[columns] || columnClasses[5]} absolute top-0 left-0 w-full ${
                columns >= 8 ? 'gap-x-4 gap-y-8' : columns >= 6 ? 'gap-x-6 gap-y-8' : 'gap-x-8 gap-y-8'
              }`}
              role="row"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {rowProducts.map((product, colIndex) => (
                <ProductCardWrapper
                  key={product.id}
                  product={product}
                  index={startIndex + colIndex}
                  isVisible={isGridVisible}
                  onClick={onProductClick ? () => onProductClick(product.id) : undefined}
                  onView={onViewProduct}
                  onShare={onShareProduct}
                  onFavorite={onFavoriteProduct}
                  isFavorited={isFavorite ? isFavorite(product.id) : false}
                  onToggleFavorite={onToggleFavorite}
                  isInCompare={isInCompare ? isInCompare(product.id) : false}
                  onToggleCompare={onToggleCompare}
                  canAddToCompare={canAddToCompare}
                  highlightColors={highlightColors}
                  hideCategoryBadges={hideCategoryBadges}
                  activeColorFilter={activeColorFilter}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelect={onToggleSelect}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}