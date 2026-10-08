/**
 * MarginInsightBadge — badge inline com a margem do orçamento atual vs mediana histórica do vendedor.
 * Verde se acima da mediana; âmbar se abaixo. Usa quote_items históricos do vendedor.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface MarginInsightBadgeProps {
  /** Margem (ou desconto) aparente do orçamento atual em %. */
  currentMarginPercent: number;
  /** Quando informado e > 0, o componente entra em "modo dual": exibe aparente vs real. */
  realMarginPercent?: number;
  /** Markup de negociação aplicado, em %. Quando > 0 ativa o modo dual. */
  markupPercent?: number;
  className?: string;
}

async function fetchMedianMargin(userId: string): Promise<number | null> {
  const { data, error } = await supabase.from("quotes").select("subtotal, total, discount_amount").eq("seller_id", userId).in("status", ["converted", "approved"]).order("created_at", { ascending: false }).limit(50);
  if (error || !data?.length) return null;
  const margins = data.map(quote => {
    const subtotal = Number(quote.subtotal ?? 0);
    if (subtotal <= 0) return null;
    return ((Number(quote.total ?? 0) / subtotal) - 1) * 100 + 100;
  }).filter((margin): margin is number => margin !== null).sort((first, second) => first - second);
  return margins.length ? margins[Math.floor(margins.length / 2)] ?? null : null;
}

function DualMarginBadge({ current, real, markup, className }: { current: number; real: number; markup: number; className?: string }) {
  return (
    <TooltipProvider><Tooltip><TooltipTrigger asChild>
      <Badge variant="outline" className={`gap-1.5 bg-warning/10 text-warning border-warning/30 ${className ?? ""}`}><Info className="h-3 w-3" /><span className="text-[11px] font-medium">Aparente {current.toFixed(1)}% · Real {real.toFixed(1)}%</span></Badge>
    </TooltipTrigger><TooltipContent side="top" className="text-xs max-w-xs"><p className="font-medium mb-1">Margem de negociação ativa</p><p className="text-muted-foreground">Markup interno: <strong>+{markup.toFixed(1)}%</strong><br />Cliente vê desconto de <strong>{current.toFixed(1)}%</strong><br />Desconto real (alçada): <strong>{real.toFixed(2)}%</strong></p></TooltipContent></Tooltip></TooltipProvider>
  );
}

function HistoricalMarginBadge({ current, median, className }: { current: number; median: number; className?: string }) {
  const delta = current - median;
  const isAbove = delta >= 0;
  const TrendIcon = isAbove ? TrendingUp : TrendingDown;
  const badgeClass = isAbove ? "bg-success/10 text-success border-success/30" : "bg-warning/10 text-warning border-warning/30";
  return (
    <TooltipProvider><Tooltip><TooltipTrigger asChild>
      <Badge variant="outline" className={`gap-1.5 ${badgeClass} ${className ?? ""}`}><TrendIcon className="h-3 w-3" /><span className="text-[11px] font-medium">{isAbove ? "+" : ""}{delta.toFixed(1)}pp vs mediana</span><Info className="h-2.5 w-2.5 opacity-60" /></Badge>
    </TooltipTrigger><TooltipContent side="top" className="text-xs max-w-xs"><p className="font-medium mb-1">Insight de margem</p><p className="text-muted-foreground">Sua mediana histórica: <strong>{median.toFixed(1)}%</strong><br />Este orçamento: <strong>{current.toFixed(1)}%</strong></p></TooltipContent></Tooltip></TooltipProvider>
  );
}

function getDualMargin(real: number | null | undefined, markup: number | undefined): { real: number; markup: number } | null {
  if (real === null || real === undefined || markup === undefined || markup <= 0) return null;
  return { real, markup };
}

function useMedianMargin(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["seller-margin-median", userId], enabled: Boolean(userId) && enabled,
    queryFn: () => userId ? fetchMedianMargin(userId) : Promise.resolve(null), staleTime: 1000 * 60 * 10,
  }).data;
}

export function MarginInsightBadge({
  currentMarginPercent,
  realMarginPercent,
  markupPercent,
  className,
}: MarginInsightBadgeProps) {
  const { user } = useAuth();
  const dualMargin = getDualMargin(realMarginPercent, markupPercent);
  const median = useMedianMargin(user?.id, !dualMargin);
  if (dualMargin) return <DualMarginBadge current={currentMarginPercent} real={dualMargin.real} markup={dualMargin.markup} className={className} />;
  if (typeof median !== "number") return null;
  return <HistoricalMarginBadge current={currentMarginPercent} median={median} className={className} />;
}
