/**
 * EnrichedOrdersTimeline — substitui "Últimos pedidos" simples.
 * Vertical timeline com dots conectados, sparkline de evolução de ticket,
 * status semântico (aprovado/pendente/recusado quando disponível) e tendência inline.
 */
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, TrendingUp, TrendingDown, Minus, AlertTriangle, Layers } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LineChart, Line, ResponsiveContainer, Tooltip as RTooltip } from "recharts";
import { cn } from "@/lib/utils";
import { useClientBI } from "@/hooks/bi/useClientBI";
import { resolveBICategory } from "@/lib/bi/categoryResolver";

interface Props {
  clientId: string;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

type RecentOrder = ReturnType<typeof useClientBI>["recentOrders"][number];

function OrderCategoryBadge({ order }: { order: RecentOrder }) {
  const category = resolveBICategory(order.productPreview ?? "");
  if (category.slug === "outros" && !order.productPreview) return null;
  return <Badge variant="outline" className="text-[9px] h-4 gap-0.5 border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300" title={`Categoria dominante: ${category.label}`}><Layers className="h-2.5 w-2.5" />{category.label}</Badge>;
}

function AnomalyBadge({ order }: { order: RecentOrder }) {
  if (!order.isAnomaly) return null;
  const direction = order.deviation > 0 ? "acima" : "abaixo";
  const sign = order.deviation > 0 ? "+" : "";
  const guidance = Math.abs(order.deviation) > 3 ? "Desvio extremo — vale investigar contexto." : "Vale entender o que motivou.";
  return <TooltipProvider delayDuration={150}><Tooltip><TooltipTrigger asChild><Badge variant="outline" className="text-[9px] h-4 gap-0.5 border-0 bg-warning/15 text-warning cursor-help"><AlertTriangle className="h-2.5 w-2.5" />Atípico</Badge></TooltipTrigger><TooltipContent side="top" className="max-w-[220px] text-xs">Pedido {direction} do padrão histórico ({sign}{order.deviation}σ). {guidance}</TooltipContent></Tooltip></TooltipProvider>;
}

function orderDelta(current: RecentOrder, previous: RecentOrder | undefined) {
  if (!previous || previous.total <= 0) return null;
  return ((current.total - previous.total) / previous.total) * 100;
}

function deltaClass(delta: number | null) {
  if (delta === null || Math.abs(delta) <= 5) return "text-muted-foreground";
  return delta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
}

function OrderTimelineItem({ order, previous, index, last }: { order: RecentOrder; previous: RecentOrder | undefined; index: number; last: boolean }) {
  const delta = orderDelta(order, previous);
  const showDelta = delta !== null && Math.abs(delta) > 5;
  return <div className={cn("relative pb-4", last ? "pb-0" : undefined)}><div className={cn("absolute -left-[18px] top-1.5 h-3 w-3 rounded-full ring-4 ring-background", index === 0 ? "bg-primary" : "bg-muted-foreground/40")} /><div className="flex items-baseline justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="font-medium text-sm">{order.id}</span><OrderCategoryBadge order={order} />{index === 0 ? <Badge variant="outline" className="text-[9px] h-4 border-primary/30 text-primary">Mais recente</Badge> : null}<AnomalyBadge order={order} /></div><div className="text-xs text-muted-foreground truncate">{order.productPreview}</div></div><div className="text-right shrink-0"><div className="font-semibold text-sm tabular-nums">{fmtBRL(order.total)}</div><div className="flex items-center gap-1.5 justify-end"><span className="text-xs text-muted-foreground">{fmtDate(order.date)}</span>{showDelta ? <span className={cn("text-[10px] font-medium tabular-nums", deltaClass(delta))}>{delta > 0 ? "+" : ""}{Math.round(delta)}%</span> : null}</div></div></div></div>;
}

export function EnrichedOrdersTimeline({ clientId }: Props) {
  const bi = useClientBI(clientId);

  const sparkData = useMemo(() => {
    return [...bi.recentOrders]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((o) => ({ name: o.id, value: o.total }));
  }, [bi.recentOrders]);

  const trend = useMemo(() => {
    if (sparkData.length < 2) return "stable" as const;
    const first = sparkData[0]?.value ?? 0;
    const last = sparkData[sparkData.length - 1]?.value ?? first;
    const delta = ((last - first) / first) * 100;
    if (delta > 15) return "up" as const;
    if (delta < -15) return "down" as const;
    return "stable" as const;
  }, [sparkData]);

  if (bi.isLoading) {
    return (
      <Card className="border-[1.5px]">
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (bi.recentOrders.length === 0) {
    return null;
  }

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendStyles =
    trend === "up"
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
      : trend === "down"
        ? "text-red-600 dark:text-red-400 bg-red-500/10"
        : "text-muted-foreground bg-muted";

  return (
    <Card className="border-[1.5px]">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm">Linha do tempo de pedidos</h3>
              <p className="text-xs text-muted-foreground">
                Últimos {bi.recentOrders.length} fechamentos · evolução de ticket
              </p>
            </div>
          </div>
          <Badge variant="outline" className={cn("gap-1 border-0 text-[10px]", trendStyles)}>
            <TrendIcon className="h-3 w-3" />
            {trend === "up" ? "Em ascensão" : trend === "down" ? "Em queda" : "Estável"}
          </Badge>
        </div>

        {/* Sparkline */}
        {sparkData.length >= 2 && (
          <div className="h-16 mb-4 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 5 }}
                />
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [fmtBRL(v), "Total"]}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Timeline vertical */}
        <div className="relative pl-6">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-border to-transparent" />
          {bi.recentOrders.map((order, index) => <OrderTimelineItem key={order.id} order={order} previous={bi.recentOrders[index + 1]} index={index} last={index === bi.recentOrders.length - 1} />)}
        </div>
      </CardContent>
    </Card>
  );
}
