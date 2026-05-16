/**
 * ProductDetailHero — Seção hero com galeria + info do produto
 * Extraído de ProductDetail para reduzir complexidade
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart, Package, Clock, Tag, Layers, Sparkles, FileText, Eye, GitCompare
} from "lucide-react";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { showUndoToast } from "@/utils/undoToast";
import { useToast } from "@/hooks/use-toast";

import { ProductGallery } from "@/components/products/ProductGallery";
import { KitComposition } from "@/components/products/KitComposition";
import { ProductCategoryBadges } from "@/components/products/ProductCategoryBadges";
import { GenderBadge } from "@/components/products/GenderBadge";
import { ProductQuickActions } from "@/components/products/ProductQuickActions";
import { ProductInfoBar } from "@/components/products/ProductInfoBar";
import { PackagingBadge } from "@/components/products/PackagingBadge";
import { ProductDimensions } from "@/components/products/ProductDimensions";
import { QuickAddToQuote } from "@/components/products/QuickAddToQuote";
import { BulkVariantWizard } from "@/components/catalog/BulkVariantWizard";
import { DynamicTrustBadges } from "@/components/common/SocialProof";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriceFreshnessBadge } from "@/components/products/PriceFreshnessBadge";
import { PriceFreshnessThresholdEditor } from "@/components/products/PriceFreshnessThresholdEditor";
import { useProductFreshnessOverride } from "@/hooks/useProductFreshnessOverride";
import { DEFAULT_PRICE_FRESHNESS_THRESHOLD_DAYS } from "@/utils/price-freshness";
import { cn } from "@/lib/utils";
import { sortVariationsByColor } from "@/utils/colorSorting";
import type { Product } from "@/hooks/useProducts";

interface ProductDetailHeroProps {
  product: Product;
  id: string;
  selectedVariation: any;
  setSelectedVariation: (v: any) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  viewCount: number;
  supplierTrust: any;
  onOpenPackagingModal: () => void;
  onOpenFutureStock: () => void;
  onOpenSupplierComparison: () => void;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

const getStockStatusInfo = (status: string) => {
  switch (status) {
    case "in-stock": return { label: "Em estoque", class: "bg-success/10 text-success border-success/20" };
    case "low-stock": return { label: "Estoque baixo", class: "bg-warning/10 text-warning border-warning/20" };
    case "out-of-stock": return { label: "Sem estoque", class: "bg-destructive/10 text-destructive border-destructive/20" };
    default: return { label: "Consultar", class: "bg-muted text-muted-foreground" };
  }
};

export function ProductDetailHero({
  product, id, selectedVariation, setSelectedVariation,
  isFavorite, onToggleFavorite, viewCount, supplierTrust,
  onOpenPackagingModal, onOpenFutureStock, onOpenSupplierComparison,
}: ProductDetailHeroProps) {
  const navigate = useNavigate();
  const [quoteVariantWizardOpen, setQuoteVariantWizardOpen] = useState(false);

  const minQuantity = product.minQuantity || 1;
  const stockInfo = getStockStatusInfo(product.stockStatus);

  // Override local (admin-only) tem precedência sobre o valor exposto pelo BD
  // externo. Quando ambos são nulos, o util cai no default de 60 dias.
  const { data: freshnessOverride } = useProductFreshnessOverride(id);
  const effectiveThresholdDays =
    freshnessOverride?.threshold_days ??
    product.priceFreshnessThresholdDays ??
    DEFAULT_PRICE_FRESHNESS_THRESHOLD_DAYS;

  return (
    <div className="grid min-w-0 overflow-x-hidden lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4 lg:gap-6 xl:gap-8">
      {/* LEFT — Gallery */}
      <div className="min-w-0">
        <div className="lg:sticky lg:top-20 space-y-3 pb-4">
          <ProductGallery
            images={product.images}
            video={product.video}
            productVideos={product.productVideos}
            productName={product.name}
            colors={product.variations?.map((variation: any) => ({
              name: variation.color.name, hex: variation.color.hex, sku: variation.sku,
              stock: variation.stock, image: variation.image, images: variation.images, videos: variation.videos,
            }))}
            onColorSelect={(index: number) => {
              if (index === -1) setSelectedVariation(null);
              else if (product.variations?.[index]) setSelectedVariation(product.variations[index]);
            }}
            selectedColorIndex={product.variations?.findIndex((v: any) => v.id === selectedVariation?.id) ?? -1}
          />
        </div>
      </div>

      {/* RIGHT — Info */}
      <div className="flex flex-col gap-3 md:gap-4 xl:gap-5 min-w-0">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <ProductCategoryBadges
              category={product.category} groups={product.groups}
              categoryUuid={product.category_id} productId={product.id}
              productName={product.name} productSku={product.sku}
              productPrice={product.price} productImageUrl={product.images?.[0]}
              productMinQuantity={minQuantity} isKit={product.isKit}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {product.featured && (
              <Badge className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground px-2 py-0.5 text-[11px] shadow-sm">
                <Sparkles className="h-3 w-3 mr-1" />Destaque
              </Badge>
            )}
            {product.newArrival && <Badge className="bg-gradient-to-r from-info to-info/80 text-info-foreground px-2 py-0.5 text-[11px]">Novidade</Badge>}
            {product.onSale && <Badge className="bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground px-2 py-0.5 text-[11px]">Promoção</Badge>}
            {product.isKit && (
              <Badge className="bg-gradient-to-r from-warning to-warning/80 text-warning-foreground px-2 py-0.5 text-[11px]">
                <Layers className="h-3 w-3 mr-1" />KIT
              </Badge>
            )}
            {product.gender && <GenderBadge gender={product.gender} size="md" />}
            <PackagingBadge
              hasCommercialPackaging={product.hasCommercialPackaging}
              packingType={product.packingType}
              repackingType={product.repackingType}
              packagingContext={product.packagingContext}
              onClick={onOpenPackagingModal}
            />
          </div>
          <h1
            data-testid="product-name"
            data-product-name={product.name}
            className="font-display text-lg sm:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-bold text-foreground leading-tight tracking-tight"
          >
            {product.name}
          </h1>
          <ProductInfoBar
            sku={selectedVariation?.sku || product.sku}
            supplierName={product.supplier.name}
            supplierId={product.supplier.id}
            onOpenFutureStock={onOpenFutureStock}
            onOpenSupplierComparison={onOpenSupplierComparison}
          />
        </div>

        {/* Price + Specs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 xl:gap-4 items-stretch flex-1">
          {/* Price & CTA */}
          <div className="group/price rounded-2xl bg-gradient-to-br from-card via-card to-secondary/10 border border-border/60 p-5 xl:p-6 shadow-lg relative overflow-hidden flex flex-col transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/20">
            {product.featured && (
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/8 to-transparent rounded-bl-full transition-opacity duration-500 group-hover/price:from-primary/15" />
            )}
            <div className="relative flex flex-col gap-4">
              <div>
                <p className="text-[10px] xl:text-[11px] text-muted-foreground/60 uppercase tracking-[0.15em] font-semibold mb-1">A partir de</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl xl:text-4xl font-display font-extrabold text-foreground tracking-tight leading-none">{formatPrice(product.price)}</span>
                  <span className="text-sm text-muted-foreground/50 font-medium">/un</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <PriceFreshnessBadge
                    priceUpdatedAt={product.priceUpdatedAt}
                    thresholdDays={effectiveThresholdDays}
                    variant="pdp"
                    alwaysShow
                  />
                  <PriceFreshnessThresholdEditor
                    productId={id}
                    currentEffectiveDays={effectiveThresholdDays}
                  />
                </div>
              </div>

              {/* Stock per color */}
              {product.variations && product.variations.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold">Estoque por cor</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {sortVariationsByColor(product.variations).map((variation: any) => {
                      const isSelected = selectedVariation?.id === variation.id;
                      const stock = Math.max(0, variation.stock);
                      return (
                        <button key={variation.id} onClick={() => setSelectedVariation(variation)}
                          title={`${variation.color.name}: ${stock.toLocaleString("pt-BR")} un.`}
                          aria-label={`Cor ${variation.color.name}, ${stock} unidades`}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11.5px] font-medium transition-all duration-200",
                            !isSelected && "bg-secondary/30 border border-border/30 hover:bg-secondary/50",
                            stock === 0 && "opacity-40"
                          )}
                          style={isSelected ? {
                            backgroundColor: `${variation.color.hex}15`,
                            border: `1.5px solid ${variation.color.hex}`,
                            boxShadow: `0 0 0 2px ${variation.color.hex}20`
                          } : undefined}
                        >
                          <div className="w-3 h-3 rounded-full border border-border/40 shrink-0" style={{ backgroundColor: variation.color.hex }} />
                          <span className={cn(stock === 0 ? "text-destructive" : stock < 100 ? "text-warning" : "text-muted-foreground")}>
                            {stock >= 1000 ? `${(stock / 1000).toFixed(1)}k` : stock.toLocaleString("pt-BR")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border w-fit", stockInfo.class)}>
                  <Package className="h-3.5 w-3.5" />{Math.max(0, product.stock).toLocaleString("pt-BR")} un.
                </span>
              )}

              {/* Compact info */}
              <div className="flex items-center gap-4 py-2.5 px-3 rounded-lg bg-secondary/20 border border-border/20">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Tag className="h-3 w-3 text-primary shrink-0" /><span className="font-medium">Mín. {minQuantity}</span>
                </div>
                <div className="h-3.5 w-px bg-border/40" />
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3 text-info shrink-0" />
                  <span className="font-medium">{product.leadTimeDays ? `${product.leadTimeDays} dias úteis` : 'Consultar prazo'}</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex gap-2.5">
                <QuickAddToQuote
                  productId={id} productName={product.name} productSku={product.sku}
                  productImageUrl={product.images?.[0]} productPrice={product.price}
                  minQuantity={minQuantity} variant="button" buttonSize="lg"
                  className="flex-1 basis-0 h-12 xl:h-13 rounded-xl bg-cart hover:bg-cart-hover text-cart-foreground font-display font-bold text-[0.875rem] tracking-wide shadow-md shadow-cart/20 hover:shadow-lg hover:shadow-cart/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] gap-1.5"
                  labelOverride="Carrinho" iconOverride="cart"
                />
                <Button size="lg"
                  className="flex-1 basis-0 h-12 xl:h-13 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground font-display font-bold text-[0.875rem] tracking-wide shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] gap-1.5"
                  onClick={() => setQuoteVariantWizardOpen(true)}
                >
                  <FileText className="h-4 w-4" />Orçamento
                </Button>
                <BulkVariantWizard
                  open={quoteVariantWizardOpen} onOpenChange={setQuoteVariantWizardOpen}
                  products={[product]} mode="quote"
                  onComplete={(selections) => {
                    const s = selections[0];
                    const v = s?.variant;
                    const params = new URLSearchParams({
                      product_id: id, product_name: product.name, product_sku: product.sku || '',
                      product_price: String(product.price), product_image: v?.selected_thumbnail || product.images?.[0] || '',
                      min_quantity: String(minQuantity),
                    });
                    if (v?.color_name) params.set('color_name', v.color_name);
                    if (v?.color_hex) params.set('color_hex', v.color_hex);
                    if (v?.size_code) params.set('size_code', v.size_code);
                    navigate(`/orcamentos/novo?${params.toString()}`);
                  }}
                />
              </div>

              {/* Trust + Social proof */}
              <div className="space-y-2.5 pt-1">
                <DynamicTrustBadges
                  trust={supplierTrust ?? { isVerified: false, deliveryDays: null, avgRating: null }}
                  productFlags={{ newArrival: product?.newArrival ?? false, onSale: product?.onSale ?? false, featured: product?.featured ?? false, minQuantity: product?.minQuantity }}
                  className="text-[10px]"
                />
                <div className="flex items-center gap-3 pt-2 border-t border-border/30">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" /><span className="font-semibold text-foreground">{viewCount}</span><span>visualizações</span>
                  </div>
                  <div className="h-4 w-px bg-border/30" />
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={onToggleFavorite}
                      className={cn("rounded-full px-3 text-xs gap-1.5 h-7 transition-all duration-300 hover:bg-destructive/15 hover:text-destructive hover:scale-105 hover:shadow-md hover:shadow-destructive/20", isFavorite && "text-destructive bg-destructive/10")}
                    >
                      <Heart className={cn("h-3.5 w-3.5 transition-all duration-300", isFavorite && "fill-destructive text-destructive scale-110")} />
                      {isFavorite ? "Favoritado" : "Favoritar"}
                    </Button>

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        const { toggleCompare, isInCompare } = useComparisonStore.getState();
                        const isCurrentlyIn = isInCompare(id);
                        const { added, isFull } = toggleCompare(id, selectedVariation);
                        
                        if (isFull) {
                          toast({
                            title: "Limite atingido",
                            description: "Você pode comparar até 4 produtos.",
                            variant: "destructive"
                          });
                        } else if (added) {
                          showUndoToast({
                            title: "Adicionado para comparação",
                            description: product.name,
                            onUndo: () => toggleCompare(id, selectedVariation),
                          });
                        } else {
                          showUndoToast({
                            title: "Removido da comparação",
                            description: product.name,
                            onUndo: () => toggleCompare(id, selectedVariation),
                          });
                        }
                      }}
                      className={cn(
                        "rounded-full px-3 text-xs gap-1.5 h-7 transition-all duration-300 hover:bg-primary/15 hover:text-primary hover:scale-105 hover:shadow-md hover:shadow-primary/20",
                        useComparisonStore(s => s.isInCompare(id)) && "text-primary bg-primary/10"
                      )}
                    >
                      <GitCompare className={cn("h-3.5 w-3.5 transition-all duration-300", useComparisonStore(s => s.isInCompare(id)) && "text-primary scale-110")} />
                      {useComparisonStore(s => s.isInCompare(id)) ? "Comparando" : "Comparar"}
                    </Button>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Specs + Description */}
          <div id="sec-specs" className="scroll-mt-28 rounded-2xl border border-border/60 bg-card/40 p-5 xl:p-6 flex flex-col gap-4">
            <div id="sec-descricao" className="scroll-mt-28">
              <h4 className="text-xs xl:text-sm font-bold text-foreground mb-2 uppercase tracking-wide">Descrição</h4>
              {product.description ? (() => {
                const sentences = product.description.split(/[.]\s+/).map(s => s.trim().replace(/\.$/, '')).filter(s => s.length > 5);
                if (sentences.length > 2) {
                  return (
                    <ul className="space-y-1">
                      {sentences.map((sentence, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />{sentence}
                        </li>
                      ))}
                    </ul>
                  );
                }
                return <p className="text-muted-foreground leading-relaxed text-xs">{product.description}</p>;
              })() : <p className="text-muted-foreground italic text-xs">Sem descrição disponível</p>}
            </div>
            <div className="border-t border-border/30 pt-4 space-y-3">
              <h4 className="text-xs xl:text-sm font-bold text-foreground uppercase tracking-wide">Especificações</h4>
              {product.materials && product.materials.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {product.materials.map((material: string) => (
                    <Badge key={material} variant="secondary" className="px-2.5 py-0.5 text-[11px] rounded-full">{material}</Badge>
                  ))}
                </div>
              )}
              <ProductDimensions dimensions={product.dimensions} compact />
            </div>
          </div>
        </div>

        {/* Kit Composition */}
        {product.isKit && product.kitItems && <KitComposition items={product.kitItems} />}

        {/* Quick Actions */}
        <div className="mt-auto">
          <ProductQuickActions
            productId={product.id} productName={product.name} productSku={product.sku}
            basePrice={product.price} minQuantity={minQuantity}
            tags={product.tags ? { "Público-Alvo": product.tags.publicoAlvo || [], "Datas Comemorativas": product.tags.datasComemorativas || [], "Endomarketing": product.tags.endomarketing || [] } : undefined}
            niches={product.tags?.nicho || product.tags?.ramo || undefined}
            product={product}
            selectedVariant={selectedVariation ? { variantName: selectedVariation.color?.name, colorHex: selectedVariation.color?.hex, thumbnailUrl: selectedVariation.images?.[0] || selectedVariation.image } : null}
          />
        </div>
      </div>
    </div>
  );
}
