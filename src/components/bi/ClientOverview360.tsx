/**
 * ClientOverview360 — KPIs (LTV, ticket médio, última compra) com toggle "Trimestre atual vs anterior".
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  TrendingUp, DollarSign, Calendar, Sparkles,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { useClientBI } from "@/hooks/bi/useClientBI";
import { KPIsSkeleton } from "@/components/bi/BISkeletons";
import { cn } from "@/lib/utils";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

interface Props {
  clientId: string;
}

function DeltaPill({ pct }: { pct: number }) {
  const positive = pct >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  const cls = positive ? "text-success bg-success/10" : "text-destructive bg-destructive/10";
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold", cls)}>
      <Icon className="h-3 w-3" />
      {Math.abs(Math.round(pct))}%
    </span>
  );
}

type ClientBI = ReturnType<typeof useClientBI>;

function getRecency(days: number | null | undefined) {
  if (days === null || days === undefined) return { tone: "secondary" as const, label: "Nunca comprou" };
  const label = days === 0 ? "Hoje" : `${days}d atrás`;
  if (days < 30) return { tone: "default" as const, label };
  if (days < 90) return { tone: "secondary" as const, label };
  return { tone: "destructive" as const, label };
}

function OverviewControls({ bi, comparePeriod, setComparePeriod }: { bi: ClientBI; comparePeriod: boolean; setComparePeriod: (value: boolean) => void }) {
  return <div className="flex items-center justify-between gap-3 flex-wrap">{bi.isMock ? <Badge variant="secondary" className="gap-1 text-[10px]"><Sparkles className="h-3 w-3" /> Dados simulados · em breve dados reais</Badge> : <span />}<label className="flex items-center gap-2 cursor-pointer text-xs"><Switch checked={comparePeriod} onCheckedChange={setComparePeriod} aria-label="Comparar período" /><span className="font-medium text-foreground">{comparePeriod ? "90d atual vs 90d anteriores" : "Histórico total"}</span></label></div>;
}

function RevenueCard({ bi, comparePeriod }: { bi: ClientBI; comparePeriod: boolean }) {
  const value = comparePeriod ? bi.current90d.ltv : bi.ltv;
  const showDelta = comparePeriod && bi.delta.hasPreviousData;
  const detail = comparePeriod ? `vs ${fmtBRL(bi.previous90d.ltv)} no período anterior` : `${bi.ordersCount} pedido${bi.ordersCount !== 1 ? "s" : ""} no histórico`;
  return <Card className="border-[1.5px] hover:shadow-md transition-shadow"><CardContent className="p-5"><div className="flex items-center justify-between mb-2"><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{comparePeriod ? "Receita 90d" : "LTV Total"}</span><DollarSign className="h-4 w-4 text-primary" /></div><div className="flex items-baseline gap-2"><div className="font-display text-3xl font-bold">{fmtBRL(value)}</div>{showDelta && <DeltaPill pct={bi.delta.ltvDeltaPct} />}</div><div className="text-xs text-muted-foreground mt-1">{detail}</div></CardContent></Card>;
}

function TicketCard({ bi, comparePeriod }: { bi: ClientBI; comparePeriod: boolean }) {
  const value = comparePeriod ? bi.current90d.avgTicket : bi.avgTicket;
  const showDelta = comparePeriod && bi.delta.hasPreviousData;
  const detail = comparePeriod ? `vs ${fmtBRL(bi.previous90d.avgTicket)} antes` : "por pedido fechado";
  return <Card className="border-[1.5px] hover:shadow-md transition-shadow"><CardContent className="p-5"><div className="flex items-center justify-between mb-2"><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ticket Médio{comparePeriod && " · 90d"}</span><TrendingUp className="h-4 w-4 text-primary" /></div><div className="flex items-baseline gap-2"><div className="font-display text-3xl font-bold">{fmtBRL(value)}</div>{showDelta && <DeltaPill pct={bi.delta.avgTicketDeltaPct} />}</div><div className="text-xs text-muted-foreground mt-1">{detail}</div></CardContent></Card>;
}

function OrdersCard({ bi, comparePeriod }: { bi: ClientBI; comparePeriod: boolean }) {
  const recency = getRecency(bi.daysSinceLastOrder);
  const showDelta = comparePeriod && bi.delta.hasPreviousData;
  return <Card className="border-[1.5px] hover:shadow-md transition-shadow"><CardContent className="p-5"><div className="flex items-center justify-between mb-2"><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{comparePeriod ? "Pedidos 90d" : "Última Compra"}</span><Calendar className="h-4 w-4 text-primary" /></div>{comparePeriod ? <><div className="flex items-baseline gap-2"><div className="font-display text-3xl font-bold">{bi.current90d.ordersCount}</div>{showDelta && <DeltaPill pct={bi.delta.ordersCountDeltaPct} />}</div><div className="text-xs text-muted-foreground mt-1">vs {bi.previous90d.ordersCount} no período anterior</div></> : <><div className="font-display text-2xl font-bold">{bi.lastOrderDate ? fmtDate(bi.lastOrderDate) : "—"}</div><Badge variant={recency.tone} className="mt-2">{recency.label}</Badge></>}</CardContent></Card>;
}

export function ClientOverview360({ clientId }: Props) {
  const bi = useClientBI(clientId);
  const [comparePeriod, setComparePeriod] = useState(false);

  if (bi.isLoading) return <KPIsSkeleton />;
  return (
    <div className="space-y-3">
      <OverviewControls bi={bi} comparePeriod={comparePeriod} setComparePeriod={setComparePeriod} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><RevenueCard bi={bi} comparePeriod={comparePeriod} /><TicketCard bi={bi} comparePeriod={comparePeriod} /><OrdersCard bi={bi} comparePeriod={comparePeriod} /></div>
    </div>
  );
}
