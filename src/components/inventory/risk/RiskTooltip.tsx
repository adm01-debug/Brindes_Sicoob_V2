import { forwardRef } from "react";
import { Badge } from "@/components/ui/badge";
import { safeNumber } from "@/lib/stock-chart-utils";
import { cn } from "@/lib/utils";

interface RiskTooltipDatum {
  fullDate: string;
  stockClose: number | null;
  depleted: number | null;
  restocked: number | null;
  restockDetected: boolean;
}

interface RiskTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: RiskTooltipDatum }>;
}

function isPositive(value: number | null | undefined): value is number {
  return typeof value === "number" && value > 0;
}

function StockValue({ value }: { value: number | null }) {
  return <>{value === null ? "—" : value.toLocaleString("pt-BR")}</>;
}

function RiskMovement({ type, value }: { type: "depleted" | "restocked"; value: number | null }) {
  if (!isPositive(value)) return null;
  const isDepleted = type === "depleted";
  const label = isDepleted ? "Saída:" : "Reposição:";
  const prefix = isDepleted ? "-" : "+";
  const colorClass = isDepleted ? "text-destructive" : "text-primary";

  return (
    <div className="flex justify-between text-[10px]">
      <span className={colorClass}>{label}</span>
      <span className={cn("font-semibold", colorClass)}>{prefix}{value}</span>
    </div>
  );
}

// #11 fix: shows fallback when zero-activity day
// forwardRef required because Recharts passes refs to custom tooltip components
export const RiskTooltip = forwardRef<HTMLDivElement, RiskTooltipProps>(function RiskTooltip({ active, payload }, ref) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const depleted = safeNumber(data.depleted);
  const restocked = safeNumber(data.restocked);
  const hasActivity = isPositive(depleted) || isPositive(restocked);

  return (
    <div ref={ref} className="bg-popover border border-border rounded-lg p-2.5 shadow-lg min-w-[150px]">
      <p className="text-[10px] font-medium text-foreground">{data.fullDate}</p>
      <div className="mt-1.5 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Estoque:</span>
          <span className="font-semibold"><StockValue value={data.stockClose} /></span>
        </div>
        {!hasActivity && (
          <p className="text-[9px] text-muted-foreground italic">Sem movimentação</p>
        )}
        <RiskMovement type="depleted" value={depleted} />
        <RiskMovement type="restocked" value={restocked} />
        {data.restockDetected && (
          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/30">
            🔄 Reabastecimento
          </Badge>
        )}
      </div>
    </div>
  );
});
