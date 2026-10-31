/**
 * Mini-cards comparing velocity/stock across suppliers.
 */
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Package } from "lucide-react";
import type { StockVelocity } from "@/hooks/useStockHistory";


interface SupplierComparisonCardsProps {
  velocities: StockVelocity[];
  supplierNames: Map<string, string>;
}

const SUPPLIER_COLORS = [
  'border-l-primary',
  'border-l-destructive',
  'border-l-emerald-500',
  'border-l-amber-500',
  'border-l-violet-500',
  'border-l-cyan-500',
];

function TrendValue({ trend }: { trend: number }) {
  const trendClass = trend > 1 ? "text-primary" : trend < 0.8 ? "text-destructive" : "text-muted-foreground";
  let icon = <Minus className="h-2.5 w-2.5" />;
  if (trend > 1) icon = <TrendingUp className="h-2.5 w-2.5" />;
  else if (trend < 0.8) icon = <TrendingDown className="h-2.5 w-2.5" />;
  return <p className={cn("font-bold flex items-center gap-0.5", trendClass)}>{icon}{((trend - 1) * 100).toFixed(0)}%</p>;
}

function StockoutWarning({ days }: { days: number | null | undefined }) {
  if (days === null || days === undefined || days >= 30) return null;
  return (
    <p className={cn("text-[9px] flex items-center gap-1", days < 7 ? "text-destructive" : "text-warning")}>
      <Package className="h-2.5 w-2.5" />{days < 7 ? "⚠️" : "⏳"} Esgota em ~{days}d
    </p>
  );
}

interface SupplierCardProps {
  velocity: StockVelocity;
  name: string;
  isBest: boolean;
  colorClass: string | undefined;
}

function SupplierCard({ velocity, name, isBest, colorClass }: SupplierCardProps) {
  return (
    <div className={cn("flex flex-col gap-1 p-2 rounded-md bg-muted/40 border-l-2", colorClass)}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-medium truncate max-w-[120px]" title={name}>{name}</span>
        {isBest && <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/30">Maior saída</Badge>}
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        <div><p className="text-muted-foreground">Saída/dia</p><p className="font-bold text-foreground">{velocity.avg_daily_depletion_7d.toFixed(1)}</p></div>
        <div><p className="text-muted-foreground">Estoque</p><p className="font-bold text-foreground">{velocity.current_stock.toLocaleString("pt-BR")}</p></div>
        <div><p className="text-muted-foreground">Tendência</p><TrendValue trend={velocity.velocity_trend} /></div>
      </div>
      <StockoutWarning days={velocity.days_to_stockout} />
    </div>
  );
}

export function SupplierComparisonCards({ velocities, supplierNames }: SupplierComparisonCardsProps) {
  if (velocities.length <= 1) return null;

  // Sort by velocity desc
  const sorted = [...velocities].sort(
    (a, b) => b.avg_daily_depletion_7d - a.avg_daily_depletion_7d
  );

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        Comparativo por Fornecedor
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {sorted.map((velocity, index) => <SupplierCard
          key={velocity.variant_supplier_source_id || velocity.supplier_id}
          velocity={velocity}
          name={supplierNames.get(velocity.supplier_id) ?? `Fornecedor ${velocity.supplier_id.slice(0, 6)}`}
          isBest={index === 0 && sorted.length > 1}
          colorClass={SUPPLIER_COLORS[index % SUPPLIER_COLORS.length]}
        />)}
      </div>
    </div>
  );
}
