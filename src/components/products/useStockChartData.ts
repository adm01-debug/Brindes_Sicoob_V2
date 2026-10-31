/**
 * Business logic hook for StockHistoryChart.
 * Extracts data fetching and derived insights from the external catalog.
 */
import { useMemo, useState } from "react";
import {
  useStockDailySummary,
  useStockVelocity,
  useProductIntelligenceData,
  aggregateDailySummaryByDate,
  extractUniqueSupplierIds,
  getActiveFlags,
  type StockVelocity,
} from "@/hooks/useStockHistory";
import { useSupplierNames } from "@/hooks/useSupplierNames";
import {
  safeVelocityTrend,
  safeNumber,
  formatVelocityTrendCommercial,
  safeParseDateForChart,
  safePriceChanges,
} from "@/lib/stock-chart-utils";

export type MarketDemandLevel = 'very-high' | 'high' | 'moderate' | 'low' | 'unknown';

const DEMAND_LABEL: Record<MarketDemandLevel, { text: string; color: string }> = {
  'very-high': { text: 'Muito Alta', color: 'text-destructive' }, high: { text: 'Alta', color: 'text-warning' },
  moderate: { text: 'Moderada', color: 'text-primary' }, low: { text: 'Baixa', color: 'text-muted-foreground' },
  unknown: { text: '—', color: 'text-muted-foreground' },
};

function buildChartData(summaries: Parameters<typeof aggregateDailySummaryByDate>[0], days: number, selectedSupplier: string) {
  const aggregated = aggregateDailySummaryByDate(summaries, selectedSupplier === 'all' ? undefined : selectedSupplier);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return aggregated.filter((item) => new Date(item.date) >= cutoff).reduce<Array<typeof aggregated[number] & { dateFormatted: string; fullDate: string }>>((result, item) => {
    const parsed = safeParseDateForChart(item.date);
    if (parsed) result.push({ ...item, ...parsed });
    return result;
  }, []);
}

function selectBestVelocity(velocities: StockVelocity[], selectedSupplier: string) {
  const selected = selectedSupplier === 'all' ? undefined : velocities.find((item) => item.supplier_id === selectedSupplier);
  return selected ?? velocities.reduce<StockVelocity | null>((best, item) => item.avg_daily_depletion_7d > (best?.avg_daily_depletion_7d ?? 0) ? item : best, velocities[0] ?? null);
}

function demandLevel(velocity: StockVelocity | null): MarketDemandLevel {
  const value = safeNumber(velocity?.avg_daily_depletion_7d);
  if (value === null || value === undefined) return 'unknown';
  if (value >= 20) return 'very-high';
  if (value >= 10) return 'high';
  if (value >= 3) return 'moderate';
  return 'low';
}

function useStockSources(productId: string, days: number) {
  const summary = useStockDailySummary(productId, days);
  const velocity = useStockVelocity(productId);
  const intelligence = useProductIntelligenceData(productId);
  return { summary, velocity, intelligence };
}

function useSupplierChartContext(summaries: NonNullable<ReturnType<typeof useStockDailySummary>["data"]>, hasData: boolean, days: number, selectedSupplier: string) {
  const supplierIds = useMemo(() => hasData ? extractUniqueSupplierIds(summaries) : [], [summaries, hasData]);
  const { data: supplierNamesMap } = useSupplierNames(supplierIds);
  const supplierOptions = useMemo(() => supplierIds.length <= 1 ? [] : supplierIds.map((id) => ({ id, name: supplierNamesMap?.get(id) ?? `Fornecedor ${id.slice(0, 6)}` })), [supplierIds, supplierNamesMap]);
  const chartData = useMemo(() => hasData ? buildChartData(summaries, days, selectedSupplier) : [], [summaries, days, hasData, selectedSupplier]);
  return { supplierNamesMap, supplierOptions, chartData };
}

function useCommercialInsights(velocity: StockVelocity[], intelligence: ReturnType<typeof useProductIntelligenceData>["data"], selectedSupplier: string, supplierNamesMap: Map<string, string> | undefined) {
  const effectiveIntelligence = intelligence ?? null;
  const effectiveVelocities = useMemo(() => velocity, [velocity]);
  const bestVelocity = useMemo(() => selectBestVelocity(effectiveVelocities, selectedSupplier), [effectiveVelocities, selectedSupplier]);
  const flags = useMemo(() => effectiveIntelligence ? getActiveFlags(effectiveIntelligence) : [], [effectiveIntelligence]);
  const trend = safeVelocityTrend(bestVelocity?.velocity_trend);
  const marketDemandLevel = useMemo(() => demandLevel(bestVelocity), [bestVelocity]);
  const supplierText = useMemo(() => {
    if (selectedSupplier !== 'all' && supplierNamesMap) return supplierNamesMap.get(selectedSupplier) ? `em ${supplierNamesMap.get(selectedSupplier)}` : 'fornecedor selecionado';
    const count = effectiveIntelligence?.supplier_count;
    if (!count) return 'no fornecedor';
    return `em ${count} fornecedor${count > 1 ? 'es' : ''}`;
  }, [effectiveIntelligence, selectedSupplier, supplierNamesMap]);
  const turnoverScore = effectiveIntelligence?.turnover_score;
  return { effectiveIntelligence, effectiveVelocities, bestVelocity, flags, trend, trendDisplay: formatVelocityTrendCommercial(trend), marketDemandLevel, supplierText, priceChanges: safePriceChanges(bestVelocity), turnoverScore, showTurnover: turnoverScore !== null && turnoverScore !== undefined && Number.isFinite(turnoverScore) };
}

export function useStockChartData(productId: string) {
  const [period, setPeriod] = useState<string>('30');
  const [showCost, setShowCost] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const days = Number(period);

  const { summary, velocity, intelligence } = useStockSources(productId, days);
  const summaries = summary.data;
  const hasData = !!summaries?.length;
  const hasError = Boolean(summary.error || velocity.error || intelligence.error);
  const supplier = useSupplierChartContext(summaries ?? [], hasData, days, selectedSupplier);
  const commercial = useCommercialInsights(velocity.data ?? [], intelligence.data, selectedSupplier, supplier.supplierNamesMap);

  const handleRetry = () => {
    summary.refetch();
    velocity.refetch();
    intelligence.refetch();
  };
  return {
    period, setPeriod,
    showCost, setShowCost,
    selectedSupplier, setSelectedSupplier,
    days,
    loadingSummary: summary.isLoading,
    hasData,
    hasError,
    chartData: supplier.chartData,
    effectiveIntelligence: commercial.effectiveIntelligence,
    effectiveVelocities: commercial.effectiveVelocities,
    bestVelocity: commercial.bestVelocity,
    flags: commercial.flags,
    supplierOptions: supplier.supplierOptions,
    supplierNamesMap: supplier.supplierNamesMap,
    trend: commercial.trend,
    trendDisplay: commercial.trendDisplay,
    marketDemandLevel: commercial.marketDemandLevel,
    demandLabel: DEMAND_LABEL,
    supplierText: commercial.supplierText,
    priceChanges: commercial.priceChanges,
    turnoverScore: commercial.turnoverScore,
    showTurnover: commercial.showTurnover,
    handleRetry,
  };
}
