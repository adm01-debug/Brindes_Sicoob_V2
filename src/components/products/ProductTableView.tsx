/**
 * ProductTableView — Tabela compacta para análise comparativa rápida.
 * Mostra SKU, nome, fornecedor, preço, estoque e cores em colunas.
 *
 * ✅ PARIDADE COM GRID: Todas as ações rápidas do ProductCard (Grid)
 *    estão implementadas aqui com a mesma arquitetura de variante/cor:
 *    Favoritar, Comparar, Coleção, Share, Orçamento, Carrinho, QuickView
 */
import { type CSSProperties, memo, useState, useCallback } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Package } from "lucide-react";
import { TableRowActions } from "./table-view/TableRowActions";
import { resolveColorImage, resolveColorStock, getActiveColorName, type ActiveColorFilter } from "@/utils/color-image-resolver";
import { resolveHighlightHex } from "@/utils/color-group-hex";
// Table view shows all color dots inline — no carousel needed
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";
import { getCdnUrl } from "@/utils/image-utils";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { VariantPickerDialog, type VariantActionMode } from "./VariantPickerDialog";
import { AddToCollectionModal } from "@/components/collections/AddToCollectionModal";
import { ProductQuickView } from "./ProductQuickView";
import { SharePreviewDialog } from "./share/SharePreviewDialog";

import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import type { ExternalVariantStock } from "@/hooks/useExternalVariantStock";
import { PriceFreshnessBadge } from "./PriceFreshnessBadge";
import { toast } from "sonner";
import { showErrorToast } from "@/utils/undoToast";

