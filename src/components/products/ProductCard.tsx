/**
 * ProductCard — Main catalog card component.
 * Refactored: image section in ProductCardImage, FAB actions in ProductCardActions.
 */
import { type CSSProperties, type MouseEvent, type ForwardedRef, useState, useRef, useEffect, memo, forwardRef, useCallback, useMemo } from "react";
import { GenderBadge } from "./GenderBadge";
import { Building2, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCdnUrl, getSrcSet } from "@/utils/image-utils";

import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";
import { toast } from "sonner";
import { AddToCollectionModal } from "@/components/collections/AddToCollectionModal";
import { ProductQuickView } from "./ProductQuickView";
import { ProductCategoryBadges } from "./ProductCategoryBadges";
import { showUndoToast, showErrorToast } from "@/utils/undoToast";
import { getSupplierColors } from "@/lib/supplier-colors";
import { resolveColorImage, resolveColorStock, getActiveColorName, type ActiveColorFilter } from "@/utils/color-image-resolver";
import { resolveHighlightHex } from "@/utils/color-group-hex";
import { resolveAllMatchingColors } from "@/utils/color-variant-carousel";
import { useProductBounds } from "@/hooks/useProductBounds";
import { ProductSparkline } from "./ProductSparkline";
import { VariantPickerDialog, type VariantActionMode } from "./VariantPickerDialog";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import type { ExternalVariantStock } from "@/hooks/useExternalVariantStock";
import { SharePreviewDialog } from "./share/SharePreviewDialog";
import { ProductCardImage } from "./ProductCardImage";
import { ProductCardActions } from "./ProductCardActions";
import { PriceFreshnessBadge } from "./PriceFreshnessBadge";
import { QuickAddToQuote } from "./QuickAddToQuote";

export interface ProductCardProps {
  product: Product;
  onClick?: () => void;
  onView?: (product: Product) => void;
  onShare?: (product: Product) => void;
  onFavorite?: (product: Product) => void;
  highlightColors?: string[];
  isFavorited?: boolean;
  onToggleFavorite?: (productId: string) => void;
  isInCompare?: boolean;
  onToggleCompare?: (productId: string) => { added: boolean; isFull: boolean };
  canAddToCompare?: boolean;
  hideCategoryBadges?: boolean;
  isNovelty?: boolean;
  noveltyDaysRemaining?: number;
  activeColorFilter?: ActiveColorFilter | null;
}

function variantInfo(variant: ExternalVariantStock | null) {
  if (!variant) return undefined;
  return { color_name: variant.color_name, color_hex: variant.color_hex, size_code: variant.size_code, variant_id: variant.id, thumbnail: variant.selected_thumbnail };
}

function addVariantQuoteParams(params: URLSearchParams, variant: ExternalVariantStock | null) {
  if (variant?.color_name) params.set('color_name', variant.color_name);
  if (variant?.color_hex) params.set('color_hex', variant.color_hex);
  if (variant?.selected_thumbnail) params.set('product_image', variant.selected_thumbnail);
}

function quoteUrl(product: Product, variant: ExternalVariantStock | null) {
  const params = new URLSearchParams({ product_id: product.id, product_name: product.name, product_sku: product.sku || '', product_price: String(product.price ?? 0) });
  addVariantQuoteParams(params, variant);
  const image = variant?.selected_thumbnail || product.images?.[0];
  if (image) params.set('product_image', image);
  return `/orcamentos/novo?${params.toString()}`;
}

function variantNavigationUrl(productId: string, variant: { name: string; groupSlug?: string | null; hex?: string | null }) {
  const params = new URLSearchParams({ cor: variant.name });
  if (variant.groupSlug) params.set('grupo', variant.groupSlug);
  if (variant.hex) params.set('hex', variant.hex);
  return `/produto/${productId}?${params.toString()}`;
}

function cardInteractionOpen(states: boolean[], busy: boolean) {
  return busy || states.some(Boolean);
}

