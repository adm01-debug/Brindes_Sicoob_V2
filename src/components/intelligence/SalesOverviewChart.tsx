/**
 * SalesOverviewChart — Visão MACRO de vendas internas
 * Mostra orçamentos vs pedidos agregados de TODOS os vendedores.
 * Estilo igual ao SalesHistoryChart da página de produto.
 */
import { useMemo } from "react";
import {
  ResponsiveContainer,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Bar,
  ComposedChart,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart, FileText, DollarSign, Users, Target, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { KpiCard } from "@/components/ui/KpiCard";
import { useSalesHistoryMacro } from "@/hooks/useSalesHistoryMacro";
import type { DailySalesPoint } from "@/hooks/useSalesHistory";
import { safeParseDateForChart } from "@/lib/stock-chart-utils";

interface Props {
  days?: number;
  productId?: string | null;
}

type SalesMacroChartDatum = DailySalesPoint & { dateFormatted: string; fullDate: string };

interface SalesMacroTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SalesMacroChartDatum }>;
}

type SalesKpis = NonNullable<NonNullable<ReturnType<typeof useSalesHistoryMacro>["data"]>["kpis"]>;

function conversionClass(rate: number) {
  if (rate >= 40) return 'bg-primary/15 text-primary border-primary/30';
  if (rate >= 20) return 'bg-warning/15 text-warning border-warning/30';
  return 'bg-destructive/15 text-destructive border-destructive/30';
}

function ConversionBadge({ kpis }: { kpis: SalesKpis | undefined }) {
  if (!kpis || kpis.conversionRate <= 0) return null;
  return <Badge variant="outline" className={cn("font-bold text-xs", conversionClass(kpis.conversionRate))}><Target className="h-3 w-3 mr-1" />{kpis.conversionRate.toFixed(1)}% conversão</Badge>;
}

function SalesKpiGrid({ kpis }: { kpis: SalesKpis | undefined }) {
  const values = kpis ?? { totalQuotedQty: 0, totalQuotedValue: 0, totalOrderedQty: 0, totalOrderedValue: 0, avgOrderValue: 0, uniqueSellers: 0, conversionRate: 0 };
  const average = Number.isFinite(values.avgOrderValue) ? values.avgOrderValue : 0;
  return <div className="grid grid-cols-3 sm:grid-cols-6 gap-2"><KpiCard icon={FileText} label="Orçado (qtd)" value={values.totalQuotedQty.toLocaleString('pt-BR')} sub={formatCurrency(values.totalQuotedValue)} /><KpiCard icon={ShoppingCart} label="Vendido (qtd)" value={values.totalOrderedQty.toLocaleString('pt-BR')} sub={formatCurrency(values.totalOrderedValue)} highlight /><KpiCard icon={DollarSign} label="Ticket médio" value={formatCurrency(average)} sub="por pedido" /><KpiCard icon={Users} label="Vendedores" value={String(values.uniqueSellers)} sub="ativos" /><KpiCard icon={Target} label="Conversão" value={`${values.conversionRate.toFixed(1)}%`} sub="orç → ped" /><KpiCard icon={Package} label="Faturamento" value={formatCurrency(values.totalOrderedValue)} sub="total no período" highlight /></div>;
}

function SalesChart({ data }: { data: SalesMacroChartDatum[] }) {
  return <div className="h-[200px] w-full"><ResponsiveContainer width="100%" height="100%" debounce={50}><ComposedChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="dateFormatted" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" /><YAxis yAxisId="qty" tick={{ fontSize: 10 }} className="fill-muted-foreground" width={45} /><YAxis yAxisId="value" orientation="right" hide /><Tooltip content={<SalesMacroTooltip />} /><Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} iconSize={8} formatter={(value: string) => <span className="text-muted-foreground text-[10px]">{value}</span>} /><Bar yAxisId="qty" dataKey="quotedQty" fill="hsl(var(--primary) / 0.25)" name="Qtd Orçada" radius={[2, 2, 0, 0]} barSize={6} /><Bar yAxisId="qty" dataKey="orderedQty" fill="hsl(var(--primary))" name="Qtd Vendida" radius={[2, 2, 0, 0]} barSize={6} /><Area yAxisId="value" type="monotone" dataKey="orderedValue" stroke="hsl(var(--chart-2, 142 71% 45%))" fill="hsl(var(--chart-2, 142 71% 45%) / 0.1)" strokeWidth={1.5} name="Faturamento" dot={false} /></ComposedChart></ResponsiveContainer></div>;
}

function EmptySalesOverview() {
  return <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"><ShoppingCart className="h-3.5 w-3.5 text-primary-foreground" /></div>📊 Vendas Internas (Macro)</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground text-center py-6">Nenhum dado de vendas disponível. Os dados aparecerão quando houver orçamentos e pedidos.</p></CardContent></Card>;
}

export function SalesOverviewChart({ days = 30 }: Props) {
  const { data, isLoading } = useSalesHistoryMacro(days);

  const chartData = useMemo(() => {
    if (!data?.daily?.length) return [];
    return data.daily.reduce<Array<typeof data.daily[0] & { dateFormatted: string; fullDate: string }>>((acc, d) => {
      const parsed = safeParseDateForChart(d.date);
      if (parsed) acc.push({ ...d, ...parsed });
      return acc;
    }, []);
  }, [data]);
  
  // KPI section improvement: using memoization for derived statistics to prevent redundant recalculations
  const kpis = useMemo(() => data?.kpis, [data?.kpis]);
  const hasData = !!chartData.length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!hasData) return <EmptySalesOverview />;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <ShoppingCart className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              📊 Vendas Internas (Macro)
            </CardTitle>
            <CardDescription className="mt-1">
              Orçamentos vs Pedidos de toda a equipe · {days} dias
            </CardDescription>
          </div>
          <ConversionBadge kpis={kpis} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <SalesKpiGrid kpis={kpis} />
        <SalesChart data={chartData} />

      </CardContent>
    </Card>
  );
}


function SalesMacroTooltip({ active, payload }: SalesMacroTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const hasAny = (data.quotedQty > 0) || (data.orderedQty > 0);

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-[180px]">
      <p className="text-xs font-medium text-foreground">{data.fullDate}</p>
      <div className="mt-2 space-y-1.5">
        {!hasAny && <p className="text-xs text-muted-foreground italic">Sem movimentação</p>}
        {data.quotedQty > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Orçado:</span>
            <span className="font-semibold">{data.quotedQty} un · {formatCurrency(data.quotedValue)}</span>
          </div>
        )}
        {data.orderedQty > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-primary">Vendido:</span>
            <span className="font-semibold text-primary">{data.orderedQty} un · {formatCurrency(data.orderedValue)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
