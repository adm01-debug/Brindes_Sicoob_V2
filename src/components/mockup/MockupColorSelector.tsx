/**
 * ProductLoaderAndColorSelector — extracted from MockupProductSelector
 */
import { useMemo } from "react";
import { ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useProduct, type Product } from "@/hooks/useProducts";
import { useExternalVariantStock, type ExternalVariantStock } from "@/hooks/useExternalVariantStock";

interface Props {
  productId: string;
  onSelect: (variant: ExternalVariantStock | null, product: Product) => void;
  onBack: () => void;
}

function formatStock(quantity: number) {
  return quantity >= 1000 ? `${(quantity / 1000).toFixed(1)}k` : quantity.toString();
}

function compareVariants(a: ExternalVariantStock, b: ExternalVariantStock) {
  const aStock = a.stock_quantity ?? 0;
  const bStock = b.stock_quantity ?? 0;
  if (aStock > 0 && bStock === 0) return -1;
  if (aStock === 0 && bStock > 0) return 1;
  return (a.color_name ?? '').localeCompare(b.color_name ?? '');
}

function LoadingProduct({ onBack }: { onBack: () => void }) {
  return (
    <div className="border border-border/30 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2"><Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button><div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando detalhes...</div></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-lg" />)}</div>
    </div>
  );
}

function ProductNotFound({ onBack }: { onBack: () => void }) {
  return <div className="border border-border/30 rounded-lg p-4 space-y-4"><div className="flex items-center gap-2"><Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button></div><div className="text-center py-6 text-muted-foreground"><AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>Produto não encontrado</p></div></div>;
}

function firstImage(sources: Array<string | null | undefined>) {
  return sources.find((source): source is string => Boolean(source)) || '/placeholder.svg';
}

function VariantImage({ variant, product, outOfStock }: { variant: ExternalVariantStock; product: Product; outOfStock: boolean }) {
  const thumbnail = firstImage([variant.selected_thumbnail, variant.images?.[0], product.images?.[0]]);
  return (
    <div className="w-full aspect-square rounded-md bg-muted overflow-hidden relative">
      <img src={thumbnail} alt={variant.color_name || 'Variante'} className="w-full h-full object-cover" loading="lazy" onError={(event) => { event.currentTarget.src = '/placeholder.svg'; }} />
      {outOfStock && <div className="absolute inset-0 bg-background/60 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-destructive" /></div>}
    </div>
  );
}

function VariantColor({ variant }: { variant: ExternalVariantStock }) {
  return <div className="w-full flex items-center gap-1.5">{variant.color_hex && <div className="w-3 h-3 rounded-full border border-border/50 shrink-0" style={{ backgroundColor: variant.color_hex }} />}<span className="text-[11px] font-medium truncate">{variant.color_name || 'Sem cor'}</span></div>;
}

function VariantStock({ variant, outOfStock }: { variant: ExternalVariantStock; outOfStock: boolean }) {
  if (outOfStock) return <span className="text-[10px] text-destructive">△ Sem estoque</span>;
  return <span className="text-[10px] text-primary">⊕ {formatStock(variant.stock_quantity ?? 0)} un</span>;
}

function VariantOption({ variant, product, onSelect }: { variant: ExternalVariantStock; product: Product; onSelect: Props["onSelect"] }) {
  const outOfStock = (variant.stock_quantity ?? 0) === 0;
  return (
    <button key={variant.id} onClick={() => onSelect(variant, product)} className={cn("group relative flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all duration-200 text-left", outOfStock ? "border-border/20 opacity-60 hover:opacity-80" : "border-border/30 hover:border-primary/40 hover:bg-accent/40")}>
      <VariantImage variant={variant} product={product} outOfStock={outOfStock} />
      <VariantColor variant={variant} />
      <div className="w-full"><VariantStock variant={variant} outOfStock={outOfStock} /></div>
    </button>
  );
}

export function ProductLoaderAndColorSelector({ productId, onSelect, onBack }: Props) {
  const { data: fullProduct, isLoading: isLoadingProduct } = useProduct(productId);
  const { data: variants, isLoading: isLoadingVariants } = useExternalVariantStock(productId);

  const sortedVariants = useMemo(() => {
    if (!variants) return [];
    return [...variants].sort(compareVariants);
  }, [variants]);

  const totalStock = useMemo(() => sortedVariants.reduce((sum, v) => sum + (v.stock_quantity ?? 0), 0), [sortedVariants]);

  if (isLoadingProduct || isLoadingVariants) {
    return <LoadingProduct onBack={onBack} />;
  }

  if (!fullProduct) {
    return <ProductNotFound onBack={onBack} />;
  }

  if (!variants || variants.length === 0) {
    setTimeout(() => onSelect(null, fullProduct), 0);
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border/30 bg-card animate-pulse">
        <Skeleton className="w-11 h-11 rounded-lg" /><Skeleton className="h-4 w-40" />
      </div>
    );
  }

  return (
    <div className="border border-border/30 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">{fullProduct.name}</h4>
          <p className="text-[11px] text-muted-foreground">{sortedVariants.length} cores · Estoque total: {formatStock(totalStock)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
        {sortedVariants.map((variant) => <VariantOption key={variant.id} variant={variant} product={fullProduct} onSelect={onSelect} />)}
      </div>
    </div>
  );
}
