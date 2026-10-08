import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductCategoryBadges } from "@/components/products/ProductCategoryBadges";
import { ProductGallery } from "@/components/products/ProductGallery";
import { ProductQuickActions } from "@/components/products/ProductQuickActions";
import { GenderBadge } from "@/components/products/GenderBadge";
import { ProductInfoBar } from "@/components/products/ProductInfoBar";
import { PackagingBadge } from "@/components/products/PackagingBadge";
import { ProductDimensions } from "@/components/products/ProductDimensions";
import { QuickAddToQuote } from "@/components/products/QuickAddToQuote";
import { BulkVariantWizard, type BulkVariantSelection } from "@/components/catalog/BulkVariantWizard";
import { DynamicTrustBadges } from "@/components/common/SocialProof";
import { PriceFreshnessBadge } from "@/components/products/PriceFreshnessBadge";
import { PriceFreshnessThresholdEditor } from "@/components/products/PriceFreshnessThresholdEditor";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { showUndoToast } from "@/utils/undoToast";
import { useToast } from "@/hooks/use-toast";
import { sortVariationsByColor } from "@/utils/colorSorting";
import { cn } from "@/lib/utils";
import { Clock, Eye, FileText, GitCompare, Heart, Layers, Package, Sparkles, Tag } from "lucide-react";
import type { Product, ProductVariation } from "@/types/product-catalog";

const EMPTY_SUPPLIER_TRUST = { isVerified: false, deliveryDays: null, avgRating: null };

function formatPrice(price: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
}

