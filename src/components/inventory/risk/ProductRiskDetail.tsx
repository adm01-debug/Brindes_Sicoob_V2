/**
 * Detail panel for a single product's supplier risk analysis.
 * Extracted from SupplierRiskPanel for SRP compliance.
 */
import { useMemo, useState } from "react";
import { Maximize2, Minimize2, DollarSign, TrendingDown, TrendingUp, Loader2, Package, Clock, BarChart3, ExternalLink, AlertCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useStockDailySummary,
  useStockVelocity,
  useProductIntelligenceData,
  aggregateDailySummaryByDate,
  getActiveFlags,
  type IntelligenceFlag,
  type ProductIntelligenceData,
} from "@/hooks/useStockHistory";
import {
  safeVelocityTrend,
  safeNumber,
  formatVelocityTrendOperational,
  safeParseDateForChart,
  OPERATIONAL_FLAG_CONFIG,
  safePriceChanges,
} from "@/lib/stock-chart-utils";
import { RiskKpi } from "./RiskKpi";
import { RiskTooltip } from "./RiskTooltip";

interface ProductRiskDetailProps {
  productId: string;
  productName?: string;
  productSku?: string;
}

function buildRiskChartData(summaries: Parameters<typeof aggregateDailySummaryByDate>[0] | undefined, days: number) {
  if (!summaries?.length) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return aggregateDailySummaryByDate(summaries).filter(item => new Date(item.date) >= cutoff).reduce<Array<{ date: string; stockClose: number; depleted: number; restocked: number; restockDetected: boolean; costPriceClose: number | null; dateFormatted: string; fullDate: string }>>((result, item) => {
    const parsed = safeParseDateForChart(item.date);
    if (parsed) result.push({ ...item, ...parsed });
    return result;
  }, []);
}

function deriveFlags(intelligence: ProductIntelligenceData | null | undefined): IntelligenceFlag[] {
  return intelligence ? getActiveFlags(intelligence) : [];
}

function RiskLoading() {
  return <div className="flex items-center justify-center py-8" role="status" aria-label="Carregando detalhes do produto"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
}

function RiskError({ onRetry }: { onRetry: () => void }) {
  return <div className="flex flex-col items-center justify-center py-8 gap-2 text-center"><AlertCircle className="h-6 w-6 text-destructive" /><p className="text-sm font-medium text-destructive">Erro ao carregar dados</p><p className="text-xs text-muted-foreground max-w-[250px]">Não foi possível buscar o histórico deste produto. Tente novamente em alguns instantes.</p><Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5 mt-1"><RefreshCw className="h-3.5 w-3.5" />Tentar novamente</Button></div>;
}

function RiskEmpty({ productName }: { productName?: string }) {
  return <div className="flex flex-col items-center justify-center py-8 gap-2 text-center"><BarChart3 className="h-6 w-6 text-muted-foreground" /><p className="text-sm font-medium">Sem histórico operacional{productName ? ` para ${productName}` : ''}</p><p className="text-xs text-muted-foreground max-w-[280px]">As métricas de risco aparecerão quando houver movimentos reais de estoque para este produto.</p></div>;
}

function classificationClass(classification: string): string {
  if (classification === 'A') return 'bg-warning/15 text-warning border-warning/30';
  if (classification === 'B') return 'bg-primary/15 text-primary border-primary/30';
  return 'bg-muted text-muted-foreground border-border';
}

