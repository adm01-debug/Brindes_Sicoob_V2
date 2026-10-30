import { useState, type MouseEvent } from "react";
import { Plus, Check, ShoppingCart, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSellerCartContext } from "@/contexts/SellerCartContext";
import { CartCompanyPicker } from "@/components/cart/CartCompanyPicker";
import { SingleVariantPicker } from "@/components/products/SingleVariantPicker";
import type { ExternalVariantStock } from "@/hooks/useExternalVariantStock";

interface QuickAddToQuoteProps {
  productId: string;
  productName: string;
  productSku?: string;
  productImageUrl?: string;
  productPrice?: number;
  minQuantity?: number;
  className?: string;
  variant?: "icon" | "button" | "badge";
  labelOverride?: string;
  iconOverride?: "cart" | "plus";
  buttonSize?: "default" | "sm" | "lg" | "xl" | "icon";
  triggerTestId?: string;
}

function QuickAddTrigger({ variant, className, buttonSize, iconOverride, labelOverride, triggerTestId }: Pick<QuickAddToQuoteProps, 'variant' | 'className' | 'buttonSize' | 'iconOverride' | 'labelOverride' | 'triggerTestId'>) {
  const stopPropagation = (event: MouseEvent) => event.stopPropagation();
  if (variant === 'badge') return <PopoverTrigger asChild><Badge data-testid={triggerTestId} variant="outline" className={cn("px-2.5 py-1 text-sm font-medium cursor-pointer border-sicoob-green/50 bg-sicoob-green/10 hover:bg-sicoob-green/20 text-sicoob-green-dark hover:text-sicoob-green transition-all duration-200 hover:scale-105 hover:border-sicoob-green", className)} onClick={stopPropagation}><ShoppingCart className="h-3.5 w-3.5 mr-1.5" /><span className="text-xs">Orçar</span></Badge></PopoverTrigger>;
  if (variant === 'icon') return <PopoverTrigger asChild><Button data-testid={triggerTestId} variant="secondary" size="icon" aria-label="ShoppingCart" className={cn("h-10 w-10 rounded-full bg-card/95 backdrop-blur-md shadow-lg border border-border/50 hover:bg-sicoob-green hover:text-white hover:scale-110 transition-all duration-200", className)} onClick={stopPropagation}><ShoppingCart className="h-4 w-4" /></Button></PopoverTrigger>;
  return <PopoverTrigger asChild><Button data-testid={triggerTestId} size={buttonSize} className={cn("bg-sicoob-green hover:bg-sicoob-green/90 text-white", className)} onClick={stopPropagation}>{iconOverride === "cart" ? <ShoppingBag className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{labelOverride || "Orçar"}</Button></PopoverTrigger>;
}

function SelectedVariantSummary({ variant, onChange }: { variant: ExternalVariantStock | null; onChange: () => void }) {
  if (!variant) return null;
  let preview = null;
  if (variant.selected_thumbnail) preview = <img src={`${variant.selected_thumbnail}/thumbnail`} alt={variant.color_name ?? ''} className="w-7 h-7 rounded-md object-cover border border-border/50" />;
  else if (variant.color_hex) preview = <div className="w-7 h-7 rounded-md border border-border/50" style={{ backgroundColor: variant.color_hex }} />;
  return <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/50">{preview}<span className="text-xs font-medium flex-1 truncate">{variant.color_name}{variant.size_code && ` — ${variant.size_code}`}</span><button onClick={onChange} className="text-[10px] text-primary hover:underline shrink-0">Trocar</button></div>;
}

function QuantityControl({ quantity, minimum, onChange }: { quantity: number; minimum: number; onChange: (quantity: number) => void }) {
  const parseQuantity = (value: string) => onChange(Math.max(minimum, parseInt(value) || minimum));
  return <div className="space-y-2"><label className="text-sm text-muted-foreground">Quantidade</label><div className="flex items-center gap-2"><Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onChange(Math.max(minimum, quantity - 10))} aria-label="Diminuir quantidade">-</Button><Input type="number" min={minimum} value={quantity} onChange={event => parseQuantity(event.target.value)} className="h-8 text-center" /><Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onChange(quantity + 10)} aria-label="Aumentar quantidade">+</Button></div><p className="text-xs text-muted-foreground">Mínimo: {minimum} un.</p></div>;
}