function ProductFlags({ product }: { product: Product }) {
  return <div className="flex flex-wrap gap-1.5">
    {product.featured && <Badge className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground px-2 py-0.5 text-[11px] shadow-sm"><Sparkles className="h-3 w-3 mr-1" />Destaque</Badge>}
    {product.newArrival && <Badge className="bg-gradient-to-r from-info to-info/80 text-info-foreground px-2 py-0.5 text-[11px]">Novidade</Badge>}
    {product.onSale && <Badge className="bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground px-2 py-0.5 text-[11px]">Promoção</Badge>}
    {product.isKit && <Badge className="bg-gradient-to-r from-warning to-warning/80 text-warning-foreground px-2 py-0.5 text-[11px]"><Layers className="h-3 w-3 mr-1" />KIT</Badge>}
    {product.gender && <GenderBadge gender={product.gender} size="md" />}
  </div>;
}

export function ProductHeroHeader(props: {
  product: Product;
  selectedVariation: ProductVariation | null;
  minQuantity: number;
  onOpenPackagingModal: () => void;
  onOpenFutureStock: () => void;
  onOpenSupplierComparison: () => void;
}) {
  const { product, selectedVariation, minQuantity } = props;
  return <div className="space-y-2">
    <ProductCategoryBadges category={product.category} groups={product.groups} categoryUuid={product.category_id}
      productId={product.id} productName={product.name} productSku={product.sku} productPrice={product.price}
      productImageUrl={product.images[0]} productMinQuantity={minQuantity} isKit={product.isKit} />
    <div className="flex flex-wrap gap-1.5">
      <ProductFlags product={product} />
      <PackagingBadge hasCommercialPackaging={product.hasCommercialPackaging ?? null} packingType={product.packingType ?? null}
        repackingType={product.repackingType ?? null} packagingContext={product.packagingContext ?? null} onClick={props.onOpenPackagingModal} />
    </div>
    <h1 data-testid="product-name" data-product-name={product.name} className="font-display text-lg sm:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-bold text-foreground leading-tight tracking-tight">{product.name}</h1>
    <ProductInfoBar sku={selectedVariation?.sku || product.sku} supplierName={product.supplier.name}
      supplierId={product.supplier.id} onOpenFutureStock={props.onOpenFutureStock} onOpenSupplierComparison={props.onOpenSupplierComparison} />
  </div>;
}

function variationVideoUrls(variation: ProductVariation): string[] | undefined {
  const urls = variation.videos
    ?.map(video => video.url_stream || video.url_hls || video.url_original)
    .filter((url): url is string => Boolean(url));
  return urls?.length ? urls : undefined;
}

export function ProductGalleryPanel(props: {
  product: Product;
  selectedVariation: ProductVariation | null;
  onSelectVariation: (variation: ProductVariation | null) => void;
}) {
  const { product, selectedVariation, onSelectVariation } = props;
  const colors = product.variations?.map(variation => ({
    name: variation.color.name,
    hex: variation.color.hex,
    sku: variation.sku,
    stock: variation.stock,
    image: variation.image ?? undefined,
    images: variation.images,
    videos: variationVideoUrls(variation),
  }));
  const selectColor = (index: number) => onSelectVariation(index < 0 ? null : product.variations?.[index] ?? null);
  return <div className="min-w-0">
    <div className="lg:sticky lg:top-20 space-y-3 pb-4">
      <ProductGallery images={product.images} productVideos={product.productVideos} productName={product.name}
        colors={colors} onColorSelect={selectColor}
        selectedColorIndex={product.variations?.findIndex(variation => variation.id === selectedVariation?.id) ?? -1} />
    </div>
  </div>;
}

export function ProductQuickActionsPanel({ product, selectedVariation }: {
  product: Product;
  selectedVariation: ProductVariation | null;
}) {
  return <div className="mt-auto">
    <ProductQuickActions productId={product.id} productName={product.name} productSku={product.sku}
      basePrice={product.price} minQuantity={product.minQuantity || 1} tags={quickActionTags(product)}
      niches={quickActionNiches(product)} product={product} selectedVariant={selectedVariantInfo(selectedVariation)} />
  </div>;
}

function quickActionTags(product: Product) {
  return product.tags ? {
    "Público-Alvo": product.tags.publicoAlvo || [],
    "Datas Comemorativas": product.tags.datasComemorativas || [],
    "Endomarketing": product.tags.endomarketing || [],
  } : undefined;
}

function selectedVariantInfo(selectedVariation: ProductVariation | null) {
  return selectedVariation ? {
    variantName: selectedVariation.color.name,
    colorHex: selectedVariation.color.hex,
    thumbnailUrl: selectedVariation.images?.[0] || selectedVariation.image,
  } : null;
}

function quickActionNiches(product: Product): string[] | undefined {
  return product.tags?.nicho || product.tags?.ramo || undefined;
}

function StockSelector(props: {
  product: Product;
  selectedVariation: ProductVariation | null;
  onSelect: (variation: ProductVariation | null) => void;
  stockLabelClass: string;
}) {
  const { product, selectedVariation, onSelect } = props;
  if (!product.variations?.length) {
    return <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border w-fit", props.stockLabelClass)}>
      <Package className="h-3.5 w-3.5" />{Math.max(0, product.stock).toLocaleString("pt-BR")} un.
    </span>;
  }
  return <div className="space-y-1.5">
    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold">Estoque por cor</p>
    <div className="flex flex-wrap items-center gap-1.5">
      {sortVariationsByColor(product.variations).map(variation => <VariationStockButton key={variation.id}
        variation={variation} selected={selectedVariation?.id === variation.id} onSelect={onSelect} />)}
    </div>
  </div>;
}

function VariationStockButton(props: { variation: ProductVariation; selected: boolean; onSelect: (variation: ProductVariation) => void }) {
  const { variation, selected, onSelect } = props;
  const stock = Math.max(0, variation.stock);
  const stockClass = stock === 0 ? "text-destructive" : stock < 100 ? "text-warning" : "text-muted-foreground";
  const selectedStyle = selected ? { backgroundColor: `${variation.color.hex}15`, border: `1.5px solid ${variation.color.hex}`, boxShadow: `0 0 0 2px ${variation.color.hex}20` } : undefined;
  return <button onClick={() => onSelect(variation)} title={`${variation.color.name}: ${stock.toLocaleString("pt-BR")} un.`}
    aria-label={`Cor ${variation.color.name}, ${stock} unidades`}
    className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11.5px] font-medium transition-all duration-200", !selected && "bg-secondary/30 border border-border/30 hover:bg-secondary/50", stock === 0 && "opacity-40")}
    style={selectedStyle}>
    <div className="w-3 h-3 rounded-full border border-border/40 shrink-0" style={{ backgroundColor: variation.color.hex }} />
    <span className={cn(stockClass)}>{stock >= 1000 ? `${(stock / 1000).toFixed(1)}k` : stock.toLocaleString("pt-BR")}</span>
  </button>;
}