function RiskHeader({ name, productId, partial, classification, onNavigate }: { name?: string; productId: string; partial: boolean; classification?: string | null; onNavigate: () => void }) {
  return <div className="flex items-center justify-between flex-wrap gap-2"><div className="flex items-center gap-2 min-w-0"><h4 className="font-semibold text-sm truncate">{name || productId}</h4>{partial && <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 bg-destructive/10 text-destructive border-destructive/30">parcial</Badge>}{classification && <Badge variant="outline" className={cn("font-bold text-[10px] shrink-0", classificationClass(classification))}>Classe {classification}</Badge>}</div><Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 shrink-0" onClick={onNavigate}><ExternalLink className="h-3 w-3" />Ver produto</Button></div>;
}

function RiskFlags({ flags }: { flags: IntelligenceFlag[] }) {
  if (flags.length === 0) return null;
  return <div className="flex flex-wrap gap-1" role="list" aria-label="Indicadores de risco">{flags.map(flag => { const config = OPERATIONAL_FLAG_CONFIG[flag]; const Icon = config.icon; return <Badge key={flag} variant="outline" className={cn("gap-1 px-1.5 py-0 text-[10px] border", config.colors)} title={config.description} role="listitem"><Icon className="h-2.5 w-2.5" />{config.label}</Badge>; })}</div>;
}

interface RiskMetricsProps {
  depletion: string;
  daysToStockout: string;
  urgent: boolean;
  warning: boolean;
  currentStock: string;
  supplier: string;
  trend: number | null;
  trendValue: string;
  trendLabel: string;
}

function RiskMetrics({ depletion, daysToStockout, urgent, warning, currentStock, supplier, trend, trendValue, trendLabel }: RiskMetricsProps) {
  const TrendIcon = trend !== null && trend > 1.2 ? TrendingUp : trend !== null && trend < 0.8 ? TrendingDown : BarChart3;
  return <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label="Métricas de risco do produto"><RiskKpi icon={TrendingDown} label="Saída/dia (7d)" value={depletion} sub="unidades" /><RiskKpi icon={Clock} label="Dias até acabar" value={daysToStockout} sub={urgent ? 'URGENTE!' : warning ? 'atenção' : 'estimativa'} alert={urgent} warning={warning && !urgent} /><RiskKpi icon={Package} label="Estoque atual" value={currentStock} sub={supplier} /><RiskKpi icon={TrendIcon} label="Tendência" value={trendValue} sub={trendLabel} /></div>;
}

function RiskChart({ data, expanded }: { data: Array<{ dateFormatted: string; stockClose: number; depleted: number; restocked: number }>; expanded: boolean }) {
  const tickSize = expanded ? 10 : 9;
  return <div className={cn("w-full transition-all duration-300", expanded ? "h-[320px]" : "h-[140px] sm:h-[160px]")}><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="dateFormatted" tick={{ fontSize: tickSize }} className="fill-muted-foreground" interval="preserveStartEnd" /><YAxis yAxisId="stock" tick={{ fontSize: tickSize }} className="fill-muted-foreground" width={40} /><YAxis yAxisId="flow" orientation="right" hide /><Tooltip content={<RiskTooltip />} /><Legend wrapperStyle={{ fontSize: `${tickSize}px`, paddingTop: '2px' }} iconSize={expanded ? 8 : 6} formatter={(value: string) => <span className="text-muted-foreground text-[9px]">{value}</span>} /><Area yAxisId="stock" type="monotone" dataKey="stockClose" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={1.5} name="Estoque" dot={false} activeDot={{ r: 3 }} /><Bar yAxisId="flow" dataKey="depleted" fill="hsl(var(--destructive) / 0.4)" name="Saída" radius={[2, 2, 0, 0]} barSize={expanded ? 5 : 3} /><Bar yAxisId="flow" dataKey="restocked" fill="hsl(var(--primary) / 0.4)" name="Reposição" radius={[2, 2, 0, 0]} barSize={expanded ? 5 : 3} /></ComposedChart></ResponsiveContainer></div>;
}

function ChartControls({ period, expanded, onPeriodChange, onToggle }: { period: string; expanded: boolean; onPeriodChange: (period: string) => void; onToggle: () => void }) {
  return <div className="flex items-center justify-between"><Tabs value={period} onValueChange={onPeriodChange}><TabsList className="h-6 flex-wrap">{['15','30','60','90','120','180'].map(value => <TabsTrigger key={value} value={value} className="text-[10px] px-2 h-4">{value}d</TabsTrigger>)}</TabsList></Tabs><Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggle} aria-label={expanded ? "Minimizar gráfico" : "Expandir gráfico"}>{expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}</Button></div>;
}

type RealVelocity = NonNullable<ReturnType<typeof useStockVelocity>['data']>[number];

function selectBestVelocity(velocity: ReturnType<typeof useStockVelocity>['data']): RealVelocity | null {
  const first = velocity?.[0];
  if (!first) return null;
  return velocity.reduce((best, item) => item.avg_daily_depletion_7d > (best.avg_daily_depletion_7d ?? 0) ? item : best, first);
}

