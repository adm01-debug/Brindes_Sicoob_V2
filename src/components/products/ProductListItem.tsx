/**
 * ProductListItem — Layout horizontal compacto para modo lista do catálogo.
 *
 * 🎨 DESIGN STRATEGY (NÃO ALTERAR):
 * - Densidade: ~8-10 produtos visíveis por tela (vs ~3 no card vertical)
 * - Scan horizontal: thumb → info → preço/estoque → ações
 * - Thumb 64-80px contém o produto sem dominar o layout
 * - Ações de hover no desktop, sempre visíveis no mobile
 * - Altura fixa ~72-88px para virtualização consistente
 *
 * ✅ PARIDADE COM GRID: Todas as ações rápidas do ProductCard (Grid)
 *    estão implementadas aqui com a mesma arquitetura de variante/cor:
 *    Favoritar, Comparar, Coleção, Share, Orçamento, Carrinho, QuickView
 */
import { type CSSProperties, type MouseEvent, memo, useState, useCallback, useRef, useEffect } from "react";
import { Package, Building2 } from "lucide-react";
import { NoveltyBadge } from "./NoveltyBadge";
import { ListItemActions } from "./list-item/ListItemActions";
import { useNavigate } from "react-router-dom";
import { getCdnUrl } from "@/utils/image-utils";
import { Badge } from "@/components/ui/badge";


import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";
import { toast } from "sonner";
import { GenderBadge } from "./GenderBadge";
import { getSupplierColors } from "@/lib/supplier-colors";
import { resolveColorImage, resolveColorStock, getActiveColorName, type ActiveColorFilter } from "@/utils/color-image-resolver";
import { resolveHighlightHex } from "@/utils/color-group-hex";
import { PriceFreshnessBadge } from "./PriceFreshnessBadge";
import { isLightColor } from "@/hooks/useColorSystem";
import { resolveAllMatchingColors } from "@/utils/color-variant-carousel";
import { showUndoToast, showErrorToast } from "@/utils/undoToast";

import { AddToCollectionModal } from "@/components/collections/AddToCollectionModal";
import { ProductQuickView } from "./ProductQuickView";
import { SharePreviewDialog } from "./share/SharePreviewDialog";
import { VariantPickerDialog, type VariantActionMode } from "./VariantPickerDialog";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import type { ExternalVariantStock } from "@/hooks/useExternalVariantStock";

interface ProductListItemProps {
  product: Product;
  onClick?: () => void;
  onView?: (product: Product) => void;
  onShare?: (product: Product) => void;
  onFavorite?: (product: Product) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (productId: string) => void;
  isInCompare?: boolean;
  onToggleCompare?: (productId: string) => { added: boolean; isFull: boolean };
  canAddToCompare?: boolean;
  highlightColors?: string[];
  activeColorFilter?: ActiveColorFilter | null;
  isNovelty?: boolean;
  noveltyDaysRemaining?: number;
}

type SelectedVariantInfo = {
  color_name?: string | null;
  color_hex?: string | null;
  size_code?: string | null;
  variant_id?: string | null;
  thumbnail?: string | null;
};

function selectedVariantInfo(variant: ExternalVariantStock | null): SelectedVariantInfo | undefined {
  if (!variant) return undefined;
  return {
    color_name: variant.color_name,
    color_hex: variant.color_hex,
    size_code: variant.size_code,
    variant_id: variant.id,
    thumbnail: variant.selected_thumbnail,
  };
}

function appendVariantQuoteParams(params: URLSearchParams, variant: ExternalVariantStock | null): void {
  if (!variant) return;
  if (variant.color_name) params.set("color_name", variant.color_name);
  if (variant.color_hex) params.set("color_hex", variant.color_hex);
}

function quoteImage(product: Product, variant: ExternalVariantStock | null): string | undefined {
  if (variant?.selected_thumbnail) return variant.selected_thumbnail;
  return product.images?.[0];
}

function quoteParams(product: Product, variant: ExternalVariantStock | null): URLSearchParams {
  const params = new URLSearchParams({
    product_id: product.id,
    product_name: product.name,
    product_sku: product.sku || "",
    product_price: String(product.price ?? 0),
  });
  appendVariantQuoteParams(params, variant);
  const image = quoteImage(product, variant);
  if (image) params.set("product_image", image);
  return params;
}