function quoteUrl(product: Product, id: string, minQuantity: number, selections: BulkVariantSelection[]): string {
  const variant = selections[0]?.variant;
  const params = new URLSearchParams({
    product_id: id, product_name: product.name, product_sku: product.sku || '',
    product_price: String(product.price), product_image: variant?.selected_thumbnail || product.images[0] || '',
    min_quantity: String(minQuantity),
  });
  setOptionalParam(params, 'color_name', variant?.color_name);
  setOptionalParam(params, 'color_hex', variant?.color_hex);
  setOptionalParam(params, 'size_code', variant?.size_code);
  return `/orcamentos/novo?${params.toString()}`;
}

function setOptionalParam(params: URLSearchParams, name: string, value?: string | null): void {
  if (value) params.set(name, value);
}

function QuoteActions(props: { product: Product; id: string; minQuantity: number; wizardOpen: boolean; setWizardOpen: (open: boolean) => void }) {
  const navigate = useNavigate();
  return <div className="flex gap-2.5">
    <QuickAddToQuote productId={props.id} productName={props.product.name} productSku={props.product.sku}
      productImageUrl={props.product.images[0]} productPrice={props.product.price} minQuantity={props.minQuantity}
      variant="button" buttonSize="lg" className="flex-1 basis-0 h-12 xl:h-13 rounded-xl bg-cart hover:bg-cart-hover text-cart-foreground font-display font-bold text-[0.875rem] tracking-wide shadow-md shadow-cart/20 hover:shadow-lg hover:shadow-cart/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] gap-1.5"
      labelOverride="Carrinho" iconOverride="cart" />
    <Button size="lg" className="flex-1 basis-0 h-12 xl:h-13 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground font-display font-bold text-[0.875rem] tracking-wide shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] gap-1.5" onClick={() => props.setWizardOpen(true)}>
      <FileText className="h-4 w-4" />Orçamento
    </Button>
    <BulkVariantWizard open={props.wizardOpen} onOpenChange={props.setWizardOpen} products={[props.product]} mode="quote"
      onComplete={selections => navigate(quoteUrl(props.product, props.id, props.minQuantity, selections))} />
  </div>;
}

function compareProduct(product: Product, selectedVariation: ProductVariation | null, toast: ReturnType<typeof useToast>["toast"]): void {
  const { toggleCompare } = useComparisonStore.getState();
  const result = toggleCompare(product.id, selectedVariation ?? undefined);
  if (result.isFull) {
    toast({ title: "Limite atingido", description: "Você pode comparar até 4 produtos.", variant: "destructive" });
    return;
  }
  showUndoToast({
    title: result.added ? "Adicionado para comparação" : "Removido da comparação",
    description: product.name,
    onUndo: () => toggleCompare(product.id, selectedVariation ?? undefined),
  });
}

function TrustActions(props: { product: Product; selectedVariation: ProductVariation | null; favorite: boolean; onToggleFavorite: () => void; viewCount: number }) {
  const { toast } = useToast();
  const isInCompare = useComparisonStore(state => state.compareIds.includes(props.product.id));
  return <div className="space-y-2.5 pt-1">
    <DynamicTrustBadges trust={EMPTY_SUPPLIER_TRUST} productFlags={{ newArrival: props.product.newArrival, onSale: props.product.onSale, featured: props.product.featured, minQuantity: props.product.minQuantity }} className="text-[10px]" />
    <div className="flex items-center gap-3 pt-2 border-t border-border/30">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Eye className="h-3.5 w-3.5" /><span className="font-semibold text-foreground">{props.viewCount}</span><span>visualizações</span></div>
      <div className="h-4 w-px bg-border/30" />
      <Button variant="ghost" size="sm" onClick={props.onToggleFavorite} data-testid="product-favorite"
        aria-pressed={props.favorite} aria-label={props.favorite ? "Remover dos favoritos" : "Favoritar"}
        className={cn("rounded-full px-3 text-xs gap-1.5 h-7 transition-all", props.favorite && "text-destructive bg-destructive/10")}>
        <Heart className={cn("h-3.5 w-3.5", props.favorite && "fill-destructive text-destructive scale-110")} />{props.favorite ? "Favoritado" : "Favoritar"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => compareProduct(props.product, props.selectedVariation, toast)} className={cn("rounded-full px-3 text-xs gap-1.5 h-7 transition-all", isInCompare && "text-primary bg-primary/10")}>
        <GitCompare className={cn("h-3.5 w-3.5", isInCompare && "text-primary scale-110")} />{isInCompare ? "Comparando" : "Comparar"}
      </Button>
    </div>
  </div>;
}