function stockoutState(days: number | null | undefined) {
  const finite = days !== null && days !== undefined && Number.isFinite(days);
  return { finite, urgent: finite && days < 7, warning: finite && days < 15 };
}

function formatStockoutDays(days: number | null | undefined, finite: boolean): string {
  if (!finite || days === null || days === undefined) return '∞';
  return String(Math.round(days));
}

function formatCurrentStock(velocity: RealVelocity | null, intelligence: ProductIntelligenceData | null | undefined): string {
  const stock = intelligence?.total_current_stock ?? velocity?.current_stock;
  return stock?.toLocaleString('pt-BR') ?? '—';
}

function formatSupplier(intelligence: ProductIntelligenceData | null | undefined): string {
  const count = intelligence?.supplier_count;
  if (!count) return 'no fornecedor';
  return `${count} fornecedor${count > 1 ? 'es' : ''}`;
}

function buildRiskMetrics(velocity: RealVelocity | null, intelligence: ProductIntelligenceData | null | undefined): RiskMetricsProps {
  const days = velocity?.days_to_stockout;
  const stockout = stockoutState(days);
  const trend = safeVelocityTrend(velocity?.velocity_trend);
  const trendDisplay = formatVelocityTrendOperational(trend);
  const depletion = safeNumber(velocity?.avg_daily_depletion_7d);
  return { depletion: depletion?.toFixed(1) ?? '—', daysToStockout: formatStockoutDays(days, stockout.finite), urgent: stockout.urgent, warning: stockout.warning, currentStock: formatCurrentStock(velocity, intelligence), supplier: formatSupplier(intelligence), trend, trendValue: trendDisplay.value, trendLabel: trendDisplay.label };
}

function PriceChangesNotice({ count }: { count: number }) {
  if (count <= 0) return null;
  return <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><DollarSign className="h-3 w-3" />{count === 1 ? '1 alteração' : `${count} alterações`} de preço nos últimos 30 dias</div>;
}

export function ProductRiskDetail({ productId, productName }: ProductRiskDetailProps) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<string>('30');
  const [chartExpanded, setChartExpanded] = useState(false);
  const days = Number(period);
  const { data: summaries, isLoading: loadingSummary, error: summaryError, refetch: refetchSummary } = useStockDailySummary(productId, days);
  const { data: velocity, isLoading: loadingVelocity, error: velocityError, refetch: refetchVelocity } = useStockVelocity(productId);
  const { data: intelligence, isLoading: loadingIntelligence, error: intelligenceError, refetch: refetchIntelligence } = useProductIntelligenceData(productId);
  const hasData = [summaries?.length, velocity?.length, intelligence].some(Boolean);
  const hasError = [summaryError, velocityError, intelligenceError].some(Boolean);
  const isLoading = [loadingSummary, loadingVelocity, loadingIntelligence].some(Boolean);
  const chartData = useMemo(() => buildRiskChartData(summaries, days), [summaries, days]);
  const bestVelocity = selectBestVelocity(velocity);
  const flags = useMemo(() => deriveFlags(intelligence), [intelligence]);
  const handleRetry = () => { void refetchSummary(); void refetchVelocity(); void refetchIntelligence(); };
  if (isLoading) return <RiskLoading />;
  if (hasError && !hasData) return <RiskError onRetry={handleRetry} />;
  if (!hasData) return <RiskEmpty productName={productName} />;
  const priceChanges = safePriceChanges(bestVelocity);
  const metrics = buildRiskMetrics(bestVelocity, intelligence);
  const partial = hasError && hasData;
  return <div className="space-y-3"><RiskHeader name={productName} productId={productId} partial={partial} classification={intelligence?.abc_classification} onNavigate={() => navigate(`/produto/${productId}`)} /><RiskFlags flags={flags} /><RiskMetrics {...metrics} /><ChartControls period={period} expanded={chartExpanded} onPeriodChange={setPeriod} onToggle={() => setChartExpanded(previous => !previous)} /><RiskChart data={chartData} expanded={chartExpanded} /><PriceChangesNotice count={priceChanges} /></div>;
}