function interactionBlocked(states: readonly boolean[]): boolean {
  return states.some(Boolean);
}

function isHighlightedColor(color: Product["colors"][number], highlights: string[], filter?: ActiveColorFilter | null): boolean {
  if (highlights.includes(color.group)) return true;
  if (filter?.groups?.includes(color.groupSlug || "")) return true;
  return filter?.variations?.includes(color.variationSlug || "") ?? false;
}

function normalizeListItemProps(props: ProductListItemProps) {
  return { ...props, isFavorited: props.isFavorited ?? false, isInCompare: props.isInCompare ?? false, canAddToCompare: props.canAddToCompare ?? true, highlightColors: props.highlightColors ?? [], isNovelty: props.isNovelty ?? false };
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
}

function stockAppearance(status: string) {
  if (status === "low-stock") return { color: "text-warning", label: "Estoque baixo" };
  if (status === "out-of-stock") return { color: "text-destructive", label: "Sem estoque" };
  return { color: "text-success", label: "Em estoque" };
}

function ListThumbnail({ product, url, variants, selectedIndex, onSelect }: { product: Product; url: string; variants: ReturnType<typeof resolveAllMatchingColors>; selectedIndex: number; onSelect: (index: number) => void }) {
  const multiple = variants.length > 1;
  return (
    <div className="relative shrink-0 w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-lg overflow-hidden bg-muted/30 border border-border/30">
      <img src={url} alt={product.name} className="w-full h-full object-contain" loading="lazy" onError={(event) => { const image = event.currentTarget; if (!image.dataset.fallback) { image.dataset.fallback = "1"; image.src = product.images[0] || "/placeholder.svg"; } }} />
      {multiple && <div role="tablist" aria-label="Variantes de cor" className="absolute bottom-0.5 left-0 right-0 flex justify-center gap-1 z-10" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "ArrowRight") { event.preventDefault(); onSelect((selectedIndex + 1) % variants.length); } else if (event.key === "ArrowLeft") { event.preventDefault(); onSelect((selectedIndex - 1 + variants.length) % variants.length); } }}>{variants.map((variant, index) => { const selected = index === selectedIndex; const border = selected && isLightColor(variant.hex) ? "hsl(var(--muted-foreground))" : variant.hex; return <button key={variant.groupSlug || variant.variationSlug || index} role="tab" type="button" tabIndex={selected ? 0 : -1} aria-selected={selected} onClick={(event) => { event.stopPropagation(); onSelect(index); }} className={cn("w-3 h-3 rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", selected ? "ring-1 ring-offset-1 ring-offset-card scale-110" : "opacity-60 border-border/50")} style={{ backgroundColor: variant.hex, borderColor: selected ? border : undefined, ["--tw-ring-color" as string]: selected ? border : variant.hex }} aria-label={`Ver ${variant.name}`} title={variant.name} />; })}</div>}
    </div>
  );
}

