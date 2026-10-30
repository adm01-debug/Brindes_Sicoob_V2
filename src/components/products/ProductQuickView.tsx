import { useState, useMemo, useEffect, forwardRef, useCallback } from "react";
// framer-motion removido — transição via CSS animate-fade-in
// framer-motion removido — transição via CSS animate-fade-in
import { Heart, GitCompare, Share2, ShoppingCart, Package, Truck, ExternalLink, Plus, Minus } from "lucide-react";
import { type NavigateFunction, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VisuallyHidden } from "@/components/a11y/VisuallyHidden";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";
import { ProductCategoryBadges } from "./ProductCategoryBadges";
import { QuickViewGallery } from "./quick-view/QuickViewGallery";
import { ProductColorSelector, type ProductColor } from "./ProductColorSelector";
import { sortByColorGroup } from "@/utils/colorSorting";
import { toast } from "sonner";
import { useProductImages } from "@/hooks/useProductImages";
import { getColorImages, type ProductImageMeta } from "@/utils/image-utils";
import { PriceFreshnessBadge } from "@/components/products/PriceFreshnessBadge";

interface ProductQuickViewProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (productId: string) => void;
  isInCompare?: boolean;
  onToggleCompare?: (productId: string) => { added: boolean; isFull: boolean };
  onShare?: (product: Product) => void;
}

function formatQuickViewPrice(price: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
}

function quickViewStock(status: string) {
  if (status === "low-stock") return { label: "Estoque baixo", color: "text-warning", bg: "bg-warning/10" };
  if (status === "out-of-stock") return { label: "Sem estoque", color: "text-destructive", bg: "bg-destructive/10" };
  return { label: "Em estoque", color: "text-success", bg: "bg-success/10" };
}