type CollectionVariant = { color_name?: string | null; color_hex?: string | null; variant_id?: string | null; thumbnail?: string | null };
type ShareVariant = { variantName?: string | null; colorHex?: string | null; thumbnailUrl?: string | null } | null;

function useCardDialogs() {
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [collectionVariant, setCollectionVariant] = useState<CollectionVariant | undefined>();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareVariant, setShareVariant] = useState<ShareVariant>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [variantPickerOpen, setVariantPickerOpen] = useState(false);
  const [variantPickerMode, setVariantPickerMode] = useState<VariantActionMode>('favorite');
  return { collectionModalOpen, setCollectionModalOpen, collectionVariant, setCollectionVariant, quickViewOpen, setQuickViewOpen,
    shareDialogOpen, setShareDialogOpen, shareVariant, setShareVariant, actionsOpen, setActionsOpen,
    variantPickerOpen, setVariantPickerOpen, variantPickerMode, setVariantPickerMode };
}

type CardDialogs = ReturnType<typeof useCardDialogs>;

function filterKey(filter?: ActiveColorFilter | null) {
  if (!filter) return '';
  return `${(filter.groups || []).join(',')}|${(filter.variations || []).join(',')}`;
}

function useActiveVariantReset(filter: ActiveColorFilter | null | undefined) {
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);
  const key = filterKey(filter);
  const previousKey = useRef(key);
  useEffect(() => {
    if (previousKey.current === key) return;
    setActiveVariantIdx(0);
    previousKey.current = key;
  }, [key]);
  return { activeVariantIdx, setActiveVariantIdx };
}

function currentMatchingVariant<T>(variants: T[], index: number) {
  if (variants.length <= 1) return { current: null, index: 0, multiple: false };
  const safeIndex = Math.min(index, variants.length - 1);
  return { current: variants[safeIndex] ?? null, index: safeIndex, multiple: true };
}

function resolveCardImage(product: Product, colorSpecificImage: string | null) {
  return colorSpecificImage || product.og_image_url || product.images[0] || null;
}

function imageScale(oversized: boolean, hovered: boolean) {
  const base = oversized ? 0.88 : 1;
  const hover = hovered ? 1.03 : 1;
  return Number((base * hover).toFixed(3));
}

function useCardVisuals(product: Product, activeColorFilter: ActiveColorFilter | null | undefined, highlightColors: string[] | undefined, hovered: boolean) {
  const variantState = useActiveVariantReset(activeColorFilter);
  const allMatchingVariants = useMemo(() => resolveAllMatchingColors(product.colors, activeColorFilter), [product.colors, activeColorFilter]);
  const match = currentMatchingVariant(allMatchingVariants, variantState.activeVariantIdx);
  const currentVariant = match.current;
  const matchedHighlightColor = useMemo(() => currentVariant?.hex || resolveHighlightHex(product.colors, activeColorFilter, highlightColors), [currentVariant?.hex, product.colors, activeColorFilter, highlightColors]);
  const colorSpecificImage = useMemo(() => (currentVariant?.image || resolveColorImage(product, activeColorFilter)) ?? null, [currentVariant?.image, product, activeColorFilter]);
  const rawImageUrl = resolveCardImage(product, colorSpecificImage);
  const cardImageUrl = useMemo(() => rawImageUrl ? getCdnUrl(rawImageUrl, "card") : "/placeholder.svg", [rawImageUrl]);
  const cardSrcSet = useMemo(() => colorSpecificImage ? undefined : (rawImageUrl ? getSrcSet(rawImageUrl) : undefined), [colorSpecificImage, rawImageUrl]);
  const activeColorName = (match.current?.name || getActiveColorName(product, activeColorFilter)) ?? null;
  const imageBounds = useProductBounds(cardImageUrl === "/placeholder.svg" ? null : cardImageUrl, { whiteThreshold: 230, margin: 0.01, maxSize: 384 });
  const oversized = imageBounds.detected && imageBounds.fractionX >= 0.86 && imageBounds.fractionY >= 0.86;
  const computedImageScale = imageScale(oversized, hovered);
  return { ...variantState, allMatchingVariants, currentVariant, safeVariantIdx: match.index, hasMultipleVariants: match.multiple,
    matchedHighlightColor, hasHighlightedColor: Boolean(matchedHighlightColor), colorSpecificImage, cardImageUrl, cardSrcSet, activeColorName, computedImageScale };
}

