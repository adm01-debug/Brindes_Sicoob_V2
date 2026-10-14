/**
 * ClientSeasonalityHeatmap — Zona 6 do BI.
 * Sprint 3: linha de forecast (regressão linear simples sobre 12 meses)
 * + card "Próxima janela ideal de campanha" com CTA.
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Sparkles, TrendingUp, Info, Target } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { HeatmapSkeleton } from "@/components/bi/BISkeletons";
import {
  useClientSeasonality,
  SEASONALITY_MONTH_LABELS,
  SEASONALITY_MONTH_LABELS_FULL,
} from "@/hooks/bi/useClientSeasonality";
import { linearRegression } from "@/lib/forecast";

interface Props {
  clientId: string;
  ramoAtividade: string | null;
}

function intensityToBg(intensity: number): string {
  if (intensity <= 0) return "bg-muted/40";
  if (intensity < 0.15) return "bg-violet-50 dark:bg-violet-950/40";
  if (intensity < 0.3) return "bg-violet-100 dark:bg-violet-900/50";
  if (intensity < 0.45) return "bg-violet-200 dark:bg-violet-800/60";
  if (intensity < 0.6) return "bg-violet-300 dark:bg-violet-700/70";
  if (intensity < 0.75) return "bg-violet-400 dark:bg-violet-600/80";
  if (intensity < 0.9) return "bg-violet-500 dark:bg-violet-500";
  return "bg-violet-600 dark:bg-violet-400";
}
function intensityToText(intensity: number): string {
  return intensity >= 0.6 ? "text-white" : "text-foreground";
}

type SeasonalityData = ReturnType<typeof useClientSeasonality>;
type ForecastPoint = { key: string; label: string; historical: number | null; forecast: number | null; isCurrent: boolean };

function buildForecast(client: SeasonalityData["client"], currentMonth: number): ForecastPoint[] {
  if (client.length < 6) return [];
  const values = client.map((month) => month.quotesCount);
  const { slope, intercept } = linearRegression(values);
  const today = new Date();
  const series: ForecastPoint[] = client.map((month) => ({ key: `h-${month.month}`, label: month.monthLabel, historical: month.quotesCount, forecast: null, isCurrent: month.month === currentMonth }));
  for (let index = 1; index <= 6; index++) {
    const next = new Date(today.getFullYear(), today.getMonth() + index, 1);
    const prediction = Math.max(0, slope * (values.length + index - 1) + intercept);
    series.push({ key: `f-${index}`, label: SEASONALITY_MONTH_LABELS[next.getMonth()] ?? "Mês", historical: null, forecast: Math.round(prediction * 10) / 10, isCurrent: false });
  }
  return series;
}

function HeatmapHeader({ data }: { data: SeasonalityData }) {
  const badge = data.isMock
    ? "Dados simulados · modo demonstração"
    : data.hasEnoughData
    ? `Dados reais · ${data.monthsCovered} mês${data.monthsCovered === 1 ? "" : "es"}`
    : `Amostra insuficiente · ${data.monthsCovered} mês${data.monthsCovered === 1 ? "" : "es"}`;
  return <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3 flex-wrap"><div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center"><Calendar className="h-4 w-4 text-violet-600 dark:text-violet-300" /></div><div><CardTitle className="text-base font-display">Sazonalidade Cliente × Setor</CardTitle><p className="text-xs text-muted-foreground mt-0.5">Quando o cliente compra ao longo do ano · janela de {data.windowMonths} meses</p></div></div><Badge variant="outline" className={cn("text-[10px]", data.hasEnoughData && "border-success/50 text-success")}>{badge}</Badge></div></CardHeader>;
}

function ClientMonthCell({ month, currentMonth }: { month: SeasonalityData["client"][number]; currentMonth: number }) {
  return <Tooltip><TooltipTrigger asChild><div className={cn("h-12 rounded-md flex items-center justify-center text-xs font-bold transition-all hover:scale-110 cursor-help", intensityToBg(month.intensity), intensityToText(month.intensity), month.month === currentMonth && "ring-2 ring-violet-600 dark:ring-violet-400 ring-offset-1 ring-offset-background")}>{month.quotesCount > 0 ? month.quotesCount : "—"}</div></TooltipTrigger><TooltipContent side="top" className="text-xs"><div className="font-semibold">{SEASONALITY_MONTH_LABELS_FULL[month.month - 1]}</div>{month.quotesCount > 0 ? <><div>{month.quotesCount} pedido{month.quotesCount === 1 ? "" : "s"} · {formatCurrency(month.totalRevenue)}</div><div className="text-muted-foreground">Ticket médio {formatCurrency(month.avgTicket)} · {month.sharePercent.toFixed(0)}% do ano</div></> : <div className="text-muted-foreground">Sem registros</div>}</TooltipContent></Tooltip>;
}

function IndustryMonthCell({ month, currentMonth }: { month: SeasonalityData["industry"][number]; currentMonth: number }) {
  return <Tooltip><TooltipTrigger asChild><div className={cn("h-12 rounded-md flex items-center justify-center text-xs font-bold transition-all hover:scale-110 cursor-help opacity-90", intensityToBg(month.intensity), intensityToText(month.intensity), month.month === currentMonth && "ring-2 ring-violet-400 dark:ring-violet-500 ring-offset-1 ring-offset-background")}>{month.avgQuotesPerCompany > 0 ? month.avgQuotesPerCompany.toFixed(1) : "—"}</div></TooltipTrigger><TooltipContent side="top" className="text-xs"><div className="font-semibold">{SEASONALITY_MONTH_LABELS_FULL[month.month - 1]} · Setor</div>{month.avgQuotesPerCompany > 0 ? <><div>{month.avgQuotesPerCompany.toFixed(1)} pedidos/empresa</div><div className="text-muted-foreground">Receita média {formatCurrency(month.avgRevenuePerCompany)} · {month.sharePercent.toFixed(0)}% do ano</div></> : <div className="text-muted-foreground">Sem dados</div>}</TooltipContent></Tooltip>;
}

function HeatmapGrid({ data, currentMonth }: { data: SeasonalityData; currentMonth: number }) {
  return <TooltipProvider delayDuration={150}><div className="overflow-x-auto"><div className="min-w-[640px] space-y-2"><div className="grid grid-cols-[80px_repeat(12,1fr)] gap-1 items-center"><div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide" />{data.client.map((month) => <div key={`h-${month.month}`} className={cn("text-center text-[10px] font-medium uppercase tracking-wide py-1", month.month === currentMonth ? "text-violet-600 dark:text-violet-300 font-bold" : "text-muted-foreground")}>{month.monthLabel}</div>)}</div><div className="grid grid-cols-[80px_repeat(12,1fr)] gap-1 items-center"><div className="text-xs font-semibold text-foreground pr-2">Cliente</div>{data.client.map((month) => <ClientMonthCell key={`c-${month.month}`} month={month} currentMonth={currentMonth} />)}</div><div className="grid grid-cols-[80px_repeat(12,1fr)] gap-1 items-center"><div className="text-xs font-semibold text-muted-foreground pr-2">Setor</div>{data.industry.map((month) => <IndustryMonthCell key={`i-${month.month}`} month={month} currentMonth={currentMonth} />)}</div><HeatmapLegend /></div></div></TooltipProvider>;
}

function HeatmapLegend() {
  return <div className="flex items-center gap-2 pt-2 text-[10px] text-muted-foreground"><span>Menos</span><div className="flex gap-0.5">{[0.05, 0.2, 0.4, 0.55, 0.7, 0.85, 1].map((intensity) => <div key={intensity} className={cn("w-4 h-3 rounded-sm", intensityToBg(intensity))} />)}</div><span>Mais</span><span className="ml-3 inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm ring-2 ring-violet-600 ring-offset-1 ring-offset-background" />Hoje</span></div>;
}

function ForecastChart({ series }: { series: ForecastPoint[] }) {
  if (series.length === 0) return null;
  const stroke = "hsl(262 83% 58%)";
  return <div className="rounded-lg border bg-card p-3"><div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-300" /><span className="text-xs font-semibold uppercase tracking-wide text-foreground">Projeção próximos 6 meses</span><span className="text-[10px] text-muted-foreground">· regressão linear</span></div><div className="h-40 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-muted-foreground" /><YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" allowDecimals={false} /><RTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} /><ReferenceLine x={series[11]?.label} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" label={{ value: "agora", fontSize: 9, fill: "hsl(var(--muted-foreground))" }} /><Line type="monotone" dataKey="historical" stroke={stroke} strokeWidth={2} dot={{ r: 3 }} name="Histórico" connectNulls={false} /><Line type="monotone" dataKey="forecast" stroke={stroke} strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, strokeDasharray: "" }} name="Projeção" connectNulls={false} /></LineChart></ResponsiveContainer></div></div>;
}

function downloadFollowUp(month: number, monthName: string) {
  const peakDate = new Date();
  peakDate.setMonth(month - 1, 1);
  if (peakDate < new Date()) peakDate.setFullYear(peakDate.getFullYear() + 1);
  const followUp = new Date(peakDate);
  followUp.setDate(followUp.getDate() - 21);
  const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const calendar = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:bi-${Date.now()}@promogifts\nDTSTAMP:${formatDate(new Date())}\nDTSTART:${formatDate(followUp)}\nDTEND:${formatDate(new Date(followUp.getTime() + 30 * 60000))}\nSUMMARY:Follow-up campanha sazonal\nDESCRIPTION:Janela ideal: ${monthName}\nEND:VEVENT\nEND:VCALENDAR`;
  const url = URL.createObjectURL(new Blob([calendar], { type: "text/calendar" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `follow-up-${monthName.toLowerCase()}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function PeakCard({ data }: { data: SeasonalityData }) {
  if (!data.nextPeakMonth) return <div className="rounded-lg border border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/30 p-3"><PeakTitle /><div className="text-xs text-muted-foreground">Sem padrão sazonal claro identificado.</div></div>;
  const days = data.daysToNextPeak;
  const timing = days === 0 ? "Estamos no pico agora!" : `em ${days} dia${days === 1 ? "" : "s"}`;
  return <div className="rounded-lg border border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/30 p-3"><PeakTitle /><div><div className="text-lg font-bold text-foreground">{SEASONALITY_MONTH_LABELS_FULL[data.nextPeakMonth - 1]}</div><div className="text-xs text-muted-foreground">{timing}</div></div></div>;
}

function PeakTitle() {
  return <div className="flex items-center gap-2 mb-1.5"><TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-300" /><span className="text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">Próximo pico</span></div>;
}

function CampaignWindowCard({ data, peakName }: { data: SeasonalityData; peakName: string | null }) {
  if (!peakName || !data.nextPeakMonth || data.daysToNextPeak === null) return <div className="rounded-lg border border-success/40 bg-success/5 p-3 flex flex-col"><WindowTitle /><p className="text-xs text-muted-foreground inline-flex items-center gap-1"><Info className="h-3 w-3" />Sem janela clara — colete mais histórico.</p></div>;
  const timing = data.daysToNextPeak <= 30 ? "Aborde agora — a janela está abrindo." : `Planeje em ~${Math.max(1, data.daysToNextPeak - 21)} dias para chegar a tempo.`;
  return <div className="rounded-lg border border-success/40 bg-success/5 p-3 flex flex-col"><WindowTitle /><div className="text-lg font-bold text-foreground">Campanha em {peakName}</div><div className="text-xs text-muted-foreground mb-2">{timing}</div><Button size="sm" variant="outline" className="mt-auto self-start gap-1.5 border-success/40 hover:bg-success/10" onClick={() => downloadFollowUp(data.nextPeakMonth ?? 1, peakName)}><Calendar className="h-3.5 w-3.5" />Agendar follow-up</Button></div>;
}

function WindowTitle() {
  return <div className="flex items-center gap-2 mb-1.5"><Target className="h-4 w-4 text-success" /><span className="text-[11px] font-semibold uppercase tracking-wide text-success">Próxima janela ideal</span></div>;
}

function PeakCards({ data, peakName }: { data: SeasonalityData; peakName: string | null }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1"><PeakCard data={data} /><CampaignWindowCard data={data} peakName={peakName} /></div>;
}

function Insight({ text }: { text: string | null }) {
  return text ? <div className="rounded-lg border bg-card p-3 flex items-start gap-2"><Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-300 shrink-0 mt-0.5" /><p className="text-xs leading-relaxed text-foreground">{text}</p></div> : null;
}

function TopMonths({ data }: { data: SeasonalityData }) {
  if (data.topClientMonths.length === 0 && data.topIndustryMonths.length === 0) return null;
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs"><div><div className="font-semibold text-foreground mb-1">Top 3 meses do cliente</div><div className="flex flex-wrap gap-1.5">{data.topClientMonths.length === 0 && <span className="text-muted-foreground">—</span>}{data.topClientMonths.map((month) => <Badge key={month.month} variant="secondary" className="text-[10px]">{SEASONALITY_MONTH_LABELS_FULL[month.month - 1]} · {month.quotesCount}</Badge>)}</div></div><div><div className="font-semibold text-muted-foreground mb-1">Top 3 meses do setor</div><div className="flex flex-wrap gap-1.5">{data.topIndustryMonths.length === 0 && <span className="text-muted-foreground">—</span>}{data.topIndustryMonths.map((month) => <Badge key={month.month} variant="outline" className="text-[10px]">{SEASONALITY_MONTH_LABELS_FULL[month.month - 1]} · {month.avgQuotesPerCompany.toFixed(1)}</Badge>)}</div></div></div>;
}

export function ClientSeasonalityHeatmap({ clientId, ramoAtividade }: Props) {
  const seasonality = useClientSeasonality(clientId, ramoAtividade);
  const currentMonth = new Date().getMonth() + 1;
  const forecastSeries = useMemo(() => buildForecast(seasonality.client, currentMonth), [seasonality.client, currentMonth]);
  if (seasonality.isLoading) return <HeatmapSkeleton />;
  const peakName = seasonality.nextPeakMonth ? SEASONALITY_MONTH_LABELS_FULL[seasonality.nextPeakMonth - 1] ?? null : null;
  return <Card className="border-[1.5px]"><HeatmapHeader data={seasonality} /><CardContent className="space-y-4"><HeatmapGrid data={seasonality} currentMonth={currentMonth} /><ForecastChart series={forecastSeries} /><PeakCards data={seasonality} peakName={peakName} /><Insight text={seasonality.insight} /><TopMonths data={seasonality} /></CardContent></Card>;
}
