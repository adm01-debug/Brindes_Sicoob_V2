import { TrendingDown, TrendingUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  /** Diferença % entre preço atual e price_at_save (negativo = queda). */
  priceDiffPct: number | null;
  priceAtSave: number | null;
  currentPrice: number | null | undefined;
  savedAt?: string;
  /** Threshold em % a partir do qual o badge aparece (default 2). */
  threshold?: number;
  size?: "sm" | "md";
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function PriceMovement({ isDrop, label, size }: { isDrop: boolean; label: string; size: "sm" | "md" }) {
  const Icon = isDrop ? TrendingDown : TrendingUp;
  const sizeClass = size === "sm" ? "text-[10px]" : "text-xs";
  const colorClass = isDrop
    ? "bg-success/15 text-success border-success/30"
    : "bg-muted/80 text-muted-foreground border-border";
  const ariaLabel = isDrop ? `Preço caiu ${label}` : `Preço subiu ${label}`;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold tabular-nums backdrop-blur-sm border shadow-sm",
        sizeClass,
        colorClass,
      )}
      aria-label={ariaLabel}
    >
      <Icon className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      <span>{label}</span>
    </div>
  );
}

function SavedPriceDetails({
  priceAtSave,
  currentPrice,
  savedAtLabel,
}: {
  priceAtSave: number;
  currentPrice: number | null | undefined;
  savedAtLabel: string | null;
}) {
  return (
    <div className="space-y-0.5">
      <div>
        Salvo a <strong>{fmt(priceAtSave)}</strong>
        {savedAtLabel && <> em {savedAtLabel}</>}
      </div>
      {currentPrice ? <div>Hoje: <strong>{fmt(currentPrice)}</strong></div> : null}
    </div>
  );
}

export function PriceDropBadge({
  priceDiffPct, priceAtSave, currentPrice, savedAt, threshold = 2, size = "sm",
}: Props) {
  if (priceDiffPct === null || priceAtSave === null) return null;
  if (Math.abs(priceDiffPct) < threshold) return null;

  const isDrop = priceDiffPct < 0;
  const label = `${isDrop ? "−" : "+"}${Math.abs(priceDiffPct).toFixed(0)}%`;

  const savedAtLabel = savedAt
    ? new Date(savedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PriceMovement isDrop={isDrop} label={label} size={size} />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <SavedPriceDetails priceAtSave={priceAtSave} currentPrice={currentPrice} savedAtLabel={savedAtLabel} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