type CardVisuals = ReturnType<typeof useCardVisuals>;

interface VariantHandlerOptions { product: Product; dialogs: CardDialogs; navigate: ReturnType<typeof useNavigate> }

function useVariantHandler({ product, dialogs, navigate }: VariantHandlerOptions) {
  const favorites = useFavoritesStore();
  const comparison = useComparisonStore();
  return useCallback((variant: ExternalVariantStock | null) => {
    const info = variantInfo(variant);
    const suffix = variant?.color_name ? ` — ${variant.color_name}` : '';
    switch (dialogs.variantPickerMode) {
      case 'favorite': favorites.addFavorite(product.id, info); toast.success(`"${product.name}" favoritado${suffix}`); break;
      case 'compare': {
        const result = comparison.addToCompare(product.id, info);
        if (result) toast.success(`"${product.name}" adicionado à comparação${suffix}`);
        else showErrorToast({ title: "Limite de 4 produtos para comparação atingido" });
        break;
      }
      case 'collection': dialogs.setCollectionVariant(info); dialogs.setCollectionModalOpen(true); break;
      case 'quote': setTimeout(() => navigate(quoteUrl(product, variant)), 0); break;
      case 'share': dialogs.setShareVariant(variant ? { variantName: variant.color_name, colorHex: variant.color_hex, thumbnailUrl: variant.selected_thumbnail } : null); dialogs.setShareDialogOpen(true); break;
    }
  }, [dialogs, product, favorites, comparison, navigate]);
}

interface FavoriteCompareOptions { product: Product; dialogs: CardDialogs; isFavorited: boolean; isInCompare: boolean;
  onToggleFavorite?: ProductCardProps["onToggleFavorite"]; onToggleCompare?: ProductCardProps["onToggleCompare"] }

function useFavoriteCompare({ product, dialogs, isFavorited, isInCompare, onToggleFavorite, onToggleCompare }: FavoriteCompareOptions) {
  const actionBusyRef = useRef(false);
  const markBusy = useCallback(() => { actionBusyRef.current = true; setTimeout(() => { actionBusyRef.current = false; }, 500); }, []);
  const handleFavorite = useCallback((event: MouseEvent) => {
    event.stopPropagation(); markBusy(); dialogs.setActionsOpen(false);
    if (!isFavorited) { dialogs.setVariantPickerMode('favorite'); dialogs.setVariantPickerOpen(true); return; }
    if (onToggleFavorite) { onToggleFavorite(product.id); showUndoToast({ title: `"${product.name}" removido dos favoritos`, onUndo: () => onToggleFavorite(product.id) }); }
  }, [dialogs, isFavorited, markBusy, onToggleFavorite, product.id, product.name]);
  const handleCompare = useCallback((event: MouseEvent) => {
    event.stopPropagation(); markBusy(); dialogs.setActionsOpen(false);
    if (!isInCompare) { dialogs.setVariantPickerMode('compare'); dialogs.setVariantPickerOpen(true); return; }
    if (onToggleCompare) { onToggleCompare(product.id); showUndoToast({ title: `"${product.name}" removido da comparação`, onUndo: () => onToggleCompare(product.id) }); }
  }, [dialogs, isInCompare, markBusy, onToggleCompare, product.id, product.name]);
  return { actionBusyRef, markBusy, handleFavorite, handleCompare };
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
}

const STOCK_IN = 'in-stock';
const STOCK_LOW = 'low-stock';
const STOCK_OUT = 'out-of-stock';

