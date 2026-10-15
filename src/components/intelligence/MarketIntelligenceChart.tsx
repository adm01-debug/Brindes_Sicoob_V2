/**
 * MarketIntelligenceChart — Visão MACRO de mercado
 * Replica o layout do StockHistoryChart (página de produto)
 * mas com dados agregados de todos os produtos.
 * Ausência de movimentação é apresentada como estado vazio explícito.
 */
import { useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Target,
  ShoppingCart,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/ui/KpiCard";
import { useMarketIntelligenceMacro, type MacroSupplierMetrics, type MacroMarketPoint, type MacroMarketKpis, type MacroMarketData } from "@/hooks/useMarketIntelligenceMacro";
import { useSupplierNames } from "@/hooks/useSupplierNames";
import { safeParseDateForChart } from "@/lib/stock-chart-utils";
import { SupplierChartFilter } from "@/components/products/SupplierChartFilter";

interface Props {
  days?: number;
  supplierId?: string | null;
  productId?: string | null;
}

type MarketMacroChartDatum = MacroMarketPoint & { dateFormatted: string; fullDate: string };
const PT_BR = "pt-BR";
const TEXT_DESTRUCTIVE = "text-destructive";
const SUPPLIER_COLORS = ['border-l-primary', 'border-l-destructive', 'border-l-emerald-500', 'border-l-amber-500', 'border-l-violet-500', 'border-l-cyan-500'];

interface MarketMacroTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MarketMacroChartDatum }>;
}

const EMPTY_MARKET_DATA: MacroMarketData = {
  daily: [],
  suppliers: [],
  supplierIds: [],
  kpis: {
    totalDepleted7d: 0,
    totalDepleted30d: 0,
    totalRestocked30d: 0,
    totalCurrentStock: 0,
    avgDailyDepletion: 0,
    supplierCount: 0,
    topDepletionDay: null,
  },
};

function buildChartData(daily: MacroMarketPoint[]): MarketMacroChartDatum[] {
  return daily.reduce<MarketMacroChartDatum[]>((result, point) => {
    const parsed = safeParseDateForChart(point.date);
    if (parsed) result.push({ ...point, ...parsed });
    return result;
  }, []);
}

function buildSupplierOptions(data: MacroMarketData, names?: Map<string, string> | null) {
  if (data.supplierIds.length <= 1) return [];
  return data.supplierIds.map(id => ({ id, name: names?.get(id) ?? `Fornecedor ${id.slice(0, 6)}` }));
}

function useMarketChartModel(defaultDays: number, supplierId?: string | null) {
  const [period, setPeriod] = useState<string>(String(defaultDays));
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const days = Number(period);
  const { data: realData, isLoading, error, refetch } = useMarketIntelligenceMacro(days, supplierId);
  const hasRealData = Boolean(realData?.daily?.length);
  const effectiveData = realData ?? EMPTY_MARKET_DATA;
  const { data: supplierNamesMap } = useSupplierNames(hasRealData ? effectiveData.supplierIds : []);
  const supplierOptions = useMemo(() => buildSupplierOptions(effectiveData, supplierNamesMap), [effectiveData, supplierNamesMap]);
  const chartData = useMemo(() => buildChartData(effectiveData.daily), [effectiveData.daily]);
  return { period, setPeriod, selectedSupplier, setSelectedSupplier, days, isLoading, error, hasRealData,
    effectiveData, supplierNamesMap, supplierOptions, chartData, refetch };
}

type MarketChartModel = ReturnType<typeof useMarketChartModel>;

function LoadingCard() {
  return <Card><CardContent className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>;
}

function ErrorCard({ model }: { model: MarketChartModel }) {
  return <Card><MarketHeader days={model.days} trendRatio={1} /><CardContent className="space-y-4"><ChartControls model={model} /><div className="flex flex-col items-center justify-center py-8 gap-2 text-center"><AlertCircle className="h-6 w-6 text-destructive" /><p className="text-sm text-destructive">Erro ao carregar dados de mercado</p><p className="text-xs text-muted-foreground">Verifique a conexão e tente novamente</p><Button variant="outline" size="sm" onClick={() => void model.refetch()}>Tentar novamente</Button></div></CardContent></Card>;
}

function EmptyCard({ model }: { model: MarketChartModel }) {
  return <Card><MarketHeader days={model.days} trendRatio={1} /><CardContent className="space-y-4"><ChartControls model={model} /><div className="flex flex-col items-center justify-center py-8 gap-2 text-center"><BarChart3 className="h-6 w-6 text-muted-foreground" /><p className="text-sm font-medium">Sem movimentações de mercado no período</p><p className="text-xs text-muted-foreground">Os indicadores aparecerão quando o catálogo registrar estoque e saídas reais.</p></div></CardContent></Card>;
}

function demandMetrics(average: number) {
  if (average >= 50) return { level: 'Muito Alta', color: TEXT_DESTRUCTIVE };
  if (average >= 20) return { level: 'Alta', color: 'text-warning' };
  if (average >= 5) return { level: 'Moderada', color: 'text-primary' };
  return { level: 'Baixa', color: 'text-muted-foreground' };
}

