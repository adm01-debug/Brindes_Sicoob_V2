/**
 * OtherSuppliersRow — linha expansível mostrando alternativas de outros fornecedores.
 * Usa useSupplierComparison existente.
 */
import { useState } from "react";
import { ChevronDown, Building2, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupplierComparison } from "@/hooks/useSupplierComparison";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/hooks/useProducts";

interface Props {
  product: Product;
  formatCurrency: (v: number) => string;
  onAddToCompare?: (productId: string) => void;
}

type SupplierAlternative = NonNullable<ReturnType<typeof useSupplierComparison>>["alternatives"][number];

function SupplierAlternativeRow({ alternative, formatCurrency, onAddToCompare }: {
  alternative: SupplierAlternative;
  formatCurrency: (value: number) => string;
  onAddToCompare?: (productId: string) => void;
}) {
  const { product, priceDiff, priceDiffPercent } = alternative;
  return <div className="flex items-center justify-between gap-2 text-xs">
    <div className="min-w-0 flex-1"><p className="font-medium truncate">{product.supplier?.name}</p>
      <p className="text-muted-foreground truncate">{product.name}</p>
    </div>
    <div className="text-right shrink-0"><p className="font-bold text-primary tabular-nums">{formatCurrency(product.price)}</p>
      {priceDiff < 0 && <Badge className="text-[9px] gap-0.5 bg-success/15 text-success border-success/30 hover:bg-success/20">
        <TrendingDown className="h-2.5 w-2.5" /> {priceDiffPercent.toFixed(1)}%
      </Badge>}
    </div>
    {onAddToCompare && <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]"
      onClick={() => onAddToCompare(product.id)}>+ Comparar</Button>}
  </div>;
}

export function OtherSuppliersRow({ product, formatCurrency, onAddToCompare }: Props) {
  const [open, setOpen] = useState(false);
  const result = useSupplierComparison(open ? product : null);

  return (
    <div className="rounded-lg border border-border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium hover:bg-muted/40 transition-colors"
      >
        <span className="inline-flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" />
          Outros fornecedores deste produto
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="p-3 border-t border-border space-y-2">
          {!result && (
            <p className="text-[11px] text-muted-foreground text-center py-2">
              Buscando alternativas...
            </p>
          )}
          {result && result.alternatives.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-2">
              Nenhum fornecedor alternativo encontrado.
            </p>
          )}
          {result?.alternatives.slice(0, 3).map((alternative) => <SupplierAlternativeRow key={alternative.product.id}
            alternative={alternative} formatCurrency={formatCurrency} onAddToCompare={onAddToCompare} />)}
        </div>
      )}
    </div>
  );
}
