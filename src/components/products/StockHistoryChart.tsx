/** Inteligência de mercado na página de produto. */
import { ResponsiveContainer, Area, XAxis, YAxis, CartesianGrid, Tooltip, Bar, ComposedChart, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, DollarSign, TrendingDown, TrendingUp, Loader2, ShoppingCart, BarChart3, Star, Eye, EyeOff, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeNumber, COMMERCIAL_FLAG_CONFIG } from "@/lib/stock-chart-utils";
import { formatCurrency } from "@/lib/format";
import { KpiCard } from "@/components/ui/KpiCard";
import { SupplierChartFilter } from "./SupplierChartFilter";
import { SupplierComparisonCards } from "./SupplierComparisonCards";
import { useStockChartData } from "./useStockChartData";

interface StockHistoryChartProps { productId: string; productName?: string }
interface MarketChartDatum { fullDate: string; stockClose: number; depleted: number; restocked: number; restockDetected: boolean; costPriceClose: number | null }
interface MarketTooltipProps { active?: boolean; payload?: Array<{ payload: MarketChartDatum }>; showCost: boolean }
type StockChartModel = ReturnType<typeof useStockChartData>;

function LoadingCard() { return <Card><CardContent className="flex items-center justify-center py-8" role="status" aria-label="Carregando dados de mercado"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>; }
function ErrorCard({ retry }: { retry: () => void }) {
  return <Card><CardContent className="flex flex-col items-center justify-center py-8 gap-3 text-center"><AlertCircle className="h-6 w-6 text-destructive" /><p className="text-sm font-medium text-destructive">Não foi possível carregar dados de mercado</p><p className="text-xs text-muted-foreground">Tente novamente em alguns instantes</p><Button variant="outline" size="sm" onClick={retry} className="gap-1.5 mt-1"><RefreshCw className="h-3.5 w-3.5" />Tentar novamente</Button></CardContent></Card>;
}

function abcPresentation(classification: string) {
  if (classification === 'A') return { className: 'bg-orange/15 text-orange border-orange/30', label: '🔥 Best-Seller' };
  if (classification === 'B') return { className: 'bg-success/15 text-success border-success/30', label: '⚡ Popular' };
  return { className: 'bg-muted text-muted-foreground border-border', label: '📦 Normal' };
}

function HeaderBadges({ model }: { model: StockChartModel }) {
  const classification = model.effectiveIntelligence?.abc_classification;
  const abc = classification ? abcPresentation(classification) : null;
  const emerging = typeof model.trend === "number" && model.trend > 1.3;
  return <div className="flex items-center gap-2">{abc && <Badge variant="outline" className={cn("font-bold text-xs", abc.className)}>{abc.label}</Badge>}
    {emerging && <Badge variant="outline" className="font-bold text-xs bg-primary/15 text-primary border-primary/30">🚀 Emergente</Badge>}
    {model.showTurnover && <Badge variant="secondary" className="text-xs font-mono" title="Potencial comercial: quanto maior, mais o mercado compra">Potencial: {Math.round(model.turnoverScore ?? 0)}</Badge>}
  </div>;
}

function MarketFlags({ flags }: { flags: StockChartModel["flags"] }) {
  if (flags.length === 0) return null;
  return <div className="flex flex-wrap gap-1.5 mt-2" role="list" aria-label="Indicadores de mercado">{flags.map(flag => {
    const config = COMMERCIAL_FLAG_CONFIG[flag]; const Icon = config.icon;
    return <Badge key={flag} variant="outline" className={cn("gap-1 px-2 py-0.5 text-xs border", config.colors)} title={config.description} role="listitem"><Icon className="h-3 w-3" aria-hidden="true" />{config.label}</Badge>;
  })}</div>;
}