function stockStatusColor(status: string) {
  if (status === STOCK_LOW) return STOCK_LOW;
  if (status === STOCK_OUT) return STOCK_OUT;
  return STOCK_IN;
}

function stockStatusLabel(status: string) {
  if (status === STOCK_LOW) return 'Estoque baixo';
  if (status === STOCK_OUT) return 'Sem estoque';
  return 'Em estoque';
}

function mobileStockLabel(status: string) {
  if (status === STOCK_IN) return '✓';
  if (status === STOCK_LOW) return '!';
  return '✗';
}

function ProductPriceStock({ product, filter }: { product: Product; filter?: ActiveColorFilter | null }) {
  const colorStock = resolveColorStock(product, filter);
  const stock = colorStock?.stock ?? product.stock;
  const status = colorStock?.stockStatus ?? product.stockStatus;
  return <div className="flex items-end justify-between pt-0.5 sm:pt-1"><div><p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">A partir de</p>
    <span className="text-base sm:text-xl font-display font-bold text-foreground inline-flex items-center gap-1.5">{formatPrice(product.price)}<PriceFreshnessBadge priceUpdatedAt={product.priceUpdatedAt} thresholdDays={product.priceFreshnessThresholdDays} variant="icon-only" /></span></div>
    <div className="flex flex-col items-end gap-0.5 sm:gap-1"><span className={cn("stock-indicator text-[10px] sm:text-xs", stockStatusColor(status))}><Package className="h-2.5 w-2.5 sm:h-3 sm:w-3" /><span className="hidden sm:inline">{stockStatusLabel(status)}</span><span className="sm:hidden">{mobileStockLabel(status)}</span></span>
      <span className="text-[10px] sm:text-xs text-muted-foreground">{stock.toLocaleString('pt-BR')} un.</span></div></div>;
}

