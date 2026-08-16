/**
 * MockupProductSelector — Product selector for mockup generator
 * 
 * Uses lightweight product loading for the list (no images/variants/colors enrichment),
 * then lazy-loads full product data only when a product is selected.
 * Flow: Search products -> Select product -> Load full data -> Choose color/variant -> Confirmed.
 */

import { useState, useMemo, useRef, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import Fuse from "fuse.js";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, Package, X, SearchX, ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useProductsLightweight, type ProductLightweight } from "@/hooks/useProductsLightweight";
import { type Product } from "@/hooks/useProducts";
import { type ExternalVariantStock } from "@/hooks/useExternalVariantStock";
import { ProductLoaderAndColorSelector } from "./MockupColorSelector";
import { createProductFuseOptions, rankProductSearchResults } from "@/utils/product-search";

export interface MockupProductSelection {
  product: Product;
  variant: ExternalVariantStock | null;
  colorName?: string;
  colorHex?: string;
  /** Image URL to use for the mockup (variant-specific if available) */
  imageUrl: string;
}

interface MockupProductSelectorProps {
  selection: MockupProductSelection | null;
  onSelect: (selection: MockupProductSelection | null) => void;
  disabled?: boolean;
}

export function MockupProductSelector({ selection, onSelect, disabled }: MockupProductSelectorProps) {
  const { data: products = [], isLoading: isLoadingProducts } = useProductsLightweight();
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'default' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'>('default');
  const [scrollState, setScrollState] = useState({ top: false, bottom: true });
  
  // Internal state: product picked, loading full data or choosing color
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);

  const handleScroll = useCallback(() => {
    const el = scrollParentRef.current;
    if (!el) return;
    const atTop = el.scrollTop > 8;
    const atBottom = el.scrollTop + el.clientHeight < el.scrollHeight - 8;
    setScrollState({ top: atTop, bottom: atBottom });
  }, []);

  const debouncedQuery = useDebounce(searchQuery, 300);
  const isFilterPending = searchQuery.length >= 2 && searchQuery !== debouncedQuery;

  const fuse = useMemo(
    () => new Fuse(products, createProductFuseOptions<ProductLightweight>()),
    [products]
  );

  const filteredProducts = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return products;
    return rankProductSearchResults(products, debouncedQuery, fuse);
  }, [fuse, debouncedQuery, products]);

  const sortedProducts = useMemo(() => {
    if (sortBy === 'default') return filteredProducts;
    const sorted = [...filteredProducts];
    switch (sortBy) {
      case 'name-asc': return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc': return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'price-asc': return sorted.sort((a, b) => a.price - b.price);
      case 'price-desc': return sorted.sort((a, b) => b.price - a.price);
      default: return sorted;
    }
  }, [filteredProducts, sortBy]);

  const rowVirtualizer = useVirtualizer({
    count: sortedProducts.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const isSearching = debouncedQuery.length >= 2;
  const resultCount = sortedProducts.length;

  const handleProductPick = (product: ProductLightweight) => {
    setPendingProductId(product.id);
    setSearchQuery("");
  };

  const handleColorSelect = (variant: ExternalVariantStock | null, product: Product) => {
    const variantThumb = variant?.selected_thumbnail
      ? `${variant.selected_thumbnail}/thumbnail`
      : null;
    const variantFirstImg = variant?.images?.[0]
      ? `${variant.images[0]}/thumbnail`
      : null;
    const imageUrl = variantThumb || variantFirstImg || product.images?.[0] || '/placeholder.svg';
    
    onSelect({
      product,
      variant,
      colorName: variant?.color_name ?? undefined,
      colorHex: variant?.color_hex ?? undefined,
      imageUrl,
    });
    setPendingProductId(null);
  };

  const handleClear = () => {
    onSelect(null);
    setPendingProductId(null);
    setSearchQuery("");
  };

  // ─── State: Product + Color confirmed ──────────────────────────────
  if (selection) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border/30 bg-card">
        <div className="w-11 h-11 rounded-lg bg-muted overflow-hidden shrink-0">
          <img
            src={selection.imageUrl}
            alt={selection.product.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const t = e.currentTarget;
              if (t.src.includes('/thumbnail')) {
                t.src = t.src.replace('/thumbnail', '');
              } else if (selection.product.images?.[0]) {
                t.src = selection.product.images[0];
              } else {
                t.src = '/placeholder.svg';
              }
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate text-sm">{selection.product.name}</h4>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-mono tracking-wide">
              {selection.product.sku || 'N/A'}
            </span>
            {selection.colorName && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                {selection.colorHex && (
                  <div
                    className="w-2.5 h-2.5 rounded-full border border-border/50"
                    style={{ backgroundColor: selection.colorHex }}
                  />
                )}
                {selection.colorName}
              </Badge>
            )}
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 hover:bg-destructive/10 hover:text-destructive"
          onClick={handleClear}
          disabled={disabled}
         aria-label="Fechar"><X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // ─── State: Product picked, loading full data + choosing color ─────
  if (pendingProductId) {
    return (
      <ProductLoaderAndColorSelector
        productId={pendingProductId}
        onSelect={handleColorSelect}
        onBack={() => setPendingProductId(null)}
      />
    );
  }

  // ─── State: Product list (search) ──────────────────────────────────
  return (
    <div className="flex flex-col rounded-lg overflow-hidden" style={{ maxHeight: '420px' }}>
      {/* Search */}
      <div className="p-3 space-y-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-11 text-sm border-primary/30 focus-visible:ring-primary/20"
            disabled={disabled || isLoadingProducts}
          />
          {searchQuery && (
            <button aria-label="Fechar"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {isLoadingProducts
              ? 'Carregando produtos...'
              : isSearching
                ? `${resultCount} resultado${resultCount !== 1 ? 's' : ''}`
                : `${products.length} produtos disponíveis`}
          </p>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-[11px] border rounded-md px-2 py-1 bg-background text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <option value="default">Relevância</option>
            <option value="name-asc">Nome A→Z</option>
            <option value="name-desc">Nome Z→A</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
          </select>
        </div>
      </div>

      {/* Virtualized product list */}
      <div className="relative flex-1 min-h-0">
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-6 z-10 transition-opacity duration-200"
          style={{
            opacity: scrollState.top ? 1 : 0,
            background: 'linear-gradient(to bottom, hsl(var(--background)), transparent)',
          }}
        />
        <div
          ref={scrollParentRef}
          className="pr-2 overflow-auto h-full"
          style={{ maxHeight: '340px' }}
          onScroll={handleScroll}
        >
          {isLoadingProducts || isFilterPending ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-border/30">
                  <Skeleton className="w-12 h-12 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <SearchX className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-base">Nenhum produto encontrado</p>
              {isSearching && (
                <p className="text-xs mt-1.5">Tente ajustar o termo de busca</p>
              )}
              {searchQuery && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setSearchQuery("")}>
                  Limpar busca
                </Button>
              )}
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const product = sortedProducts[virtualRow.index];
                if (!product) return null;
                return (
                  <div
                    key={product.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="py-0.5 px-1"
                  >
                    <div
                      onClick={() => handleProductPick(product)}
                      className="group flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent hover:bg-accent/60 hover:border-border/30 cursor-pointer transition-all duration-200 h-full"
                    >
                      {/* Thumbnail */}
                      <div className="w-11 h-11 rounded-lg bg-muted overflow-hidden shrink-0">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <h4 className="font-medium truncate text-sm leading-tight" title={product.name}>
                          {product.name}
                        </h4>
                        <span className="text-[11px] text-muted-foreground font-mono tracking-wide">
                          {product.sku || 'N/A'}
                        </span>
                      </div>

                      {/* Price + Stock */}
                      <div className="text-right shrink-0 pl-2">
                        <p className="text-sm font-semibold text-primary tabular-nums whitespace-nowrap">
                          {formatCurrency(product.price)}
                        </p>
                        {product.stock > 0 ? (
                          <p className="text-[10px] text-primary whitespace-nowrap">
                            ⊕ {product.stock >= 1000 ? `${(product.stock / 1000).toFixed(1)}k` : product.stock} un
                          </p>
                        ) : (
                          <p className="text-[10px] text-destructive whitespace-nowrap">
                            △ Sem estoque
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 z-10 transition-opacity duration-200"
          style={{
            opacity: scrollState.bottom ? 1 : 0,
            background: 'linear-gradient(to top, hsl(var(--background)), transparent)',
          }}
        />
      </div>
    </div>
  );
}

// Re-export from extracted module
export { ProductLoaderAndColorSelector } from "./MockupColorSelector";
