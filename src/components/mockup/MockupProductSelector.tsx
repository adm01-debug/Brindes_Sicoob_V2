/**
 * MockupProductSelector — Product selector for mockup generator
 * 
 * Uses lightweight product loading for the list (no images/variants/colors enrichment),
 * then lazy-loads full product data only when a product is selected.
 * Flow: Search products -> Select product -> Load full data -> Choose color/variant -> Confirmed.
 */

import { useState, useMemo, useRef, useCallback, type SyntheticEvent, type RefObject, type ReactNode } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import Fuse from "fuse.js";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { Search, X, SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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

type SortMode = 'default' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';
const PLACEHOLDER_IMAGE = '/placeholder.svg';

function sortProducts(products: ProductLightweight[], sortBy: SortMode) {
  if (sortBy === 'default') return products;
  const sorted = [...products];
  const comparators: Record<Exclude<SortMode, "default">, (left: ProductLightweight, right: ProductLightweight) => number> = {
    'name-asc': (left, right) => left.name.localeCompare(right.name),
    'name-desc': (left, right) => right.name.localeCompare(left.name),
    'price-asc': (left, right) => left.price - right.price,
    'price-desc': (left, right) => right.price - left.price,
  };
  return sorted.sort(comparators[sortBy]);
}

function variantImage(variant: ExternalVariantStock | null, product: Product) {
  if (variant?.selected_thumbnail) return `${variant.selected_thumbnail}/thumbnail`;
  if (variant?.images?.[0]) return `${variant.images[0]}/thumbnail`;
  return product.images?.[0] || PLACEHOLDER_IMAGE;
}

function SelectedProduct({ selection, disabled, onClear }: { selection: MockupProductSelection; disabled?: boolean; onClear: () => void }) {
  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (image.src.includes('/thumbnail')) image.src = image.src.replace('/thumbnail', '');
    else image.src = selection.product.images?.[0] || PLACEHOLDER_IMAGE;
  };
  return <div className="flex items-center gap-3 p-3 rounded-lg border border-border/30 bg-card"><div className="w-11 h-11 rounded-lg bg-muted overflow-hidden shrink-0"><img src={selection.imageUrl} alt={selection.product.name} className="w-full h-full object-cover" loading="lazy" onError={handleImageError} /></div><div className="flex-1 min-w-0"><h4 className="font-medium truncate text-sm">{selection.product.name}</h4><div className="flex items-center gap-2"><span className="text-[11px] text-muted-foreground font-mono tracking-wide">{selection.product.sku || 'N/A'}</span>{selection.colorName && <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">{selection.colorHex && <div className="w-2.5 h-2.5 rounded-full border border-border/50" style={{ backgroundColor: selection.colorHex }} />}{selection.colorName}</Badge>}</div></div><Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 hover:bg-destructive/10 hover:text-destructive" onClick={onClear} disabled={disabled} aria-label="Fechar"><X className="h-3.5 w-3.5" /></Button></div>;
}

function ProductSearchHeader({ query, setQuery, sortBy, setSortBy, disabled, isLoading, isSearching, resultCount, total }: { query: string; setQuery: (value: string) => void; sortBy: SortMode; setSortBy: (value: SortMode) => void; disabled?: boolean; isLoading: boolean; isSearching: boolean; resultCount: number; total: number }) {
  const label = isLoading ? 'Carregando produtos...' : isSearching ? `${resultCount} resultado${resultCount !== 1 ? 's' : ''}` : `${total} produtos disponíveis`;
  return <div className="p-3 space-y-2 shrink-0"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por nome ou SKU..." value={query} onChange={(event) => setQuery(event.target.value)} className="pl-10 pr-10 h-11 text-sm border-primary/30 focus-visible:ring-primary/20" disabled={disabled || isLoading} />{query && <button aria-label="Fechar" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>}</div><div className="flex items-center justify-between"><p className="text-[11px] text-muted-foreground tabular-nums">{label}</p><select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortMode)} className="text-[11px] border rounded-md px-2 py-1 bg-background text-muted-foreground hover:text-foreground transition-colors cursor-pointer"><option value="default">Relevância</option><option value="name-asc">Nome A→Z</option><option value="name-desc">Nome Z→A</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option></select></div></div>;
}

function ProductRow({ product, row, onPick }: { product: ProductLightweight; row: VirtualItem; onPick: (product: ProductLightweight) => void }) {
  const stock = product.stock >= 1000 ? `${(product.stock / 1000).toFixed(1)}k` : product.stock;
  return <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${row.size}px`, transform: `translateY(${row.start}px)` }} className="py-0.5 px-1"><div onClick={() => onPick(product)} className="group flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent hover:bg-accent/60 hover:border-border/30 cursor-pointer transition-all duration-200 h-full"><div className="w-11 h-11 rounded-lg bg-muted overflow-hidden shrink-0"><img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" onError={(event) => { event.currentTarget.src = PLACEHOLDER_IMAGE; }} /></div><div className="flex-1 min-w-0 space-y-0.5"><h4 className="font-medium truncate text-sm leading-tight" title={product.name}>{product.name}</h4><span className="text-[11px] text-muted-foreground font-mono tracking-wide">{product.sku || 'N/A'}</span></div><div className="text-right shrink-0 pl-2"><p className="text-sm font-semibold text-primary tabular-nums whitespace-nowrap">{product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>{product.stock > 0 ? <p className="text-[10px] text-primary whitespace-nowrap">⊕ {stock} un</p> : <p className="text-[10px] text-destructive whitespace-nowrap">△ Sem estoque</p>}</div></div></div>;
}

function LoadingProducts() {
  return <div className="space-y-2 p-2">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="flex items-center gap-4 p-3 rounded-lg border border-border/30"><Skeleton className="w-12 h-12 rounded-md" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>)}</div>;
}

function EmptyProducts({ isSearching, query, clear }: { isSearching: boolean; query: string; clear: () => void }) {
  return <div className="text-center py-12 text-muted-foreground"><SearchX className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="font-medium text-base">Nenhum produto encontrado</p>{isSearching && <p className="text-xs mt-1.5">Tente ajustar o termo de busca</p>}{query && <Button variant="outline" size="sm" className="mt-3" onClick={clear}>Limpar busca</Button>}</div>;
}

interface ProductViewportProps {
  scrollRef: RefObject<HTMLDivElement>;
  scrollState: { top: boolean; bottom: boolean };
  onScroll: () => void;
  loading: boolean;
  products: ProductLightweight[];
  virtualRows: VirtualItem[];
  totalSize: number;
  isSearching: boolean;
  query: string;
  clear: () => void;
  onPick: (product: ProductLightweight) => void;
}

function ProductViewport(props: ProductViewportProps) {
  let content: ReactNode;
  if (props.loading) content = <LoadingProducts />;
  else if (props.products.length === 0) content = <EmptyProducts isSearching={props.isSearching} query={props.query} clear={props.clear} />;
  else content = <div style={{ height: `${props.totalSize}px`, width: '100%', position: 'relative' }}>{props.virtualRows.map((row) => { const product = props.products[row.index]; return product ? <ProductRow key={product.id} product={product} row={row} onPick={props.onPick} /> : null; })}</div>;
  return <div className="relative flex-1 min-h-0"><div className="pointer-events-none absolute top-0 left-0 right-0 h-6 z-10 transition-opacity duration-200" style={{ opacity: props.scrollState.top ? 1 : 0, background: 'linear-gradient(to bottom, hsl(var(--background)), transparent)' }} /><div ref={props.scrollRef} className="pr-2 overflow-auto h-full" style={{ maxHeight: '340px' }} onScroll={props.onScroll}>{content}</div><div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 z-10 transition-opacity duration-200" style={{ opacity: props.scrollState.bottom ? 1 : 0, background: 'linear-gradient(to top, hsl(var(--background)), transparent)' }} /></div>;
}

function useProductListState(products: ProductLightweight[]) {
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortMode>('default');
  const [scrollState, setScrollState] = useState({ top: false, bottom: true });
  const handleScroll = useCallback(() => {
    const element = scrollParentRef.current;
    if (!element) return;
    setScrollState({ top: element.scrollTop > 8, bottom: element.scrollTop + element.clientHeight < element.scrollHeight - 8 });
  }, []);
  const debouncedQuery = useDebounce(searchQuery, 300);
  const fuse = useMemo(() => new Fuse(products, createProductFuseOptions<ProductLightweight>()), [products]);
  const filteredProducts = useMemo(() => {
    if (debouncedQuery.length < 2) return products;
    return rankProductSearchResults(products, debouncedQuery, fuse);
  }, [fuse, debouncedQuery, products]);
  const sortedProducts = useMemo(() => sortProducts(filteredProducts, sortBy), [filteredProducts, sortBy]);
  const rowVirtualizer = useVirtualizer({ count: sortedProducts.length, getScrollElement: () => scrollParentRef.current, estimateSize: () => 72, overscan: 5 });
  return {
    scrollParentRef, searchQuery, setSearchQuery, sortBy, setSortBy, scrollState, handleScroll,
    sortedProducts, rowVirtualizer, isSearching: debouncedQuery.length >= 2,
    isFilterPending: searchQuery.length >= 2 && searchQuery !== debouncedQuery,
  };
}

export function MockupProductSelector({ selection, onSelect, disabled }: MockupProductSelectorProps) {
  const { data: products = [], isLoading: isLoadingProducts } = useProductsLightweight();
  const list = useProductListState(products);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);

  const handleProductPick = (product: ProductLightweight) => {
    setPendingProductId(product.id);
    list.setSearchQuery("");
  };

  const handleColorSelect = (variant: ExternalVariantStock | null, product: Product) => {
    onSelect({
      product,
      variant,
      colorName: variant?.color_name ?? undefined,
      colorHex: variant?.color_hex ?? undefined,
      imageUrl: variantImage(variant, product),
    });
    setPendingProductId(null);
  };

  const handleClear = () => {
    onSelect(null);
    setPendingProductId(null);
    list.setSearchQuery("");
  };

  if (selection) {
    return <SelectedProduct selection={selection} disabled={disabled} onClear={handleClear} />;
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

  return (
    <div className="flex flex-col rounded-lg overflow-hidden" style={{ maxHeight: '420px' }}>
      <ProductSearchHeader query={list.searchQuery} setQuery={list.setSearchQuery} sortBy={list.sortBy} setSortBy={list.setSortBy} disabled={disabled} isLoading={isLoadingProducts} isSearching={list.isSearching} resultCount={list.sortedProducts.length} total={products.length} />
      <ProductViewport scrollRef={list.scrollParentRef} scrollState={list.scrollState} onScroll={list.handleScroll} loading={isLoadingProducts || list.isFilterPending} products={list.sortedProducts} virtualRows={list.rowVirtualizer.getVirtualItems()} totalSize={list.rowVirtualizer.getTotalSize()} isSearching={list.isSearching} query={list.searchQuery} clear={() => list.setSearchQuery("")} onPick={handleProductPick} />
    </div>
  );
}

// Re-export from extracted module
export { ProductLoaderAndColorSelector } from "./MockupColorSelector";