export function ProductPriceCard(props: {
  product: Product; id: string; selectedVariation: ProductVariation | null;
  onSelectVariation: (variation: ProductVariation | null) => void; minQuantity: number;
  thresholdDays: number; stockLabelClass: string; wizardOpen: boolean; setWizardOpen: (open: boolean) => void;
  favorite: boolean; onToggleFavorite: () => void; viewCount: number;
}) {
  return <div className="group/price rounded-2xl bg-gradient-to-br from-card via-card to-secondary/10 border border-border/60 p-5 xl:p-6 shadow-lg relative overflow-hidden flex flex-col">
    <div className="relative flex flex-col gap-4">
      <div><p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.15em] font-semibold mb-1">A partir de</p>
        <span className="text-3xl xl:text-4xl font-display font-extrabold text-foreground">{formatPrice(props.product.price)}</span><span className="text-sm text-muted-foreground/50"> /un</span>
        <div className="mt-2 flex flex-wrap items-center gap-2"><PriceFreshnessBadge priceUpdatedAt={props.product.priceUpdatedAt} thresholdDays={props.thresholdDays} variant="pdp" alwaysShow /><PriceFreshnessThresholdEditor productId={props.id} currentEffectiveDays={props.thresholdDays} /></div>
      </div>
      <StockSelector product={props.product} selectedVariation={props.selectedVariation} onSelect={props.onSelectVariation} stockLabelClass={props.stockLabelClass} />
      <div className="flex items-center gap-4 py-2.5 px-3 rounded-lg bg-secondary/20 border border-border/20">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Tag className="h-3 w-3 text-primary" /><span>Mín. {props.minQuantity}</span></div>
        <div className="h-3.5 w-px bg-border/40" /><div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Clock className="h-3 w-3 text-info" /><span>{props.product.leadTimeDays ? `${props.product.leadTimeDays} dias úteis` : 'Consultar prazo'}</span></div>
      </div>
      <QuoteActions product={props.product} id={props.id} minQuantity={props.minQuantity} wizardOpen={props.wizardOpen} setWizardOpen={props.setWizardOpen} />
      <TrustActions product={props.product} selectedVariation={props.selectedVariation} favorite={props.favorite} onToggleFavorite={props.onToggleFavorite} viewCount={props.viewCount} />
    </div>
  </div>;
}

function Description({ description }: { description?: string | null }) {
  if (!description) return <p className="text-muted-foreground italic text-xs">Sem descrição disponível</p>;
  const sentences = description.split(/[.]\s+/).map(sentence => sentence.trim().replace(/\.$/, '')).filter(sentence => sentence.length > 5);
  if (sentences.length <= 2) return <p className="text-muted-foreground leading-relaxed text-xs">{description}</p>;
  return <ul className="space-y-1">{sentences.map(sentence => <li key={sentence} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />{sentence}</li>)}</ul>;
}

export function ProductSpecsCard({ product }: { product: Product }) {
  return <div id="sec-specs" className="scroll-mt-28 rounded-2xl border border-border/60 bg-card/40 p-5 xl:p-6 flex flex-col gap-4">
    <div id="sec-descricao" className="scroll-mt-28"><h4 className="text-xs xl:text-sm font-bold text-foreground mb-2 uppercase tracking-wide">Descrição</h4><Description description={product.description} /></div>
    <div className="border-t border-border/30 pt-4 space-y-3"><h4 className="text-xs xl:text-sm font-bold text-foreground uppercase tracking-wide">Especificações</h4>
      {product.materials.length > 0 && <div className="flex flex-wrap gap-1.5">{product.materials.map(material => <Badge key={material} variant="secondary" className="px-2.5 py-0.5 text-[11px] rounded-full">{material}</Badge>)}</div>}
      <ProductDimensions dimensions={product.dimensions} compact />
    </div>
  </div>;
}
