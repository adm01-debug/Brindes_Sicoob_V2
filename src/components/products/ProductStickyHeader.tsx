import { type ComponentProps, useState, useEffect } from "react";
import { type NavigateFunction, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickAddToQuote } from "./QuickAddToQuote";
import { BulkVariantWizard } from "@/components/catalog/BulkVariantWizard";
import { PriceFreshnessBadge } from "./PriceFreshnessBadge";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";

interface ProductStickyHeaderProps {
  productId: string;
  productName: string;
  productSku: string;
  productPrice: number;
  productImage: string;
  minQuantity: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  product?: Product;
}

type QuoteSelections = Parameters<NonNullable<ComponentProps<typeof BulkVariantWizard>["onComplete"]>>[0];

function addVariantParams(params: URLSearchParams, variant: QuoteSelections[number]["variant"]) {
  if (variant?.color_name) params.set("color_name", variant.color_name);
  if (variant?.color_hex) params.set("color_hex", variant.color_hex);
  if (variant?.size_code) params.set("size_code", variant.size_code);
}

function openQuoteFromSelection(navigate: NavigateFunction, props: ProductStickyHeaderProps, selections: QuoteSelections) {
  const variant = selections[0]?.variant;
  const params = new URLSearchParams({
    product_id: props.productId,
    product_name: props.productName,
    product_sku: props.productSku || "",
    product_price: String(props.productPrice),
    product_image: variant?.selected_thumbnail || props.productImage || "",
    min_quantity: String(props.minQuantity),
  });
  addVariantParams(params, variant ?? null);
  navigate(`/orcamentos/novo?${params.toString()}`);
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
}

function StickyBar({ props, onQuote }: { props: ProductStickyHeaderProps; onQuote: () => void }) {
  const { productId, productName, productSku, productPrice, productImage, minQuantity, isFavorite, onToggleFavorite, product } = props;
  return (
    <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="fixed top-0 left-0 right-0 z-50 hidden md:block bg-background/95 backdrop-blur-md border-b border-border shadow-sm" style={{ top: "var(--header-h, 56px)" }}>
      <div className="max-w-7xl mx-auto px-4 lg:px-6 h-12 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border"><img src={productImage} alt={productName} className="w-full h-full object-contain" loading="lazy" /></div>
        <h2 className="font-display text-sm font-semibold text-foreground truncate max-w-[300px] lg:max-w-[500px]">{productName}</h2>
        <span className="text-sm font-bold text-foreground whitespace-nowrap ml-auto flex items-center gap-2">
          {formatPrice(productPrice)}<span className="text-muted-foreground font-normal">/un</span>
          <PriceFreshnessBadge priceUpdatedAt={product?.priceUpdatedAt} thresholdDays={product?.priceFreshnessThresholdDays} variant="compact" />
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onToggleFavorite} data-testid="product-favorite" aria-pressed={isFavorite} aria-label="Favoritar"><Heart className={cn("h-4 w-4", isFavorite && "fill-destructive text-destructive")} /></Button>
          <QuickAddToQuote productId={productId} productName={productName} productSku={productSku} productPrice={productPrice} minQuantity={minQuantity} variant="button" buttonSize="sm" labelOverride="Carrinho" iconOverride="cart" className="h-9 rounded-full px-5 bg-cart hover:bg-cart-hover text-cart-foreground font-medium text-sm" />
          <Button size="sm" className="h-9 rounded-full px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm gap-1.5" onClick={onQuote}><FileText className="h-3.5 w-3.5" />Orçamento</Button>
        </div>
      </div>
    </motion.div>
  );
}

export function ProductStickyHeader({
  productId,
  productName,
  productSku,
  productPrice,
  productImage,
  minQuantity,
  isFavorite,
  onToggleFavorite,
  product,
}: ProductStickyHeaderProps) {
  const [visible, setVisible] = useState(false);
  const [quoteWizardOpen, setQuoteWizardOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Build a minimal Product object for the wizard if not provided
  const wizardProduct: Product = product || ({ id: productId, name: productName, sku: productSku, price: productPrice,
    images: productImage ? [productImage] : [], minQuantity } as Product);

  return (
    <>
      <AnimatePresence>
        {visible && <StickyBar props={{ productId, productName, productSku, productPrice, productImage, minQuantity, isFavorite, onToggleFavorite, product }} onQuote={() => setQuoteWizardOpen(true)} />}
      </AnimatePresence>

      <BulkVariantWizard
        open={quoteWizardOpen}
        onOpenChange={setQuoteWizardOpen}
        products={[wizardProduct]}
        mode="quote"
        onComplete={(selections) => openQuoteFromSelection(navigate, {
          productId, productName, productSku, productPrice, productImage, minQuantity,
          isFavorite, onToggleFavorite, product,
        }, selections)}
      />
    </>
  );
}