function QuickViewActions({ product, isFavorited, isInCompare, onFavorite, onCompare, onShare, onQuote, onDetails }: { product: Product; isFavorited: boolean; isInCompare: boolean; onFavorite: () => void; onCompare: () => void; onShare?: (product: Product) => void; onQuote: () => void; onDetails: () => void }) {
  return (
    <div className="space-y-3 mt-4">
      <div className="flex gap-2">
        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className={cn("h-11 w-11", isFavorited && "bg-destructive/10 border-destructive/30 text-destructive")} onClick={onFavorite} data-testid="product-favorite" aria-pressed={isFavorited} aria-label={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}><Heart className={cn("h-5 w-5", isFavorited && "fill-current")} /></Button></TooltipTrigger><TooltipContent>{isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className={cn("h-11 w-11", isInCompare && "bg-primary/10 border-primary/30 text-primary")} onClick={onCompare} aria-label={isInCompare ? "Remover da comparação" : "Adicionar à comparação"}><GitCompare className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent>{isInCompare ? "Remover da comparação" : "Adicionar à comparação"}</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Compartilhar" className="h-11 w-11" onClick={() => onShare?.(product)}><Share2 className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent>Compartilhar</TooltipContent></Tooltip>
        <Button data-testid="product-quickview-add-to-quote" variant="orange" className="flex-1 h-11" onClick={onQuote}><ShoppingCart className="h-5 w-5 mr-2" />Adicionar ao Orçamento</Button>
      </div>
      <Button variant="outline" className="w-full h-11" onClick={onDetails}><ExternalLink className="h-4 w-4 mr-2" />Ver Detalhes Completos</Button>
    </div>
  );
}

function QuickViewInfo({ product, colors, selectedColorId, quantity, isFavorited, isInCompare, onColorSelect, onQuantity, onFavorite, onCompare, onShare, onQuote, onDetails }: { product: Product; colors: ProductColor[]; selectedColorId: string | null; quantity: number; isFavorited: boolean; isInCompare: boolean; onColorSelect: (color: ProductColor) => void; onQuantity: (quantity: number) => void; onFavorite: () => void; onCompare: () => void; onShare?: (product: Product) => void; onQuote: () => void; onDetails: () => void }) {
  const stock = quickViewStock(product.stockStatus);
  return (
    <div className="p-6 flex flex-col">
      <div className="space-y-3"><ProductCategoryBadges category={product.category} groups={product.groups} categoryUuid={product.category_id} /><div className="flex items-center gap-2 text-sm"><span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">{product.supplier.name}</span></div><h2 data-testid="product-quickview-name" className="text-2xl font-display font-bold text-foreground leading-tight">{product.name}</h2><p className="text-sm text-muted-foreground">SKU: {product.sku}</p></div>
      <Separator className="my-4" />
      <div className="flex items-end justify-between"><div><p className="text-xs text-muted-foreground mb-1">A partir de</p><span className="text-3xl font-display font-bold text-foreground">{formatQuickViewPrice(product.price)}</span><div className="mt-1.5"><PriceFreshnessBadge priceUpdatedAt={product.priceUpdatedAt} thresholdDays={product.priceFreshnessThresholdDays} variant="inline" alwaysShow /></div></div><div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full", stock.bg)}><Package className={cn("h-4 w-4", stock.color)} /><span className={cn("text-sm font-medium", stock.color)}>{stock.label}</span></div></div>
      <Separator className="my-4" />
      {colors.length > 0 && <ProductColorSelector colors={colors} selectedColorId={selectedColorId} onColorSelect={onColorSelect} maxVisible={8} size="md" />}
      <div className="mt-4 space-y-2"><p className="text-sm font-medium text-foreground">Quantidade</p><div className="flex items-center gap-3"><Button variant="outline" size="icon" aria-label="Diminuir quantidade" className="h-9 w-9" onClick={() => onQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}><Minus className="h-4 w-4" /></Button><span className="text-lg font-semibold w-12 text-center">{quantity}</span><Button variant="outline" size="icon" aria-label="Aumentar quantidade" className="h-9 w-9" onClick={() => onQuantity(quantity + 1)}><Plus className="h-4 w-4" /></Button><span className="text-sm text-muted-foreground">= {formatQuickViewPrice(product.price * quantity)}</span></div></div>
      <div className="mt-4 p-3 rounded-lg bg-muted/30 flex items-center gap-3"><Truck className="h-5 w-5 text-muted-foreground" /><div className="text-sm"><p className="font-medium text-foreground">Entrega estimada</p><p className="text-muted-foreground">3-5 dias úteis após aprovação</p></div></div>
      <div className="flex-1 min-h-4" />
      <QuickViewActions product={product} isFavorited={isFavorited} isInCompare={isInCompare} onFavorite={onFavorite} onCompare={onCompare} onShare={onShare} onQuote={onQuote} onDetails={onDetails} />
    </div>
  );
}

function productQuickViewColors(product: Product): ProductColor[] {
  return sortByColorGroup(product.colors || [], (color) => color.name || "", (color) => color.hex).map((color, index) => ({
    id: color.code || `${product.id}-color-${index}`, name: color.name, hex: color.hex,
    variationName: color.name, groupName: color.group, groupSlug: color.groupSlug,
  }));
}

function useQuickViewGallery(product: Product | null, open: boolean, selectedColorId: string | null) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [, setImageError] = useState(false);
  const { data: productImages = [] } = useProductImages(open && product ? product.id : null);
  const imageMetas: ProductImageMeta[] = useMemo(() => productImages.map((image) => ({
    id: image.id, url_cdn: image.url_cdn, url_original: image.url_original || null, image_type: image.image_type,
    is_primary: image.is_primary, is_og_image: image.is_og_image || false, applies_to_color: image.supplier_code ? true : null,
    supplier_code: image.supplier_code || null, alt_text: image.alt_text, title_text: image.title_text, display_order: image.display_order,
  })), [productImages]);
  const displayImages = useMemo(() => {
    if (!product) return [];
    if (imageMetas.length > 0) {
      const filtered = selectedColorId ? getColorImages(imageMetas, selectedColorId) : [];
      return filtered.length > 0 ? filtered : imageMetas;
    }
    return product.images.map((url, index) => ({ url_cdn: url, url_original: url, image_type: index === 0 ? "main" : "gallery", is_primary: index === 0, display_order: index, alt_text: null, title_text: null }) as ProductImageMeta);
  }, [imageMetas, selectedColorId, product]);
  useEffect(() => { if (open) { setCurrentImageIndex(0); setImageError(false); } }, [open, product?.id]);
  useEffect(() => { setCurrentImageIndex(0); setImageError(false); }, [selectedColorId]);
  const previous = useCallback(() => { setImageError(false); setCurrentImageIndex((index) => index === 0 ? displayImages.length - 1 : index - 1); }, [displayImages.length]);
  const next = useCallback(() => { setImageError(false); setCurrentImageIndex((index) => index === displayImages.length - 1 ? 0 : index + 1); }, [displayImages.length]);
  useEffect(() => {
    if (!open) return;
    const keyDown = (event: KeyboardEvent) => { if (event.key === "ArrowLeft") previous(); if (event.key === "ArrowRight") next(); };
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [next, previous, open]);
  return { currentImageIndex, setCurrentImageIndex, displayImages };
}

function viewProductDetails(navigate: NavigateFunction, product: Product, colors: ProductColor[], selectedColorId: string | null) {
  const selectedColor = selectedColorId ? colors.find((color) => color.id === selectedColorId) : undefined;
  if (!selectedColor) { navigate(`/produto/${product.id}`); return; }
  const params = new URLSearchParams({ cor: selectedColor.name });
  if (selectedColor.hex) params.set("hex", selectedColor.hex);
  if (selectedColor.groupSlug) params.set("grupo", selectedColor.groupSlug);
  navigate(`/produto/${product.id}?${params.toString()}`);
}

function quoteProduct(navigate: NavigateFunction, product: Product) {
  const params = new URLSearchParams({ product_id: product.id, product_name: product.name || "", product_sku: product.sku || "", product_price: String(product.price ?? 0) });
  const image = product.images?.[0];
  if (image) params.set("product_image", image);
  navigate(`/orcamentos/novo?${params.toString()}`);
}

interface QuickViewDialogViewProps {
  product: Product;
  productColors: ProductColor[];
  gallery: ReturnType<typeof useQuickViewGallery>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedColorId: string | null;
  quantity: number;
  isFavorited: boolean;
  isInCompare: boolean;
  onColorSelect: (color: ProductColor) => void;
  onQuantity: (quantity: number) => void;
  onFavorite: () => void;
  onCompare: () => void;
  onShare?: (product: Product) => void;
  onQuote: () => void;
  onDetails: () => void;
}

function QuickViewDialogView({ product, productColors, gallery, open, onOpenChange, selectedColorId, quantity, isFavorited, isInCompare, onColorSelect, onQuantity, onFavorite, onCompare, onShare, onQuote, onDetails }: QuickViewDialogViewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-card border-border gap-0" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
        <VisuallyHidden><DialogTitle>Visualização rápida: {product.name}</DialogTitle></VisuallyHidden>
        <div className="grid md:grid-cols-2 gap-0">
          <QuickViewGallery productName={product.name} images={product.images} displayImages={gallery.displayImages} currentImageIndex={gallery.currentImageIndex} onIndexChange={gallery.setCurrentImageIndex} featured={product.featured} newArrival={product.newArrival} isKit={product.isKit} />
          <QuickViewInfo product={product} colors={productColors} selectedColorId={selectedColorId} quantity={quantity} isFavorited={isFavorited} isInCompare={isInCompare} onColorSelect={onColorSelect} onQuantity={onQuantity} onFavorite={onFavorite} onCompare={onCompare} onShare={onShare} onQuote={onQuote} onDetails={onDetails} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const ProductQuickView = forwardRef<HTMLDivElement, ProductQuickViewProps>(({ product, open, onOpenChange,
  isFavorited = false, onToggleFavorite, isInCompare = false, onToggleCompare, onShare }, _ref) => {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const gallery = useQuickViewGallery(product, open, selectedColorId);
  useEffect(() => { if (open) { setQuantity(1); setSelectedColorId(null); } }, [open, product?.id]);

  if (!product) return null;

  const productColors = productQuickViewColors(product);

  const handleFavorite = () => {
    if (onToggleFavorite) {
      onToggleFavorite(product.id);
      toast.success(
        isFavorited
          ? `"${product.name}" removido dos favoritos`
          : `"${product.name}" adicionado aos favoritos`
      );
    }
  };

  const handleCompare = () => {
    if (onToggleCompare) {
      const result = onToggleCompare(product.id);
      if (result.isFull) {
        toast.error("Limite de 4 produtos para comparação atingido");
      } else {
        toast.success(
          result.added
            ? `"${product.name}" adicionado à comparação`
            : `"${product.name}" removido da comparação`
        );
      }
    }
  };

  const handleViewDetails = () => { onOpenChange(false); viewProductDetails(navigate, product, productColors, selectedColorId); };
  const handleColorSelect = (color: ProductColor) => setSelectedColorId((current) => current === color.id ? null : color.id || null);
  const handleQuote = () => { onOpenChange(false); quoteProduct(navigate, product); };

  return <QuickViewDialogView product={product} productColors={productColors} gallery={gallery} open={open} onOpenChange={onOpenChange} selectedColorId={selectedColorId} quantity={quantity} isFavorited={isFavorited} isInCompare={isInCompare} onColorSelect={handleColorSelect} onQuantity={setQuantity} onFavorite={handleFavorite} onCompare={handleCompare} onShare={onShare} onQuote={handleQuote} onDetails={handleViewDetails} />;
});
ProductQuickView.displayName = "ProductQuickView";
