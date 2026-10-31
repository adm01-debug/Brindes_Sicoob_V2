import React, { useState } from "react";
import { Heart, Share2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { QuickAddToQuote } from "@/components/products/QuickAddToQuote";
import { BulkVariantWizard } from "@/components/catalog/BulkVariantWizard";
import type { Product } from "@/hooks/useProducts";

interface MobileProductActionsProps {
  productId: string;
  productName: string;
  productSku: string;
  productPrice: number;
  productImageUrl?: string;
  minQuantity?: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShare?: () => void;
  product?: Product;
}

type WizardSelections = Parameters<NonNullable<React.ComponentProps<typeof BulkVariantWizard>["onComplete"]>>[0];

function firstText(...values: Array<string | null | undefined>) {
  return values.find(Boolean) ?? "";
}

function createWizardProduct(props: MobileProductActionsProps): Product {
  if (props.product) return props.product;
  return { id: props.productId, name: props.productName, sku: props.productSku, price: props.productPrice, images: props.productImageUrl ? [props.productImageUrl] : [], minQuantity: props.minQuantity ?? 1 } as Product;
}

function quoteUrl(props: MobileProductActionsProps, selections: WizardSelections) {
  const variant = selections[0]?.variant;
  const params = new URLSearchParams({ product_id: props.productId, product_name: props.productName, product_sku: props.productSku, product_price: String(props.productPrice), product_image: firstText(variant?.selected_thumbnail, props.productImageUrl), min_quantity: String(props.minQuantity ?? 1) });
  if (variant?.color_name) params.set("color_name", variant.color_name);
  if (variant?.color_hex) params.set("color_hex", variant.color_hex);
  if (variant?.size_code) params.set("size_code", variant.size_code);
  return `/orcamentos/novo?${params.toString()}`;
}

function shareProduct(props: MobileProductActionsProps) {
  if (props.onShare) { props.onShare(); return; }
  if (navigator.share) void navigator.share({ title: props.productName, text: `Confira: ${props.productName} - ${props.productSku}`, url: window.location.href });
}

function MobileActionsBar({ props, onQuote, forwardedRef }: { props: MobileProductActionsProps; onQuote: () => void; forwardedRef: React.ForwardedRef<HTMLDivElement> }) {
  const minQuantity = props.minQuantity ?? 1;
  return <div ref={forwardedRef} className="fixed bottom-16 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-md border-t border-border" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}><div className="flex items-center gap-2 px-3 py-2">
    <Button variant="outline" size="icon" onClick={props.onToggleFavorite} className={cn("h-10 w-10 shrink-0 rounded-full transition-colors", props.isFavorite && "bg-destructive/10 border-destructive/50 text-destructive")} data-testid="product-favorite" aria-pressed={props.isFavorite} aria-label="Favoritar"><Heart className={cn("h-4 w-4", props.isFavorite && "fill-current")} /></Button>
    <Button variant="outline" size="icon" onClick={() => shareProduct(props)} className="h-10 w-10 shrink-0 rounded-full" aria-label="Compartilhar"><Share2 className="h-4 w-4" /></Button>
    <QuickAddToQuote productId={props.productId} productName={props.productName} productSku={props.productSku} productImageUrl={props.productImageUrl} productPrice={props.productPrice} minQuantity={minQuantity} variant="button" buttonSize="default" labelOverride="Carrinho" iconOverride="cart" className="flex-1 h-10 rounded-full bg-cart hover:bg-cart-hover text-cart-foreground font-medium text-sm" />
    <Button onClick={onQuote} className="flex-1 h-10 rounded-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm"><FileText className="h-4 w-4" />Orçamento</Button>
  </div></div>;
}

export const MobileProductActions = React.forwardRef<HTMLDivElement, MobileProductActionsProps>(
  function MobileProductActions({
    productId,
    productName,
    productSku,
    productPrice,
    productImageUrl,
    minQuantity = 1,
    isFavorite,
    onToggleFavorite,
    onShare,
    product,
  }, ref) {
  const props = { productId, productName, productSku, productPrice, productImageUrl, minQuantity, isFavorite, onToggleFavorite, onShare, product };
  const navigate = useNavigate();
  const [quoteWizardOpen, setQuoteWizardOpen] = useState(false);
  const wizardProduct = createWizardProduct(props);

  return (
    <>
      <MobileActionsBar props={props} onQuote={() => setQuoteWizardOpen(true)} forwardedRef={ref} />

      <BulkVariantWizard
        open={quoteWizardOpen}
        onOpenChange={setQuoteWizardOpen}
        products={[wizardProduct]}
        mode="quote"
        onComplete={(selections) => navigate(quoteUrl(props, selections))}
      />
    </>
  );
  }
);