function trendMetrics(kpis: MacroMarketKpis, days: number) {
  const trend7d = kpis.totalDepleted7d / 7;
  const trend30d = kpis.totalDepleted30d / Math.max(days, 1);
  const ratio = trend30d > 0 ? trend7d / trend30d : 1;
  const percent = Math.round((ratio - 1) * 100);
  const label = ratio > 1.2 ? '↑ acelerando' : ratio < 0.8 ? '↓ desacelerando' : '→ estável';
  return { ratio, percent, label };
}

function MarketHeader({ days, trendRatio }: { days: number; trendRatio: number }) {
  return <CardHeader className="pb-3"><div className="flex items-center justify-between flex-wrap gap-2"><div><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" aria-hidden="true" />Inteligência de Mercado</CardTitle>
    <CardDescription className="mt-1">Como o mercado está comprando · visão macro · {days} dias</CardDescription></div>
    <div className="flex items-center gap-2">{trendRatio > 1.3 && <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 text-xs font-bold">🚀 Mercado Aquecido</Badge>}</div>
  </div></CardHeader>;
}

function TrendIcon({ ratio }: { ratio: number }) {
  if (ratio > 1.2) return TrendingUp;
  if (ratio < 0.8) return TrendingDown;
  return BarChart3;
}

function trendSubtext(ratio: number) {
  if (ratio > 1) return 'demanda crescente';
  if (ratio < 0.8) return 'demanda caindo';
  return 'demanda estável';
}

function supplierText(count: number) {
  if (count === 0) return 'no fornecedor';
  return `em ${count} fornecedor${count > 1 ? 'es' : ''}`;
}

function MarketKpis({ kpis, days }: { kpis: MacroMarketKpis; days: number }) {
  const average = kpis.avgDailyDepletion;
  const demand = demandMetrics(average);
  const trend = trendMetrics(kpis, days);
  return <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label="Métricas de inteligência de mercado">
    <KpiCard icon={ShoppingCart} label="Vendas no mercado" value={average.toFixed(1)} sub="un/dia (média 7d)" highlight={average >= 20} />
    <KpiCard icon={BarChart3} label="Demanda" value={demand.level} sub={trend.label} customValueColor={demand.color} />
    <KpiCard icon={TrendIcon({ ratio: trend.ratio })} label="Tendência" value={`${trend.percent >= 0 ? '+' : ''}${trend.percent}%`} sub={trendSubtext(trend.ratio)} highlight={trend.ratio > 1.3} />
    <KpiCard icon={Package} label="Disponível" value={kpis.totalCurrentStock.toLocaleString(PT_BR)} sub={supplierText(kpis.supplierCount)} />
  </div>;
}

function ChartControls({ model }: { model: MarketChartModel }) {
  return <div className="flex items-center gap-3 flex-wrap"><Tabs value={model.period} onValueChange={model.setPeriod}><TabsList className="h-7 flex-wrap">{['15', '30', '60', '90', '120', '180', '360'].map(period => <TabsTrigger key={period} value={period} className="text-xs px-2 h-5">{period}d</TabsTrigger>)}</TabsList></Tabs>
    {model.supplierOptions.length > 1 && <SupplierChartFilter suppliers={model.supplierOptions} selected={model.selectedSupplier} onSelect={model.setSelectedSupplier} />}
  </div>;
}

function MarketChartPlot({ data }: { data: MarketMacroChartDatum[] }) {
  if (data.length === 0) return <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Sem dados de mercado disponíveis para este período</div>;
  return <div className="h-[160px] sm:h-[200px] w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
    <CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="dateFormatted" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" /><YAxis yAxisId="stock" tick={{ fontSize: 10 }} className="fill-muted-foreground" width={50} /><YAxis yAxisId="flow" orientation="right" hide />
    <Tooltip content={<MarketMacroTooltip />} /><Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} iconSize={8} formatter={(value: string) => <span className="text-muted-foreground text-[10px]">{value}</span>} />
    <Area yAxisId="stock" type="monotone" dataKey="stockClose" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name="Disponível" dot={false} activeDot={{ r: 4 }} />
    <Bar yAxisId="flow" dataKey="depleted" fill="hsl(var(--destructive) / 0.4)" name="Compras do mercado" radius={[2, 2, 0, 0]} barSize={4} /><Bar yAxisId="flow" dataKey="restocked" fill="hsl(142 71% 45% / 0.5)" name="Reposição" radius={[2, 2, 0, 0]} barSize={4} />
  </ComposedChart></ResponsiveContainer></div>;
}

function MarketInsight({ kpis }: { kpis: MacroMarketKpis }) {
  if (!kpis.topDepletionDay) return null;
  const date = new Date(`${kpis.topDepletionDay.date}T00:00:00`).toLocaleDateString(PT_BR, { day: '2-digit', month: '2-digit' });
  return <p className="text-xs text-muted-foreground">📊 Pico de saídas: <span className="font-medium text-foreground">{kpis.topDepletionDay.value.toLocaleString(PT_BR)} un</span> em {date}</p>;
}

