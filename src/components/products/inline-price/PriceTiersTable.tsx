import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceTableRow {
  quantity: number;
  unitPrice: number;
  total: number;
  discount?: number;
}

interface PriceTiersTableProps {
  tiers: PriceTableRow[];
  isLoading: boolean;
  compact?: boolean;
  formatPrice: (price: number) => string;
}

const COMPACT_CELL = "py-2.5";
const DEFAULT_CELL = "py-3";
const DEFAULT_TEXT_CELL = "py-3 font-medium text-sm";
const TEXT_RIGHT = "text-right";

function MinimumBadge({ compact }: { compact: boolean }) {
  return compact ? <span className="text-[9px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">Mín</span> : <Badge variant="outline" className="ml-2 text-xs">Mínimo</Badge>;
}

function Discount({ discount, compact }: { discount?: number; compact: boolean }) {
  if (!discount) return <span className="text-muted-foreground/40">—</span>;
  return compact ? <span className="text-xs font-bold text-success">-{discount}%</span> : <Badge variant="secondary" className="bg-success/10 text-success border-success/20">-{discount}%</Badge>;
}

function TierRow({ tier, index, compact, formatPrice }: { tier: PriceTableRow; index: number; compact: boolean; formatPrice: (price: number) => string }) {
  const spacing = compact ? COMPACT_CELL : DEFAULT_CELL;
  return <tr className={cn("border-t border-border/30 transition-colors", index === 0 && "bg-primary/5", index > 0 && "hover:bg-muted/20")}><td className={cn("px-4 font-medium text-foreground", spacing)}><div className="flex items-center gap-1.5">{tier.quantity.toLocaleString('pt-BR')} un{index === 0 && <MinimumBadge compact={compact} />}</div></td><td className={cn("px-4 text-right font-bold text-foreground", compact ? COMPACT_CELL : "py-3 font-semibold")}>{formatPrice(tier.unitPrice)}</td><td className={cn("px-4 text-right text-muted-foreground", compact ? COMPACT_CELL : "py-3 hidden sm:table-cell")}>{formatPrice(tier.total)}</td><td className={cn("px-4 text-right", spacing)}><Discount discount={tier.discount} compact={compact} /></td></tr>;
}

function TableHeader({ compact }: { compact: boolean }) {
  const headingClass = "px-4 font-semibold text-muted-foreground uppercase tracking-wider";
  const spacing = compact ? "py-2.5 text-[11px]" : DEFAULT_TEXT_CELL;
  return <thead className={compact ? undefined : "bg-muted/50"}><tr className={compact ? "bg-muted/30 border-b border-border/40" : undefined}><th className={cn(headingClass, "text-left", spacing)}>{compact ? "Qtd." : "Quantidade"}</th><th className={cn(headingClass, TEXT_RIGHT, spacing)}>Preço/un</th><th className={cn(headingClass, TEXT_RIGHT, compact ? spacing : "py-3 font-medium text-sm hidden sm:table-cell")}>Total</th><th className={cn(headingClass, TEXT_RIGHT, spacing)}>{compact ? "Desc." : "Desconto"}</th></tr></thead>;
}

export function PriceTiersTable({ tiers, isLoading, compact = false, formatPrice }: PriceTiersTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className={cn("animate-spin text-primary", compact ? "h-5 w-5" : "h-6 w-6")} />
        <span className="ml-2 text-sm text-muted-foreground">Carregando preços...</span>
      </div>
    );
  }

  if (tiers.length === 0) {
    return (
      <div className={cn("text-center text-muted-foreground", compact ? "py-8 text-sm" : "py-8")}>
        Nenhuma tabela de preços disponível
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <TableHeader compact={compact} />
      <tbody>
        {tiers.map((tier, index) => <TierRow key={`tier-${index}-${tier.quantity}`} tier={tier} index={index} compact={compact} formatPrice={formatPrice} />)}
      </tbody>
    </table>
  );
}