function ProductMaterials({ materials }: { materials: Product["materials"] }) {
  if (!Array.isArray(materials) || materials.length === 0) return null;
  return <div className="hidden sm:flex flex-wrap gap-1.5 pt-2 border-t border-brand/10">{materials.slice(0, 2).map(material => <span key={material} className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground font-medium">{material}</span>)}
    {materials.length > 2 && <span className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground font-medium">+{materials.length - 2}</span>}
  </div>;
}

function ProductInfo({ product, hideCategoryBadges, activeColorFilter }: { product: Product; hideCategoryBadges: boolean; activeColorFilter?: ActiveColorFilter | null }) {
  return <div className="relative p-2.5 sm:p-4 space-y-2 sm:space-y-3 bg-card" style={{ zIndex: 10 }}>
    {!hideCategoryBadges && <ProductCategoryBadges category={product.category} groups={product.groups} categoryUuid={product.category_id} className="flex-wrap" />}
    <div className="flex items-center justify-between gap-2"><span className="text-[10px] sm:text-xs text-muted-foreground font-mono truncate">{product.sku}</span><div className="flex items-center gap-1 shrink-0"><GenderBadge gender={product.gender} size="sm" /><span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-secondary/50 text-secondary-foreground font-medium truncate max-w-[120px] flex items-center gap-1 border border-border/20 shadow-sm"><Building2 className={cn("h-3 w-3 shrink-0", getSupplierColors(product.supplier.name).text)} />{product.supplier.name}</span></div></div>
    <h3 data-testid="product-card-name" data-product-name={product.name} className="font-display font-semibold text-foreground line-clamp-2 min-h-[2.25rem] sm:min-h-[2.75rem] text-sm sm:text-base leading-snug group-hover:text-brand transition-colors duration-300">{product.name}</h3>
    <ProductPriceStock product={product} filter={activeColorFilter} /><ProductMaterials materials={product.materials} />
    <div className="pt-1.5 sm:pt-2 border-t border-border/30"><div className="flex items-center justify-between mb-0.5"><span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Vendas 30d</span></div><ProductSparkline productId={product.id} /></div>
    <QuickAddToQuote productId={product.id} productName={product.name} productSku={product.sku || undefined} productImageUrl={product.og_image_url || product.images[0]} productPrice={product.price} minQuantity={product.minQuantity || 1} labelOverride="Adicionar ao orçamento" iconOverride="cart" triggerTestId="product-card-quote-trigger" className="min-h-11 w-full rounded-full bg-[#00464d] font-bold text-white shadow-sm hover:bg-[#00383e]" />
  </div>;
}

interface ProductCardControllerOptions { props: ProductCardProps }

function useProductCardController({ props }: ProductCardControllerOptions) {
  const navigate = useNavigate();
  const isFavorited = useFavoritesStore((state) =>
    state.favorites.some((favorite) => favorite.productId === props.product.id),
  );
  const [hovered, setHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const dialogs = useCardDialogs();
  const visuals = useCardVisuals(props.product, props.activeColorFilter, props.highlightColors, hovered);
  const favoriteCompare = useFavoriteCompare({ product: props.product, dialogs, isFavorited, isInCompare: Boolean(props.isInCompare), onToggleFavorite: props.onToggleFavorite, onToggleCompare: props.onToggleCompare });
  const handleVariantComplete = useVariantHandler({ product: props.product, dialogs, navigate });
  const handleCardClick = useCallback((event: MouseEvent<HTMLElement>) => {
    const dialogStates = [dialogs.actionsOpen, dialogs.variantPickerOpen, dialogs.collectionModalOpen, dialogs.quickViewOpen, dialogs.shareDialogOpen];
    if (cardInteractionOpen(dialogStates, favoriteCompare.actionBusyRef.current)) { event.stopPropagation(); return; }
    if (visuals.currentVariant?.name && !event.shiftKey) { navigate(variantNavigationUrl(props.product.id, visuals.currentVariant)); return; }
    props.onClick?.();
  }, [dialogs, favoriteCompare.actionBusyRef, navigate, props, visuals.currentVariant]);
  const handleMouseLeave = useCallback(() => { setHovered(false); dialogs.setActionsOpen(false); }, [dialogs]);
  const openVariantPicker = useCallback((mode: VariantActionMode) => { dialogs.setActionsOpen(false); dialogs.setVariantPickerMode(mode); dialogs.setVariantPickerOpen(true); }, [dialogs]);
  const changeVariant = useCallback((index: number) => { visuals.setActiveVariantIdx(index); setImageLoaded(false); }, [visuals]);
  return { props, isFavorited, hovered, setHovered, imageLoaded, setImageLoaded, dialogs, visuals, favoriteCompare, handleVariantComplete, handleCardClick, handleMouseLeave, openVariantPicker, changeVariant };
}

type ProductCardController = ReturnType<typeof useProductCardController>;

function primaryProductImage(product: Product) { return product.og_image_url || product.images[0]; }
function minimumQuantity(product: Product) { return product.minQuantity || 1; }

function ProductImageSection({ controller }: { controller: ProductCardController }) {
  const { props, visuals } = controller;
  return <ProductCardImage product={props.product} cardImageUrl={visuals.cardImageUrl} cardSrcSet={visuals.cardSrcSet} activeColorName={visuals.activeColorName}
    colorSpecificImage={visuals.colorSpecificImage} imageLoaded={controller.imageLoaded} isHovered={controller.hovered} computedImageScale={visuals.computedImageScale}
    isNovelty={Boolean(props.isNovelty)} noveltyDaysRemaining={props.noveltyDaysRemaining} highlightColors={props.highlightColors} activeColorFilter={props.activeColorFilter}
    allMatchingVariants={visuals.allMatchingVariants} hasMultipleVariants={visuals.hasMultipleVariants} safeVariantIdx={visuals.safeVariantIdx}
    onImageLoad={() => controller.setImageLoaded(true)} onVariantChange={controller.changeVariant} />;
}

function ProductActionSection({ controller }: { controller: ProductCardController }) {
  const { props, dialogs, favoriteCompare } = controller;
  return <ProductCardActions productId={props.product.id} productName={props.product.name} productSku={props.product.sku} productImageUrl={primaryProductImage(props.product)}
    productPrice={props.product.price} productMinQuantity={minimumQuantity(props.product)} isFavorited={controller.isFavorited} isInCompare={Boolean(props.isInCompare)}
    canAddToCompare={props.canAddToCompare !== false} actionsOpen={dialogs.actionsOpen} onToggleActions={() => dialogs.setActionsOpen(!dialogs.actionsOpen)}
    onFavorite={favoriteCompare.handleFavorite} onCompare={favoriteCompare.handleCompare} onOpenVariantPicker={controller.openVariantPicker}
    onQuickView={() => { dialogs.setActionsOpen(false); dialogs.setQuickViewOpen(true); }} markBusy={favoriteCompare.markBusy} />;
}

function ProductDialogs({ controller }: { controller: ProductCardController }) {
  const { props, dialogs } = controller;
  return <><VariantPickerDialog open={dialogs.variantPickerOpen} onOpenChange={dialogs.setVariantPickerOpen} productId={props.product.id} productName={props.product.name} mode={dialogs.variantPickerMode} onComplete={controller.handleVariantComplete} />
    <AddToCollectionModal open={dialogs.collectionModalOpen} onOpenChange={dialogs.setCollectionModalOpen} productId={props.product.id} productName={props.product.name} variant={dialogs.collectionVariant} />
    <ProductQuickView product={props.product} open={dialogs.quickViewOpen} onOpenChange={dialogs.setQuickViewOpen} isFavorited={controller.isFavorited} onToggleFavorite={props.onToggleFavorite}
      isInCompare={Boolean(props.isInCompare)} onToggleCompare={props.onToggleCompare} onShare={props.onShare} />
    <SharePreviewDialog open={dialogs.shareDialogOpen} onOpenChange={dialogs.setShareDialogOpen} product={props.product} selectedVariant={dialogs.shareVariant} />
  </>;
}

function highlightedCardStyle(visuals: CardVisuals) {
  if (!visuals.hasHighlightedColor || !visuals.matchedHighlightColor) return undefined;
  return { borderColor: `${visuals.matchedHighlightColor}70`, boxShadow: `inset 0 0 30px -6px ${visuals.matchedHighlightColor}40, 0 0 8px -2px ${visuals.matchedHighlightColor}20` } as CSSProperties;
}

function ProductCardView({ controller, cardRef }: { controller: ProductCardController; cardRef: ForwardedRef<HTMLElement> }) {
  const { props, visuals } = controller;
  return <article ref={cardRef} data-testid="product-card" data-product-id={props.product.id}
    className={cn("group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card cursor-pointer card-lift", "transition-all duration-300 ease-out active:scale-[0.98] active:transition-transform active:duration-100 touch-manipulation", "focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 outline-none", props.product.featured && "ring-2 ring-brand/30 shadow-lg", visuals.hasHighlightedColor ? "border-2" : "border-[1.5px] border-border/60 hover:border-brand/50 hover:shadow-xl")}
    style={highlightedCardStyle(visuals)} onMouseEnter={() => controller.setHovered(true)} onMouseLeave={controller.handleMouseLeave} onClick={controller.handleCardClick}>
    <ProductImageSection controller={controller} /><ProductActionSection controller={controller} />
    <ProductInfo product={props.product} hideCategoryBadges={Boolean(props.hideCategoryBadges)} activeColorFilter={props.activeColorFilter} />
    <ProductDialogs controller={controller} />
  </article>;
}

export const ProductCard = memo(forwardRef<HTMLElement, ProductCardProps>(function ProductCard(props, ref) {
  const controller = useProductCardController({ props });
  return <ProductCardView controller={controller} cardRef={ref} />;
}));

ProductCard.displayName = 'ProductCard';