function ChartHeader({ model }: { model: StockChartModel }) {
  return <CardHeader className="pb-3"><div className="flex items-center justify-between flex-wrap gap-2"><div><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" aria-hidden="true" />Inteligência de Mercado</CardTitle>
    <CardDescription className="mt-1">Como o mercado está comprando este produto · {model.days} dias{model.hasError && model.hasData && <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/30">dados parciais</Badge>}</CardDescription></div><HeaderBadges model={model} /></div>
    <MarketFlags flags={model.flags} />
  </CardHeader>;
}

function trendIcon(trend: number | null | undefined) {
  if (typeof trend !== "number") return BarChart3;
  if (trend > 1.2) return TrendingUp;
  if (trend < 0.8) return TrendingDown;
  return BarChart3;
}
function trendSub(trend: number | null | undefined) {
  if (typeof trend !== "number") return '';
  if (trend > 1) return '↑ crescendo';
  if (trend < 0.8) return '↓ caindo';
  return '→ estável';
}

function MarketKpis({ model }: { model: StockChartModel }) {
  const velocity = safeNumber(model.bestVelocity?.avg_daily_depletion_7d);
  const velocityValue = velocity?.toFixed(1) ?? '—';
  const trendHighlight = typeof model.trend === "number" && model.trend > 1.3;
  const stock = model.effectiveIntelligence?.total_current_stock;
  return <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label="Métricas de inteligência de mercado">
    <KpiCard icon={ShoppingCart} label="Vendas no mercado" value={velocityValue} sub="un/dia (média 7d)" highlight={model.marketDemandLevel === 'very-high' || model.marketDemandLevel === 'high'} ariaLabel={`Vendas no mercado: ${velocityValue} unidades por dia`} />
    <KpiCard icon={BarChart3} label="Demanda" value={model.demandLabel[model.marketDemandLevel].text} sub={trendSub(model.trend)} highlight={model.marketDemandLevel === 'very-high'} customValueColor={model.demandLabel[model.marketDemandLevel].color} ariaLabel={`Demanda: ${model.demandLabel[model.marketDemandLevel].text}`} />
    <KpiCard icon={trendIcon(model.trend)} label="Tendência" value={model.trendDisplay.value} sub={model.trendDisplay.sub} highlight={trendHighlight} ariaLabel={`Tendência: ${model.trendDisplay.value} ${model.trendDisplay.sub}`} />
    <KpiCard icon={Star} label="Disponível" value={stock?.toLocaleString('pt-BR') ?? '—'} sub={model.supplierText} ariaLabel={`Disponível: ${stock ?? 'indisponível'} unidades ${model.supplierText}`} />
  </div>;
}

function ChartControls({ model }: { model: StockChartModel }) {
  return <div className="flex items-center gap-3 flex-wrap"><Tabs value={model.period} onValueChange={model.setPeriod}><TabsList className="h-7 flex-wrap">{['15','30','60','90','120','180','360'].map(period => <TabsTrigger key={period} value={period} className="text-xs px-2 h-5">{period}d</TabsTrigger>)}</TabsList></Tabs>
    {model.supplierOptions.length > 1 && <SupplierChartFilter suppliers={model.supplierOptions} selected={model.selectedSupplier} onSelect={model.setSelectedSupplier} />}
  </div>;
}

function MarketChart({ model }: { model: StockChartModel }) {
  if (model.chartData.length === 0) return <div className="flex h-[160px] items-center justify-center rounded-lg border border-dashed border-border px-6 text-center sm:h-[200px]"><p className="text-sm text-muted-foreground">O histórico de estoque ainda não está disponível para este produto.</p></div>;
  return <div className="h-[160px] sm:h-[200px] w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={model.chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
    <CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="dateFormatted" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" /><YAxis yAxisId="stock" tick={{ fontSize: 10 }} className="fill-muted-foreground" width={50} /><YAxis yAxisId="flow" orientation="right" hide />
    <Tooltip content={<MarketTooltip showCost={model.showCost} />} /><Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} iconSize={8} formatter={(value: string) => <span className="text-muted-foreground text-[10px]">{value}</span>} />
    <Area yAxisId="stock" type="monotone" dataKey="stockClose" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name="Disponível" dot={false} activeDot={{ r: 4 }} />
    <Bar yAxisId="flow" dataKey="depleted" fill="hsl(var(--destructive) / 0.4)" name="Compras do mercado" radius={[2, 2, 0, 0]} barSize={4} /><Bar yAxisId="flow" dataKey="restocked" fill="hsl(142 71% 45% / 0.5)" name="Reposição" radius={[2, 2, 0, 0]} barSize={4} />
  </ComposedChart></ResponsiveContainer></div>;
}