function ProductListInfo({ product, isNovelty, noveltyDaysRemaining, activeColorName, displayStatus, displayStock, highlightColors, activeColorFilter }: { product: Product; isNovelty: boolean; noveltyDaysRemaining?: number; activeColorName?: string | null; displayStatus: string; displayStock: number; highlightColors: string[]; activeColorFilter?: ActiveColorFilter | null }) {
  const stock = stockAppearance(displayStatus);
  return (
    <div className="flex-1 min-w-0 py-0.5">
      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground mb-0.5">{isNovelty && noveltyDaysRemaining !== undefined && <NoveltyBadge daysRemaining={noveltyDaysRemaining} size="sm" />}<span className="truncate max-w-[120px]">{product.category?.name || "Sem categoria"}</span><span className="text-border">•</span><span className={cn("flex items-center gap-0.5 shrink-0", getSupplierColors(product.supplier.name).text)}><Building2 className="h-2.5 w-2.5" /><span className="truncate max-w-[80px]">{product.supplier.name}</span></span><GenderBadge gender={product.gender} size="sm" /></div>
      <h3 data-testid="product-list-name" className="font-display font-semibold text-foreground text-sm sm:text-[15px] leading-snug line-clamp-1 group-hover:text-primary transition-colors">{product.name}</h3>
      {activeColorName && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary/80 w-fit mt-0.5">{activeColorName}</Badge>}
      <div className="flex items-center gap-2 mt-0.5"><span className={cn("flex items-center gap-1 text-[10px] sm:text-xs font-medium", stock.color)}><Package className="h-2.5 w-2.5 sm:h-3 sm:w-3" />{stock.label} ({displayStock.toLocaleString("pt-BR")})</span>{product.sku && <span className="text-[10px] text-muted-foreground/50 font-mono hidden sm:inline">{product.sku}</span>}{product.colors.length > 0 && <div className="hidden md:flex items-center gap-1 ml-1">{product.colors.slice(0, 5).map((color, index) => <div key={index} className={cn("w-3 h-3 rounded-full border", isHighlightedColor(color, highlightColors, activeColorFilter) ? "border-success ring-1 ring-success/30 scale-110" : "border-border/50")} style={{ backgroundColor: color.hex }} title={color.name} />)}{product.colors.length > 5 && <span className="text-[9px] text-muted-foreground">+{product.colors.length - 5}</span>}</div>}</div>
    </div>
  );
}

function ListPrice({ product }: { product: Product }) {
  return <div className="shrink-0 text-right min-w-[80px] sm:min-w-[100px]"><span className="text-base sm:text-lg font-display font-bold text-foreground whitespace-nowrap">{formatPrice(product.price)}</span><div className="mt-0.5 flex justify-end"><PriceFreshnessBadge priceUpdatedAt={product.priceUpdatedAt} thresholdDays={product.priceFreshnessThresholdDays} variant="compact" /></div></div>;
}

function colorFilterKey(filter?: ActiveColorFilter | null) {
  if (!filter) return "";
  return `${(filter.groups ?? []).join(",")}|${(filter.variations ?? []).join(",")}`;
}

function selectedListVariant(variants: ReturnType<typeof resolveAllMatchingColors>, activeIndex: number) {
  if (variants.length <= 1) return { safeIndex: 0, current: null };
  const safeIndex = Math.min(activeIndex, variants.length - 1);
  return { safeIndex, current: variants[safeIndex] };
}

function listThumbnailUrl(product: Product, variantImage: string | undefined, filter?: ActiveColorFilter | null) {
  const image = variantImage || resolveColorImage(product, filter) || product.og_image_url || product.images[0];
  return image ? getCdnUrl(image, "card") : "/placeholder.svg";
}

function listColorHighlight(product: Product, current: ReturnType<typeof resolveAllMatchingColors>[number] | null | undefined, filter: ActiveColorFilter | null | undefined, highlights: string[]) {
  const activeName = current?.name || getActiveColorName(product, filter);
  const matched = current?.hex || resolveHighlightHex(product.colors, filter, highlights);
  const groupMatch = highlights.length > 0 && product.colors.some((color) => highlights.includes(color.group));
  return { activeName, matched, hasMatch: Boolean(matched) || groupMatch || Boolean(activeName) };
}

function highlightedRowStyle(hasMatch: boolean, color?: string | null): CSSProperties | undefined {
  if (!hasMatch || !color) return undefined;
  return { borderColor: `${color}70`, boxShadow: `inset 0 0 30px -6px ${color}40, 0 0 8px -2px ${color}20` };
}

function useActiveListVariant(product: Product, activeColorFilter?: ActiveColorFilter | null) {
  const [activeIndex, setActiveIndex] = useState(0);
  const filterKey = colorFilterKey(activeColorFilter);
  const previousFilterRef = useRef(filterKey);
  useEffect(() => {
    if (previousFilterRef.current !== filterKey) { setActiveIndex(0); previousFilterRef.current = filterKey; }
  }, [filterKey]);
  const variants = resolveAllMatchingColors(product.colors, activeColorFilter);
  const { safeIndex, current } = selectedListVariant(variants, activeIndex);
  return { variants, safeIndex, current, setActiveIndex, thumbUrl: listThumbnailUrl(product, current?.image, activeColorFilter) };
}

function useListItemDialogs(product: Product, navigate: ReturnType<typeof useNavigate>) {
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [collectionVariant, setCollectionVariant] = useState<SelectedVariantInfo>();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareVariant, setShareVariant] = useState<{ variantName?: string | null; colorHex?: string | null; thumbnailUrl?: string | null } | null>(null);
  const [variantPickerOpen, setVariantPickerOpen] = useState(false);
  const [variantPickerMode, setVariantPickerMode] = useState<VariantActionMode>("favorite");
  const actionBusyRef = useRef(false);
  const favoriteStore = useFavoritesStore();
  const comparisonStore = useComparisonStore();
  const markBusy = () => { actionBusyRef.current = true; setTimeout(() => { actionBusyRef.current = false; }, 500); };
  const openVariantPicker = (mode: VariantActionMode) => { markBusy(); setVariantPickerMode(mode); setVariantPickerOpen(true); };
  const completeVariant = useCallback((variant: ExternalVariantStock | null) => {
    const variantInfo = selectedVariantInfo(variant);
    const suffix = variant?.color_name ? ` — ${variant.color_name}` : "";
    const actions: Record<VariantActionMode, () => void> = {
      favorite: () => { favoriteStore.addFavorite(product.id, variantInfo); toast.success(`"${product.name}" favoritado${suffix}`); },
      compare: () => { const added = comparisonStore.addToCompare(product.id, variantInfo); if (!added) showErrorToast({ title: "Limite de 4 produtos para comparação atingido" }); else toast.success(`"${product.name}" adicionado à comparação${suffix}`); },
      collection: () => { setCollectionVariant(variantInfo); setCollectionModalOpen(true); },
      quote: () => setTimeout(() => navigate(`/orcamentos/novo?${quoteParams(product, variant).toString()}`), 0),
      share: () => { setShareVariant(variant ? { variantName: variant.color_name, colorHex: variant.color_hex, thumbnailUrl: variant.selected_thumbnail } : null); setShareDialogOpen(true); },
    };
    actions[variantPickerMode]();
  }, [variantPickerMode, product, favoriteStore, comparisonStore, navigate]);
  return { actionBusyRef, collectionModalOpen, setCollectionModalOpen, collectionVariant, quickViewOpen, setQuickViewOpen, shareDialogOpen, setShareDialogOpen, shareVariant, variantPickerOpen, setVariantPickerOpen, variantPickerMode, openVariantPicker, markBusy, completeVariant };
}

