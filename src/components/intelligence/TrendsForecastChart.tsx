/**
 * TrendsForecastChart — gráfico de atividade com projeção 7d e detecção de anomalias.
 * Substitui o ActivityChart simples quando `enableForecast` está ligado.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, AlertCircle } from "lucide-react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot,
} from "recharts";
import { useMemo } from "react";
import { projectForecast, detectAnomalies } from "@/lib/forecast";
import { formatDateKey } from "@/pages/trends/trends-projections";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

interface TrendsForecastChartProps {
  dailyTrends: Array<{ date: string; views: number; searches: number; dateLabel?: string }> | undefined;
  isLoading: boolean;
  isError?: boolean;
  isFetching?: boolean;
  onRetry?: () => void;
  showForecast: boolean;
  onToggleForecast: (v: boolean) => void;
  showCompare: boolean;
  onToggleCompare: (v: boolean) => void;
  previousTrends?: Array<{ date: string; views: number; searches: number }>;
}

type DailyTrend = NonNullable<TrendsForecastChartProps["dailyTrends"]>[number];
type ForecastPoint = ReturnType<typeof projectForecast>[number];

function realMetric(point: ForecastPoint, value: number | undefined) {
  return point.isForecast ? null : value ?? null;
}

function forecastMetric(point: ForecastPoint, value: number | undefined) {
  return point.isForecast ? value ?? null : null;
}

function chartPoint({ point, index, trends, anomalies, previous }: { point: ForecastPoint; index: number; trends: DailyTrend[]; anomalies: boolean[]; previous: Map<number, number> }) {
  const real = trends[index];
  const isAnomaly = !point.isForecast && (anomalies[index] ?? false);
  return { date: point.date, dateLabel: real?.dateLabel ?? formatDateKey(point.date), views: realMetric(point, real?.views), searches: realMetric(point, real?.searches), forecast: forecastMetric(point, point.value), forecastUpper: forecastMetric(point, point.upper), forecastLower: forecastMetric(point, point.lower), previousViews: realMetric(point, previous.get(index)), isAnomaly, anomalyValue: isAnomaly ? real?.views : null };
}

function buildChartData(trends: DailyTrend[] | undefined, showForecast: boolean, showCompare: boolean, previousTrends: TrendsForecastChartProps["previousTrends"]) {
  if (!trends?.length) return [];
  const viewsSeries = trends.map((trend) => ({ date: trend.date, value: trend.views }));
  const projected = showForecast ? projectForecast(viewsSeries, 7) : viewsSeries.map((point) => ({ ...point, isForecast: false } as ForecastPoint));
  const anomalies = detectAnomalies(trends.map((trend) => trend.views));
  const previous = new Map<number, number>();
  if (showCompare) previousTrends?.forEach((trend, index) => previous.set(index, trend.views));
  return projected.map((point, index) => chartPoint({ point, index, trends, anomalies, previous }));
}

type ChartData = ReturnType<typeof buildChartData>;

function ForecastHeader({ anomalyCount, showForecast, onToggleForecast, showCompare, onToggleCompare }: { anomalyCount: number; showForecast: boolean; onToggleForecast: (value: boolean) => void; showCompare: boolean; onToggleCompare: (value: boolean) => void }) {
  return <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Atividade ao Longo do Tempo{anomalyCount > 0 ? <Badge variant="outline" className="ml-2 bg-warning/10 text-warning border-warning/30 text-[10px]"><AlertCircle className="h-3 w-3 mr-1" />{anomalyCount} {anomalyCount === 1 ? "pico" : "picos"} detectado{anomalyCount === 1 ? "" : "s"}</Badge> : null}</CardTitle><CardDescription>Visualizações e buscas {showForecast ? "+ projeção 7d" : ""} {showCompare ? "+ comparação vs período anterior" : ""}</CardDescription></div><div className="flex items-center gap-4 text-xs"><div className="flex items-center gap-2"><Switch id="cmp" checked={showCompare} onCheckedChange={onToggleCompare} /><Label htmlFor="cmp" className="cursor-pointer">vs anterior</Label></div><div className="flex items-center gap-2"><Switch id="fc" checked={showForecast} onCheckedChange={onToggleForecast} /><Label htmlFor="fc" className="cursor-pointer">previsão 7d</Label></div></div></CardHeader>;
}

function ForecastGraph({ data, showCompare, showForecast }: { data: ChartData; showCompare: boolean; showForecast: boolean }) {
  return <ResponsiveContainer width="100%" height={320}><ComposedChart data={data}><defs><linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient><linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.25} /><stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="dateLabel" className="text-xs" /><YAxis className="text-xs" /><Tooltip contentStyle={tooltipStyle} />{showCompare ? <Line type="monotone" dataKey="previousViews" name="Período anterior" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeWidth={1.5} dot={false} /> : null}<Area type="monotone" dataKey="views" name="Visualizações" stroke="hsl(var(--primary))" fill="url(#colorViews)" strokeWidth={2} /><Line type="monotone" dataKey="searches" name="Buscas" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />{showForecast ? <><Area type="monotone" dataKey="forecastUpper" name="Confiança (sup)" stroke="transparent" fill="url(#colorForecast)" /><Line type="monotone" dataKey="forecast" name="Previsão" stroke="hsl(var(--chart-3))" strokeDasharray="6 4" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--chart-3))" }} /></> : null}{data.map((point) => point.isAnomaly ? <ReferenceDot key={`a-${point.date}`} x={point.dateLabel} y={point.anomalyValue ?? 0} r={6} fill="hsl(var(--warning))" stroke="hsl(var(--card))" strokeWidth={2} /> : null)}</ComposedChart></ResponsiveContainer>;
}

function ForecastError({ hasData, isFetching, onRetry }: { hasData: boolean; isFetching: boolean; onRetry?: () => void }) {
  return <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"><span>{hasData ? "Não foi possível atualizar a série. Os dados anteriores continuam exibidos." : "Não foi possível carregar a atividade do período."}</span>{onRetry ? <Button variant="outline" size="sm" onClick={onRetry} disabled={isFetching}>{isFetching ? "Tentando…" : "Tentar novamente"}</Button> : null}</div>;
}

function ForecastContent({ data, isLoading, isUnavailable, showCompare, showForecast }: { data: ChartData; isLoading: boolean; isUnavailable: boolean; showCompare: boolean; showForecast: boolean }) {
  if (isLoading) return <Skeleton className="h-[320px] w-full" />;
  if (isUnavailable) return null;
  if (!data.length) return <div className="h-[320px] flex items-center justify-center text-muted-foreground"><div className="text-center"><BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>Nenhum dado disponível</p></div></div>;
  return <ForecastGraph data={data} showCompare={showCompare} showForecast={showForecast} />;
}

export function TrendsForecastChart({
  dailyTrends,
  isLoading,
  isError = false,
  isFetching = false,
  onRetry,
  showForecast,
  onToggleForecast,
  showCompare,
  onToggleCompare,
  previousTrends,
}: TrendsForecastChartProps) {
  const chartData = useMemo(() => buildChartData(dailyTrends, showForecast, showCompare, previousTrends), [dailyTrends, showForecast, showCompare, previousTrends]);

  const anomalyCount = chartData.filter(d => d.isAnomaly).length;

  return (
    <Card>
      <ForecastHeader anomalyCount={anomalyCount} showForecast={showForecast} onToggleForecast={onToggleForecast} showCompare={showCompare} onToggleCompare={onToggleCompare} />
      <CardContent>
        {isError ? <ForecastError hasData={dailyTrends !== undefined} isFetching={isFetching} onRetry={onRetry} /> : null}
        <ForecastContent data={chartData} isLoading={isLoading} isUnavailable={isError && dailyTrends === undefined} showCompare={showCompare} showForecast={showForecast} />
      </CardContent>
    </Card>
  );
}