interface ProductTableViewProps {
  products: Product[];
  onProductClick?: (productId: string) => void;
  isFavorite?: (id: string) => boolean;
  onToggleFavorite?: (id: string) => void;
  isInCompare?: (id: string) => boolean;
  onToggleCompare?: (id: string) => { added: boolean; isFull: boolean };
  canAddToCompare?: boolean;
  onShareProduct?: (product: Product) => void;
  highlightColors?: string[];
  activeColorFilter?: ActiveColorFilter | null;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

type SortCol = "name" | "sku" | "price" | "stock" | "supplier";
type SortDir = "asc" | "desc";

type SelectedVariantInfo = {
  color_name?: string | null;
  color_hex?: string | null;
  size_code?: string | null;
  variant_id?: string | null;
  thumbnail?: string | null;
};

function selectedVariantInfo(variant: ExternalVariantStock | null): SelectedVariantInfo | undefined {
  if (!variant) return undefined;
  return { color_name: variant.color_name, color_hex: variant.color_hex, size_code: variant.size_code, variant_id: variant.id, thumbnail: variant.selected_thumbnail };
}

function variantSuffix(variant: ExternalVariantStock | null) {
  if (!variant?.color_name) return "";
  return ` — ${variant.color_name}`;
}

function appendQuoteVariant(params: URLSearchParams, variant: ExternalVariantStock | null) {
  if (!variant) return;
  if (variant.color_name) params.set('color_name', variant.color_name);
  if (variant.color_hex) params.set('color_hex', variant.color_hex);
}

function variantQuoteParams(product: Product, variant: ExternalVariantStock | null) {
  const params = new URLSearchParams({ product_id: product.id, product_name: product.name, product_sku: product.sku || '', product_price: String(product.price ?? 0) });
  appendQuoteVariant(params, variant);
  const image = variant?.selected_thumbnail || product.images?.[0];
  if (image) params.set('product_image', image);
  return params;
}

function textOrEmpty(value: string | null | undefined) {
  return value || "";
}

function numberOrZero(value: number | null | undefined) {
  return value || 0;
}

function compareProducts(a: Product, b: Product, sortCol: SortCol) {
  if (sortCol === "name") return a.name.localeCompare(b.name);
  if (sortCol === "sku") return textOrEmpty(a.sku).localeCompare(textOrEmpty(b.sku));
  if (sortCol === "price") return a.price - b.price;
  if (sortCol === "stock") return numberOrZero(a.stock) - numberOrZero(b.stock);
  return textOrEmpty(a.supplier?.name).localeCompare(textOrEmpty(b.supplier?.name));
}

function sortProducts(products: Product[], sortCol: SortCol, sortDir: SortDir) {
  const direction = sortDir === "asc" ? 1 : -1;
  return [...products].sort((a, b) => direction * compareProducts(a, b, sortCol));
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

const stockColor = (status: string) => {
  if (status === "in-stock") return "text-success";
  if (status === "low-stock") return "text-warning";
  return "text-destructive";
};

function SortHeader({
  label,
  col,
  activeCol,
  activeDir,
  onSort,
  className,
}: {
  label: string;
  col: SortCol;
  activeCol: SortCol;
  activeDir: SortDir;
  onSort: (col: SortCol) => void;
  className?: string;
}) {
  const isActive = activeCol === col;
  return (
    <button
      className={cn(
        "flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors",
        isActive && "text-primary",
        className
      )}
      onClick={() => onSort(col)}
    >
      {label}
      {isActive ? (
        activeDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

function ProductTableHeader({ selectionMode, sortCol, sortDir, onSort }: { selectionMode?: boolean; sortCol: SortCol; sortDir: SortDir; onSort: (col: SortCol) => void }) {
  return (
    <thead><tr className="border-b border-border/50 bg-muted/30">
      {selectionMode && <th className="w-10 px-2 py-2.5" />}<th className="w-12 px-2 py-2.5" />
      <th className="text-left px-3 py-2.5"><SortHeader label="Produto" col="name" activeCol={sortCol} activeDir={sortDir} onSort={onSort} /></th>
      <th className="text-left px-3 py-2.5 hidden md:table-cell"><SortHeader label="SKU" col="sku" activeCol={sortCol} activeDir={sortDir} onSort={onSort} /></th>
      <th className="text-left px-3 py-2.5 hidden lg:table-cell"><SortHeader label="Fornecedor" col="supplier" activeCol={sortCol} activeDir={sortDir} onSort={onSort} /></th>
      <th className="text-left px-3 py-2.5 hidden sm:table-cell">Cores</th>
      <th className="text-right px-3 py-2.5"><SortHeader label="Preço" col="price" activeCol={sortCol} activeDir={sortDir} onSort={onSort} className="justify-end" /></th>
      <th className="text-right px-3 py-2.5"><SortHeader label="Estoque" col="stock" activeCol={sortCol} activeDir={sortDir} onSort={onSort} className="justify-end" /></th>
      <th className="w-auto min-w-[180px] px-2 py-2.5 text-center"><span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ações</span></th>
    </tr></thead>
  );
}

function isColorHighlighted(color: Product["colors"][number], highlights: string[], filter?: ActiveColorFilter | null) {
  if (highlights.includes(color.group)) return true;
  if (filter?.groups?.includes(color.groupSlug || '')) return true;
  return filter?.variations?.includes(color.variationSlug || '') ?? false;
}

function ColorDots({ product, highlights, filter }: { product: Product; highlights: string[]; filter?: ActiveColorFilter | null }) {
  return (
    <div className="flex items-center gap-0.5">
      {product.colors.slice(0, 6).map((color) => {
        const highlighted = isColorHighlighted(color, highlights, filter);
        return <Tooltip key={`${color.name}-${color.hex}`}><TooltipTrigger asChild><div className={cn("w-4 h-4 rounded-full border", highlighted ? "border-success ring-1 ring-success/40 scale-110" : "border-border/50")} style={{ backgroundColor: color.hex }} /></TooltipTrigger><TooltipContent side="top" className="text-xs">{color.name}</TooltipContent></Tooltip>;
      })}
      {product.colors.length > 6 && <span className="text-[10px] text-muted-foreground ml-0.5">+{product.colors.length - 6}</span>}
    </div>
  );
}

function SelectionCell({ visible, selected, onToggle }: { visible?: boolean; selected: boolean; onToggle: () => void }) {
  if (!visible) return null;
  return <td className="px-2 py-1.5"><SelectionCheckbox checked={selected} onChange={onToggle} size="sm" /></td>;
}

function ProductNameCell({ product, activeColorName }: { product: Product; activeColorName: string | null | undefined }) {
  return (
    <td className="px-3 py-1.5">
      <p data-testid="product-row-name" className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1 text-[13px]">{product.name}</p>
      <div className="flex items-center gap-1"><p className="text-[10px] text-muted-foreground md:hidden">{product.sku}</p>{activeColorName && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary/80">{activeColorName}</Badge>}</div>
    </td>
  );
}

function rowThumbnail(product: Product, filter?: ActiveColorFilter | null) {
  const candidates = [resolveColorImage(product, filter), product.og_image_url, product.images[0]];
  const image = candidates.find(Boolean);
  return image ? getCdnUrl(image, "card") : "/placeholder.svg";
}

function hasColorMatch(product: Product, matchedColor: string | null | undefined, activeColorName: string | null | undefined, highlights: string[]) {
  if (matchedColor || activeColorName) return true;
  return highlights.length > 0 && product.colors.some((color) => highlights.includes(color.group));
}

function highlightedRowStyle(matched: boolean, color: string | null | undefined): CSSProperties | undefined {
  if (!matched || !color) return undefined;
  return { backgroundColor: `${color}10`, borderLeftWidth: '4px', borderLeftColor: `${color}80`, boxShadow: `inset 4px 0 12px -4px ${color}25` };
}

function productStock(product: Product, filter?: ActiveColorFilter | null) {
  const colorStock = resolveColorStock(product, filter);
  return {
    stock: colorStock?.stock ?? product.stock,
    status: colorStock?.stockStatus ?? product.stockStatus,
  };
}

function productSelected(selectionMode: boolean | undefined, selectedIds: Set<string> | undefined, productId: string) {
  if (!selectionMode || !selectedIds) return false;
  return selectedIds.has(productId);
}

function predicateResult(predicate: ((id: string) => boolean) | undefined, productId: string) {
  if (!predicate) return false;
  return predicate(productId);
}

function toggleSelection(handler: ((id: string) => void) | undefined, productId: string) {
  if (handler) handler(productId);
}

function rowClassName(selected: boolean) {
  return cn("border-b border-border/30 hover:bg-accent/30 cursor-pointer transition-colors group", selected && "bg-primary/5 ring-1 ring-primary/30");
}

function StockCell({ stock, status }: { stock: number | null | undefined; status: string }) {
  return <td className="px-3 py-1.5 text-right"><span className={cn("flex items-center gap-1 justify-end text-xs font-medium", stockColor(status))}><Package className="h-3 w-3" />{numberOrZero(stock).toLocaleString("pt-BR")}</span></td>;
}

interface ProductTableRowProps {
  product: Product;
  tableProps: ProductTableViewProps;
  onOpenVariantPicker: (product: Product, mode: VariantActionMode) => void;
  onOpenQuickView: (product: Product) => void;
  onNavigate: (product: Product, activeColorName: string | null | undefined, matchedColor: string | null | undefined) => void;
}

function ProductTableRow({ product, tableProps, onOpenVariantPicker, onOpenQuickView, onNavigate }: ProductTableRowProps) {
  const { activeColorFilter, selectionMode, selectedIds, onToggleSelect, isFavorite, isInCompare, canAddToCompare = true, onToggleFavorite, onToggleCompare, highlightColors = [] } = tableProps;
  const { stock, status } = productStock(product, activeColorFilter);
  const activeColorName = getActiveColorName(product, activeColorFilter);
  const selected = productSelected(selectionMode, selectedIds, product.id);
  const matchedColor = resolveHighlightHex(product.colors, activeColorFilter, highlightColors);
  const matched = hasColorMatch(product, matchedColor, activeColorName, highlightColors);
  return (
    <tr className={rowClassName(selected)} style={highlightedRowStyle(matched, matchedColor)} onClick={() => onNavigate(product, activeColorName, matchedColor)}>
      <SelectionCell visible={selectionMode} selected={selected} onToggle={() => toggleSelection(onToggleSelect, product.id)} />
      <td className="px-2 py-1.5"><div className="w-10 h-10 rounded-md overflow-hidden bg-muted/30 border border-border/30"><img src={rowThumbnail(product, activeColorFilter)} alt="" className="w-full h-full object-contain" loading="lazy" /></div></td>
      <ProductNameCell product={product} activeColorName={activeColorName} />
      <td className="px-3 py-1.5 hidden md:table-cell"><span className="font-mono text-xs text-muted-foreground">{product.sku}</span></td>
      <td className="px-3 py-1.5 hidden lg:table-cell"><span className="text-xs text-muted-foreground">{product.supplier?.name}</span></td>
      <td className="px-3 py-1.5 hidden sm:table-cell"><ColorDots product={product} highlights={highlightColors} filter={activeColorFilter} /></td>
      <td className="px-3 py-1.5 text-right"><span className="font-display font-bold text-foreground text-[13px] inline-flex items-center gap-1 justify-end">{formatPrice(product.price)}<PriceFreshnessBadge priceUpdatedAt={product.priceUpdatedAt} thresholdDays={product.priceFreshnessThresholdDays} variant="icon-only" /></span></td>
      <StockCell stock={stock} status={status} />
      <td className="px-2 py-1.5"><TableRowActions product={product} isFavorite={predicateResult(isFavorite, product.id)} isInCompare={predicateResult(isInCompare, product.id)} canAddToCompare={canAddToCompare} onToggleFavorite={onToggleFavorite} onToggleCompare={onToggleCompare} onOpenVariantPicker={onOpenVariantPicker} onOpenQuickView={onOpenQuickView} /></td>
    </tr>
  );
}

function useVariantPickerState() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<VariantActionMode>('favorite');
  const [product, setProduct] = useState<Product | null>(null);
  const openPicker = useCallback((nextProduct: Product, nextMode: VariantActionMode) => { setProduct(nextProduct); setMode(nextMode); setOpen(true); }, []);
  return { open, setOpen, mode, product, openPicker };
}

function useCollectionState() {
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [variant, setVariant] = useState<SelectedVariantInfo | undefined>();
  const show = (nextProduct: Product, nextVariant: SelectedVariantInfo | undefined) => { setProduct(nextProduct); setVariant(nextVariant); setOpen(true); };
  return { open, setOpen, product, variant, show };
}

function useQuickViewState() {
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const show = (nextProduct: Product) => { setProduct(nextProduct); setOpen(true); };
  return { open, setOpen, product, show };
}

function useShareState() {
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [variant, setVariant] = useState<{ variantName?: string | null; colorHex?: string | null; thumbnailUrl?: string | null } | null>(null);
  const show = (nextProduct: Product, selectedVariant: ExternalVariantStock | null) => { setProduct(nextProduct); setVariant(selectedVariant ? { variantName: selectedVariant.color_name, colorHex: selectedVariant.color_hex, thumbnailUrl: selectedVariant.selected_thumbnail } : null); setOpen(true); };
  return { open, setOpen, product, variant, show };
}

function useProductSort(products: Product[]) {
  const [column, setColumn] = useState<SortCol>("name");
  const [direction, setDirection] = useState<SortDir>("asc");
  const onSort = useCallback((nextColumn: SortCol) => {
    if (column === nextColumn) setDirection((current) => current === "asc" ? "desc" : "asc");
    else { setColumn(nextColumn); setDirection("asc"); }
  }, [column]);
  return { column, direction, onSort, products: sortProducts(products, column, direction) };
}

interface VariantCompletionContext {
  picker: ReturnType<typeof useVariantPickerState>;
  collection: ReturnType<typeof useCollectionState>;
  share: ReturnType<typeof useShareState>;
}

function useVariantCompletion({ picker, collection, share }: VariantCompletionContext) {
  const navigate = useNavigate();
  const favorites = useFavoritesStore();
  const comparison = useComparisonStore();
  return useCallback((variant: ExternalVariantStock | null) => {
    if (!picker.product) return;
    const product = picker.product;
    const variantInfo = selectedVariantInfo(variant);
    const suffix = variantSuffix(variant);
    const actions: Record<VariantActionMode, () => void> = {
      favorite: () => { favorites.addFavorite(product.id, variantInfo); toast.success(`"${product.name}" favoritado${suffix}`); },
      compare: () => { const added = comparison.addToCompare(product.id, variantInfo); if (!added) showErrorToast({ title: "Limite de 4 produtos para comparação atingido" }); else toast.success(`"${product.name}" adicionado à comparação${suffix}`); },
      collection: () => collection.show(product, variantInfo),
      quote: () => setTimeout(() => navigate(`/orcamentos/novo?${variantQuoteParams(product, variant).toString()}`), 0),
      share: () => share.show(product, variant),
    };
    actions[picker.mode]();
  }, [picker, collection, share, favorites, comparison, navigate]);
}

function useRowNavigation(props: ProductTableViewProps) {
  const navigate = useNavigate();
  return (product: Product, activeColorName: string | null | undefined, matchedColor: string | null | undefined) => {
    if (props.selectionMode) { toggleSelection(props.onToggleSelect, product.id); return; }
    if (!activeColorName || !props.onProductClick) { props.onProductClick?.(product.id); return; }
    const params = new URLSearchParams({ cor: activeColorName });
    if (matchedColor) params.set('hex', matchedColor);
    navigate(`/produto/${product.id}?${params.toString()}`);
  };
}

function ProductTableDialogs({ props, picker, collection, quickView, share, onVariantComplete }: {
  props: ProductTableViewProps;
  picker: ReturnType<typeof useVariantPickerState>;
  collection: ReturnType<typeof useCollectionState>;
  quickView: ReturnType<typeof useQuickViewState>;
  share: ReturnType<typeof useShareState>;
  onVariantComplete: (variant: ExternalVariantStock | null) => void;
}) {
  return (
    <>
      {picker.product && <VariantPickerDialog open={picker.open} onOpenChange={picker.setOpen} productId={picker.product.id} productName={picker.product.name} mode={picker.mode} onComplete={onVariantComplete} />}
      {collection.product && <AddToCollectionModal open={collection.open} onOpenChange={collection.setOpen} productId={collection.product.id} productName={collection.product.name} variant={collection.variant} />}
      {quickView.product && <ProductQuickView product={quickView.product} open={quickView.open} onOpenChange={quickView.setOpen} isFavorited={props.isFavorite?.(quickView.product.id)} onToggleFavorite={props.onToggleFavorite} isInCompare={props.isInCompare?.(quickView.product.id)} onToggleCompare={props.onToggleCompare} onShare={props.onShareProduct} />}
      {share.product && <SharePreviewDialog open={share.open} onOpenChange={share.setOpen} product={share.product} selectedVariant={share.variant} />}
    </>
  );
}

export const ProductTableView = memo(function ProductTableView(props: ProductTableViewProps) {
  const picker = useVariantPickerState();
  const collection = useCollectionState();
  const quickView = useQuickViewState();
  const share = useShareState();
  const sort = useProductSort(props.products);
  const onVariantComplete = useVariantCompletion({ picker, collection, share });
  const onNavigate = useRowNavigation(props);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <ProductTableHeader selectionMode={props.selectionMode} sortCol={sort.column} sortDir={sort.direction} onSort={sort.onSort} />
        <tbody>{sort.products.map((product) => <ProductTableRow key={product.id} product={product} tableProps={props} onOpenVariantPicker={picker.openPicker} onOpenQuickView={quickView.show} onNavigate={onNavigate} />)}</tbody>
      </table>
      <ProductTableDialogs props={props} picker={picker} collection={collection} quickView={quickView} share={share} onVariantComplete={onVariantComplete} />
    </div>
  );
});