function AddToQuoteStep({ productName, activeCartName, variant, quantity, minimum, isAdded, onVariantChange, onQuantityChange, onAdd }: { productName: string; activeCartName?: string; variant: ExternalVariantStock | null; quantity: number; minimum: number; isAdded: boolean; onVariantChange: () => void; onQuantityChange: (quantity: number) => void; onAdd: () => void }) {
  return <div className="space-y-3"><div><h4 className="font-medium text-sm mb-1 pr-6">Adicionar ao orçamento</h4><p className="text-xs text-muted-foreground line-clamp-1">{productName}</p>{activeCartName && <p className="text-[10px] text-primary mt-1 font-medium truncate">→ {activeCartName}</p>}</div><SelectedVariantSummary variant={variant} onChange={onVariantChange} /><QuantityControl quantity={quantity} minimum={minimum} onChange={onQuantityChange} /><Button data-testid="product-card-add-to-cart" className="w-full gap-2 bg-sicoob-green hover:bg-sicoob-green/90 text-white" onClick={onAdd} disabled={isAdded || !activeCartName}>{isAdded ? <><Check className="h-4 w-4" />Adicionado!</> : <><ShoppingCart className="h-4 w-4" />Adicionar ao orçamento</>}</Button></div>;
}

function QuickAddStep({ variantChosen, needsCompanyPicker, productId, productName, activeCartName, selectedVariant, quantity, minimum, isAdded, onVariantSelect, onClose, onQuantityChange, onAdd }: { variantChosen: boolean; needsCompanyPicker: boolean; productId: string; productName: string; activeCartName?: string; selectedVariant: ExternalVariantStock | null | undefined; quantity: number; minimum: number; isAdded: boolean; onVariantSelect: (variant: ExternalVariantStock | null | undefined) => void; onClose: () => void; onQuantityChange: (quantity: number) => void; onAdd: () => void }) {
  if (!variantChosen) return <div className="space-y-3"><div><h4 className="font-medium text-sm mb-1 pr-6">Escolha a cor</h4><p className="text-xs text-muted-foreground line-clamp-1">{productName}</p></div><SingleVariantPicker productId={productId} onSelect={onVariantSelect} compact /></div>;
  if (needsCompanyPicker) return <CartCompanyPicker onCreated={() => undefined} onCancel={onClose} />;
  return <AddToQuoteStep productName={productName} activeCartName={activeCartName} variant={selectedVariant ?? null} quantity={quantity} minimum={minimum} isAdded={isAdded} onVariantChange={() => onVariantSelect(undefined)} onQuantityChange={onQuantityChange} onAdd={onAdd} />;
}

export function QuickAddToQuote(props: QuickAddToQuoteProps) {
  const { productId, productName, productSku, productImageUrl, productPrice = 0, minQuantity = 1, className, variant = "button", labelOverride, iconOverride, buttonSize, triggerTestId } = props;
  const [quantity, setQuantity] = useState(minQuantity);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ExternalVariantStock | null | undefined>(undefined);
  const { activeCart, addToActiveCart } = useSellerCartContext();
  const handleAddToQuote = () => {
    addToActiveCart({ product_id: productId, product_name: productName, product_sku: productSku, product_image_url: selectedVariant?.selected_thumbnail || productImageUrl, product_price: productPrice, quantity, color_name: selectedVariant?.color_name || undefined, color_hex: selectedVariant?.color_hex || undefined });
    setIsAdded(true);
    setTimeout(() => { setIsAdded(false); setIsOpen(false); setQuantity(minQuantity); setSelectedVariant(undefined); }, 1200);
  };
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) requestAnimationFrame(() => setSelectedVariant(undefined));
  };
  const variantChosen = selectedVariant !== undefined;
  const needsCompanyPicker = variantChosen && !activeCart;
  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <QuickAddTrigger variant={variant} className={className} buttonSize={buttonSize} iconOverride={iconOverride} labelOverride={labelOverride} triggerTestId={triggerTestId} />
      <PopoverContent className="relative w-[min(20rem,calc(100vw-1rem))] p-4" align="end" onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
        <button aria-label="Fechar" className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors z-10" onClick={() => setIsOpen(false)}><X className="h-3.5 w-3.5" /></button>
        <QuickAddStep variantChosen={variantChosen} needsCompanyPicker={needsCompanyPicker} productId={productId} productName={productName} activeCartName={activeCart?.company_name} selectedVariant={selectedVariant} quantity={quantity} minimum={minQuantity} isAdded={isAdded} onVariantSelect={setSelectedVariant} onClose={() => setIsOpen(false)} onQuantityChange={setQuantity} onAdd={handleAddToQuote} />
      </PopoverContent>
    </Popover>
  );
}