function createListItemHandlers(props: ReturnType<typeof normalizeListItemProps>, currentVariant: ReturnType<typeof resolveAllMatchingColors>[number] | null | undefined, dialogs: ReturnType<typeof useListItemDialogs>, navigate: ReturnType<typeof useNavigate>) {
  const { product, onClick, onView, isFavorited, onToggleFavorite, isInCompare, onToggleCompare } = props;
  const click = (event: MouseEvent) => {
    if (interactionBlocked([dialogs.actionBusyRef.current, dialogs.variantPickerOpen, dialogs.collectionModalOpen, dialogs.quickViewOpen, dialogs.shareDialogOpen])) return;
    if (currentVariant?.name && !event.shiftKey) {
      const params = new URLSearchParams({ cor: currentVariant.name });
      if (currentVariant.groupSlug) params.set("grupo", currentVariant.groupSlug);
      if (currentVariant.hex) params.set("hex", currentVariant.hex);
      navigate(`/produto/${product.id}?${params.toString()}`);
      return;
    }
    if (onClick) onClick(); else onView?.(product);
  };
  const favorite = (event: MouseEvent) => {
    event.stopPropagation();
    if (!isFavorited) { dialogs.openVariantPicker("favorite"); return; }
    dialogs.markBusy();
    if (onToggleFavorite) { onToggleFavorite(product.id); showUndoToast({ title: `"${product.name}" removido dos favoritos`, onUndo: () => onToggleFavorite(product.id) }); }
  };
  const compare = (event: MouseEvent) => {
    event.stopPropagation();
    if (!isInCompare) { dialogs.openVariantPicker("compare"); return; }
    dialogs.markBusy();
    if (onToggleCompare) { onToggleCompare(product.id); showUndoToast({ title: `"${product.name}" removido da comparação`, onUndo: () => onToggleCompare(product.id) }); }
  };
  return { click, favorite, compare };
}