function MarketChartReady({ model }: { model: MarketChartModel }) {
  const trend = trendMetrics(model.effectiveData.kpis, model.days);
  return <Card><MarketHeader days={model.days} trendRatio={trend.ratio} /><CardContent className="space-y-4">
    <MarketKpis kpis={model.effectiveData.kpis} days={model.days} /><ChartControls model={model} /><MarketChartPlot data={model.chartData} />
    {model.effectiveData.suppliers.length > 1 && model.supplierNamesMap && <MacroSupplierComparison suppliers={model.effectiveData.suppliers} supplierNames={model.supplierNamesMap} />}
    <MarketInsight kpis={model.effectiveData.kpis} />
  </CardContent></Card>;
}

export function MarketIntelligenceChart({ days: defaultDays = 30, supplierId }: Props) {
  const model = useMarketChartModel(defaultDays, supplierId);

  if (model.isLoading) return <LoadingCard />;
  if (model.error && !model.hasRealData) return <ErrorCard model={model} />;
  if (!model.hasRealData) return <EmptyCard model={model} />;
  return <MarketChartReady model={model} />;
}

// ---------- Supplier Comparison (macro version) ----------

function SupplierTrend({ velocity }: { velocity: number }) {
  const color = velocity > 1 ? 'text-primary' : velocity < 0.8 ? TEXT_DESTRUCTIVE : 'text-muted-foreground';
  const icon = velocity > 1 ? <TrendingUp className="h-2.5 w-2.5" /> : velocity < 0.8 ? <TrendingDown className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />;
  return <div><p className="text-muted-foreground">Tendência</p><p className={cn("font-bold flex items-center gap-0.5", color)}>{icon}{((velocity - 1) * 100).toFixed(0)}%</p></div>;
}

function StockoutWarning({ days }: { days: number | null }) {
  if (days === null || days >= 30) return null;
  const critical = days < 7;
  return <p className={cn("text-[9px] flex items-center gap-1", critical ? TEXT_DESTRUCTIVE : 'text-warning')}><Package className="h-2.5 w-2.5" />{critical ? '⚠️' : '⏳'} Esgota em ~{days}d</p>;
}

function SupplierComparisonCard({ supplier, name, index, isBest }: { supplier: MacroSupplierMetrics; name: string; index: number; isBest: boolean }) {
  return <div className={cn("flex flex-col gap-1 p-2 rounded-md bg-muted/40 border-l-2", SUPPLIER_COLORS[index % SUPPLIER_COLORS.length])}>
    <div className="flex items-center justify-between gap-1"><span className="text-xs font-medium truncate max-w-[120px]" title={name}>{name}</span>
      {isBest && <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/30">Maior saída</Badge>}
    </div>
    <div className="grid grid-cols-3 gap-1.5 text-[10px]"><div><p className="text-muted-foreground">Saída/dia</p><p className="font-bold text-foreground">{supplier.avgDailyDepletion7d.toFixed(1)}</p></div>
      <div><p className="text-muted-foreground">Estoque</p><p className="font-bold text-foreground">{supplier.currentStock.toLocaleString(PT_BR)}</p></div><SupplierTrend velocity={supplier.velocityTrend} />
    </div><StockoutWarning days={supplier.daysToStockout} />
  </div>;
}

function MacroSupplierComparison({ suppliers, supplierNames }: { suppliers: MacroSupplierMetrics[]; supplierNames: Map<string, string> }) {
  const supplierName = (supplier: MacroSupplierMetrics) => supplierNames.get(supplier.supplierId) ?? `Fornecedor ${supplier.supplierId.slice(0, 6)}`;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        Comparativo por Fornecedor
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {suppliers.map((supplier, index) => <SupplierComparisonCard key={supplier.supplierId} supplier={supplier} name={supplierName(supplier)} index={index} isBest={index === 0 && suppliers.length > 1} />)}
      </div>
    </div>
  );
}

// ---------- Tooltip ----------

function TooltipMetric({ visible, label, value, color }: { visible: boolean; label: string; value: number; color: string }) {
  if (!visible) return null;
  return <div className="flex justify-between text-xs"><span className={color}>{label}:</span><span className={cn("font-semibold", color)}>{value.toLocaleString(PT_BR)} un</span></div>;
}

function TooltipMovements({ data }: { data: MarketMacroChartDatum }) {
  const hasMovement = data.depleted > 0 || data.restocked > 0;
  return <div className="mt-2 space-y-1.5"><TooltipMetric visible={data.stockClose > 0} label="Disponível" value={data.stockClose} color="text-muted-foreground" />
    <TooltipMetric visible={data.depleted > 0} label="Compras mercado" value={data.depleted} color={TEXT_DESTRUCTIVE} />
    <TooltipMetric visible={data.restocked > 0} label="Reposição" value={data.restocked} color="text-primary" />
    {!hasMovement && <p className="text-xs text-muted-foreground italic">Sem movimentação</p>}
  </div>;
}

function MarketMacroTooltip({ active, payload }: MarketMacroTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-[180px]">
      <p className="text-xs font-medium text-foreground">{data.fullDate}</p>
      <TooltipMovements data={data} />
    </div>
  );
}
