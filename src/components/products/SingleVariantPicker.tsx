/**
 * SingleVariantPicker — Seletor inline de cor/variante para um único produto.
 * Reutilizável em Popovers, Modais e fluxos individuais.
 */
import { useMemo, useEffect, type MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { Package, AlertTriangle, SkipForward } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

import { useExternalVariantStock, type ExternalVariantStock } from '@/hooks/useExternalVariantStock';

interface SingleVariantPickerProps {
  productId: string;
  onSelect: (variant: ExternalVariantStock | null) => void;
  compact?: boolean;
  className?: string;
}

function formatVariantQuantity(quantity: number) {
  return quantity >= 1000 ? `${(quantity / 1000).toFixed(1)}k` : quantity.toString();
}

function VariantImage({ variant }: { variant: ExternalVariantStock }) {
  if (!variant.selected_thumbnail) {
    return (
      <div
        className="w-8 h-8 rounded-md border border-border/50 shrink-0 group-hover:scale-105 transition-transform"
        style={{ backgroundColor: variant.color_hex || "#CCC" }}
      />
    );
  }

  return (
    <img
      src={`${variant.selected_thumbnail}/thumbnail`}
      alt={variant.color_name ?? ""}
      className="w-8 h-8 rounded-md object-cover border border-border/50 shrink-0 group-hover:scale-105 transition-transform"
      onError={(event) => {
        const image = event.currentTarget;
        if (image.src.includes("/thumbnail")) image.src = variant.selected_thumbnail ?? "";
        else image.style.display = "none";
      }}
    />
  );
}

function VariantStock({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span className="text-[9px] text-destructive flex items-center gap-0.5">
        <AlertTriangle className="h-2 w-2" /> Sem estoque
      </span>
    );
  }

  return (
    <span className={cn("text-[9px] font-medium flex items-center gap-0.5", stock < 100 ? "text-warning" : "text-success")}>
      <Package className="h-2 w-2" /> {formatVariantQuantity(stock)} un
    </span>
  );
}

function VariantButton({
  variant,
  onSelect,
}: {
  variant: ExternalVariantStock;
  onSelect: (variant: ExternalVariantStock | null) => void;
}) {
  const stock = variant.stock_quantity ?? 0;
  const isOutOfStock = stock === 0;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelect(variant);
      }}
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg border transition-all text-left group",
        "hover:border-primary/50 hover:bg-accent/60 hover:shadow-sm",
        isOutOfStock ? "opacity-50 border-border/40 bg-muted/20" : "border-border/60 bg-card",
      )}
    >
      <VariantImage variant={variant} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium truncate leading-tight">
          {variant.color_name || "Sem nome"}
          {variant.size_code && <span className="text-muted-foreground ml-1">— {variant.size_code}</span>}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <VariantStock stock={stock} />
        </div>
      </div>
    </button>
  );
}

function VariantLoading({ className }: { className?: string }) {
  return <div className={cn('space-y-2', className)}><p className="text-xs font-medium text-muted-foreground">Carregando variações...</p><div className="grid grid-cols-2 gap-1.5">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-lg" />)}</div></div>;
}

function SkipVariantButton({ onSelect }: Pick<SingleVariantPickerProps, 'onSelect'>) {
  const skip = (event: MouseEvent) => { event.preventDefault(); event.stopPropagation(); onSelect(null); };
  return (
    <button type="button" data-testid="variant-picker-no-variant" onClick={skip} className="w-full flex items-center gap-2 p-2 rounded-lg border border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all text-left text-xs text-muted-foreground group">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-destructive/70 via-success/70 to-info/70 border border-border/50 shrink-0 group-hover:scale-110 transition-transform" /><span className="flex-1">Sem cor específica</span><SkipForward className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export function SingleVariantPicker({ productId, onSelect, compact, className }: SingleVariantPickerProps) {
  const { data: variants, isLoading } = useExternalVariantStock(productId);

  const sortedVariants = useMemo(() => {
    if (!variants) return [];
    return [...variants].sort((a, b) => {
      const aStock = a.stock_quantity ?? 0;
      const bStock = b.stock_quantity ?? 0;
      if (aStock > 0 && bStock === 0) return -1;
      if (aStock === 0 && bStock > 0) return 1;
      return (a.color_name ?? '').localeCompare(b.color_name ?? '');
    });
  }, [variants]);

  // Auto-skip when no variants — use requestAnimationFrame to let dialog mount first
  useEffect(() => {
    if (!isLoading && variants !== undefined && sortedVariants.length === 0) {
      const raf = requestAnimationFrame(() => onSelect(null));
      return () => cancelAnimationFrame(raf);
    }
  }, [isLoading, onSelect, sortedVariants.length, variants]);

  if (isLoading) return <VariantLoading className={className} />;

  if (!sortedVariants.length) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-medium text-muted-foreground">Escolha a cor/variação</p>

      <SkipVariantButton onSelect={onSelect} />

      {/* Variant grid */}
      <div className={cn(
        'grid gap-1.5 overflow-y-auto pr-0.5 scrollbar-thin',
        compact ? 'grid-cols-1 max-h-36' : 'grid-cols-2 max-h-48',
      )}>
        {sortedVariants.map((variant) => (
          <VariantButton key={variant.id} variant={variant} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
