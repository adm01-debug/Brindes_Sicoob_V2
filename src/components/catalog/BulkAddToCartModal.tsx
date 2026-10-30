/**
 * BulkAddToCartModal — Modal para adicionar múltiplos produtos ao carrinho.
 * Aceita seleções de variantes do BulkVariantWizard.
 */
import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, ShoppingBag, Loader2 } from "lucide-react";
import { useSellerCartContext } from "@/contexts/SellerCartContext";
import { CartCompanyPicker } from "@/components/cart/CartCompanyPicker";
import { toast } from "sonner";
import type { Product } from "@/hooks/useProducts";
import type { BulkVariantSelection } from "./BulkVariantWizard";

interface BulkAddToCartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  variantSelections?: BulkVariantSelection[];
  onDone?: () => void;
}

function getItems(products: Product[], selections?: BulkVariantSelection[]): BulkVariantSelection[] {
  return selections?.length ? selections : products.map((product) => ({ product, variant: null }));
}

function toCartItem(item: BulkVariantSelection) {
  const { product, variant } = item;
  return {
    product_id: product.id,
    product_name: product.name,
    product_sku: product.sku || undefined,
    product_image_url: variant?.selected_thumbnail || product.images?.[0] || undefined,
    product_price: product.price,
    quantity: 1,
    color_name: variant?.color_name || undefined,
    color_hex: variant?.color_hex || undefined,
  };
}

function plural(count: number, singular: string, pluralValue: string) {
  return count > 1 ? pluralValue : singular;
}

function VariantSummary({ selections }: { selections?: BulkVariantSelection[] }) {
  if (!selections?.some((selection) => selection.variant)) return null;
  return <div className="space-y-1 max-h-32 overflow-y-auto">{selections.map((selection, index) => <div key={`${selection.product.id}-${index}`} className="flex items-center gap-2 text-xs text-muted-foreground"><span className="truncate flex-1">{selection.product.name}</span>{selection.variant ? <span className="text-foreground font-medium shrink-0">{selection.variant.color_name}{selection.variant.size_code && ` — ${selection.variant.size_code}`}</span> : <span className="text-muted-foreground/60 shrink-0">Sem cor</span>}</div>)}</div>;
}

function SubmitButton({ adding, done, onClick }: { adding: boolean; done: boolean; onClick: () => void }) {
  let content = <><ShoppingBag className="h-4 w-4" />Adicionar ao Carrinho</>;
  if (adding) content = <><Loader2 className="h-4 w-4 animate-spin" />Adicionando...</>;
  if (done) content = <><Check className="h-4 w-4" />Adicionado!</>;
  return <Button className="w-full gap-2" onClick={onClick} disabled={adding || done}>{content}</Button>;
}

interface CartContentProps {
  companyName: string;
  count: number;
  selections?: BulkVariantSelection[];
  adding: boolean;
  done: boolean;
  onAdd: () => void;
}

function CartContent(props: CartContentProps) {
  return <div className="space-y-4 py-2"><div className="rounded-lg bg-muted/40 border border-border/50 p-3"><p className="text-xs text-muted-foreground mb-1">Carrinho ativo</p><p className="text-sm font-medium">{props.companyName}</p></div><VariantSummary selections={props.selections} /><div className="text-sm text-muted-foreground">{props.count} produto{plural(props.count, "", "s")} será{plural(props.count, "", "ão")} adicionado{plural(props.count, "", "s")} com quantidade 1.</div><SubmitButton adding={props.adding} done={props.done} onClick={props.onAdd} /></div>;
}

function useBulkAdd({ open, onOpenChange, products, variantSelections, onDone }: BulkAddToCartModalProps) {
  const { activeCart, addToActiveCart } = useSellerCartContext();
  const [adding, setAdding] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) { setAdding(false); setDone(false); }
  }, [open]);

  const handleAdd = useCallback(async () => {
    if (!activeCart) return;
    const items = getItems(products, variantSelections);
    if (items.length === 0) return;
    setAdding(true);
    try {
      items.forEach((item) => addToActiveCart(toCartItem(item)));
      setDone(true);
      toast.success(`${items.length} produto${plural(items.length, "", "s")} adicionado${plural(items.length, "", "s")} ao carrinho`, {
        description: activeCart.company_name,
      });
      setTimeout(() => {
        onOpenChange(false);
        onDone?.();
      }, 1000);
    } catch {
      toast.error("Erro ao adicionar produtos ao carrinho");
    } finally {
      setAdding(false);
    }
  }, [activeCart, products, variantSelections, addToActiveCart, onOpenChange, onDone]);
  return { activeCart, adding, done, handleAdd };
}

export function BulkAddToCartModal(props: BulkAddToCartModalProps) {
  const { open, onOpenChange, products, variantSelections } = props;
  const { activeCart, adding, done, handleAdd } = useBulkAdd(props);
  const count = variantSelections?.length || products.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4 text-cart" />
            Adicionar {count} produto{plural(count, "", "s")} ao carrinho
          </DialogTitle>
        </DialogHeader>

        {!activeCart ? (
          <CartCompanyPicker
            onCreated={() => {}}
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <CartContent companyName={activeCart.company_name} count={count} selections={variantSelections} adding={adding} done={done} onAdd={handleAdd} />
        )}
      </DialogContent>
    </Dialog>
  );
}