function ListItemView({ props, variant, dialogs, handlers, stock, color }: { props: ReturnType<typeof normalizeListItemProps>; variant: ReturnType<typeof useActiveListVariant>; dialogs: ReturnType<typeof useListItemDialogs>; handlers: ReturnType<typeof createListItemHandlers>; stock: { value: number; status: string }; color: ReturnType<typeof listColorHighlight> }) {
  const { product, onShare, isFavorited, onToggleFavorite, isInCompare, onToggleCompare, canAddToCompare, highlightColors, activeColorFilter, isNovelty, noveltyDaysRemaining } = props;
  return (
    <>
      <article className={cn("group relative flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2 sm:py-2.5", "rounded-xl bg-card cursor-pointer", "transition-all duration-200 ease-out", "active:scale-[0.997] touch-manipulation", color.hasMatch && color.matched ? "border-2" : "border border-border/50 hover:border-primary/30 hover:bg-accent/30 hover:shadow-md")} style={highlightedRowStyle(color.hasMatch, color.matched)} onClick={handlers.click}>
        <ListThumbnail product={product} url={variant.thumbUrl} variants={variant.variants} selectedIndex={variant.safeIndex} onSelect={variant.setActiveIndex} />
        <ProductListInfo product={product} isNovelty={isNovelty} noveltyDaysRemaining={noveltyDaysRemaining} activeColorName={color.activeName} displayStatus={stock.status} displayStock={stock.value} highlightColors={highlightColors} activeColorFilter={activeColorFilter} />
        <ListPrice product={product} />
        <ListItemActions product={product} isFavorited={isFavorited} isInCompare={isInCompare} canAddToCompare={canAddToCompare} onFavorite={handlers.favorite} onCompare={handlers.compare} onVariantAction={(mode, event) => { event.stopPropagation(); dialogs.openVariantPicker(mode); }} onQuickView={(event) => { event.stopPropagation(); dialogs.markBusy(); dialogs.setQuickViewOpen(true); }} />
      </article>
      <VariantPickerDialog open={dialogs.variantPickerOpen} onOpenChange={dialogs.setVariantPickerOpen} productId={product.id} productName={product.name} mode={dialogs.variantPickerMode} onComplete={dialogs.completeVariant} />
      <AddToCollectionModal open={dialogs.collectionModalOpen} onOpenChange={dialogs.setCollectionModalOpen} productId={product.id} productName={product.name} variant={dialogs.collectionVariant} />
      <ProductQuickView product={product} open={dialogs.quickViewOpen} onOpenChange={dialogs.setQuickViewOpen} isFavorited={isFavorited} onToggleFavorite={onToggleFavorite} isInCompare={isInCompare} onToggleCompare={onToggleCompare} onShare={onShare} />
      <SharePreviewDialog open={dialogs.shareDialogOpen} onOpenChange={dialogs.setShareDialogOpen} product={product} selectedVariant={dialogs.shareVariant} />
    </>
  );
}

export const ProductListItem = memo(function ProductListItem(props: ProductListItemProps) {
  const normalized = normalizeListItemProps(props);
  const { product, highlightColors, activeColorFilter } = normalized;
  const navigate = useNavigate();
  const variant = useActiveListVariant(product, activeColorFilter);
  const dialogs = useListItemDialogs(product, navigate);
  const handlers = createListItemHandlers(normalized, variant.current, dialogs, navigate);
  const colorStock = resolveColorStock(product, activeColorFilter);
  const color = listColorHighlight(product, variant.current, activeColorFilter, highlightColors);
  return <ListItemView props={normalized} variant={variant} dialogs={dialogs} handlers={handlers} stock={{ value: colorStock?.stock ?? product.stock, status: colorStock?.stockStatus ?? product.stockStatus }} color={color} />;
});

ProductListItem.displayName = 'ProductListItem';