function PriceInsight({ model }: { model: StockChartModel }) {
  return <div className="flex items-center justify-between flex-wrap gap-2">{model.priceChanges > 0 && <div className="flex items-center gap-2 text-xs text-muted-foreground"><DollarSign className="h-3 w-3" aria-hidden="true" /><span>Fornecedor alterou preço {model.priceChanges}x nos últimos 30 dias —<span className="text-foreground font-medium"> trave seu custo ao cotar</span></span></div>}
    <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-1 px-2 text-muted-foreground" onClick={() => model.setShowCost(!model.showCost)}>{model.showCost ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}{model.showCost ? 'Ocultar custo' : 'Ver custo'}</Button>
  </div>;
}

function StockChartReady({ model }: { model: StockChartModel }) {
  return <Card><ChartHeader model={model} /><CardContent className="space-y-4"><MarketKpis model={model} /><ChartControls model={model} /><MarketChart model={model} />
    {model.effectiveVelocities.length > 1 && model.supplierNamesMap && <SupplierComparisonCards velocities={model.effectiveVelocities} supplierNames={model.supplierNamesMap} />}
    <PriceInsight model={model} />
  </CardContent></Card>;
}

export function StockHistoryChart({ productId }: StockHistoryChartProps) {
  const model = useStockChartData(productId);
  if (model.loadingSummary) return <LoadingCard />;
  if (model.hasError && !model.hasData) return <ErrorCard retry={model.handleRetry} />;
  return <StockChartReady model={model} />;
}

function TooltipMetric({ visible, label, value, color = "text-muted-foreground" }: { visible: boolean; label: string; value: string; color?: string }) {
  if (!visible) return null;
  return <div className="flex justify-between text-xs"><span className={color}>{label}:</span><span className={cn("font-semibold", color)}>{value}</span></div>;
}

function marketMovement(data: MarketChartDatum) {
  const depleted = safeNumber(data.depleted);
  const restocked = safeNumber(data.restocked);
  return { depleted, restocked, hasDepletion: typeof depleted === "number" && depleted > 0,
    hasRestock: typeof restocked === "number" && restocked > 0 };
}

function TooltipActivity({ data }: { data: MarketChartDatum }) {
  const movement = marketMovement(data);
  return <>
    {!movement.hasDepletion && !movement.hasRestock && <p className="text-[10px] text-muted-foreground italic">Sem movimentação neste dia</p>}
    <TooltipMetric visible={movement.hasDepletion} label="Compras do mercado" value={`-${movement.depleted ?? 0}`} color="text-destructive" />
    <TooltipMetric visible={movement.hasRestock} label="Reposição" value={`+${movement.restocked ?? 0}`} color="text-primary" />
  </>;
}

function TooltipCost({ visible, cost }: { visible: boolean; cost: number | null }) {
  if (!visible || cost === null) return null;
  return <div className="flex justify-between text-xs pt-1 border-t border-border"><span className="text-muted-foreground">Custo base:</span><span className="font-semibold">{formatCurrency(cost)}</span></div>;
}

function MarketTooltip({ active, payload, showCost }: MarketTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-[180px]"><p className="text-xs font-medium text-foreground">{data.fullDate}</p><div className="mt-2 space-y-1.5">
    <TooltipMetric visible label="Disponível" value={`${data.stockClose?.toLocaleString('pt-BR') ?? '—'} un`} />
    <TooltipActivity data={data} />
    {data.restockDetected && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30">🔄 Fornecedor reabasteceu</Badge>}
    <TooltipCost visible={showCost} cost={data.costPriceClose} />
  </div></div>;
}
