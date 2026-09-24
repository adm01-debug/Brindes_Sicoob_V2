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

export function useStockChartData(productId: string) {
  const [period, setPeriod] = useState<string>('30');
  const [showCost, setShowCost] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const days = Number(period);

  const {
    data: summaries,
    isLoading: loadingSummary,
    error: summaryError,
    refetch: refetchSummary,
  } = useStockDailySummary(productId, days);
  const {
    data: velocity,
    error: velocityError,
    refetch: refetchVelocity,
  } = useStockVelocity(productId);
  const {
    data: intelligence,
    error: intelligenceError,
    refetch: refetchIntelligence,
  } = useProductIntelligenceData(productId);

  const hasData = !!summaries?.length;
  const hasError = !!(summaryError || velocityError || intelligenceError);

  // Supplier names
  const supplierIds = useMemo(
    () => hasData ? extractUniqueSupplierIds(summaries!) : [],
    [summaries, hasData]
  );
  const { data: supplierNamesMap } = useSupplierNames(supplierIds);

  const supplierOptions = useMemo(() => {
    if (supplierIds.length <= 1) return [];
    return supplierIds.map(id => ({
      id,
      name: supplierNamesMap?.get(id) ?? `Fornecedor ${id.slice(0, 6)}`,
    }));
  }, [supplierIds, supplierNamesMap]);

  // Chart data
  const chartData = useMemo(() => {
    if (!hasData) return [];
    const supplierId = selectedSupplier === 'all' ? undefined : selectedSupplier;
    const aggregated = aggregateDailySummaryByDate(summaries!, supplierId);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return aggregated
      .filter(d => new Date(d.date) >= cutoff)
      .reduce<Array<{ date: string; stockClose: number; depleted: number; restocked: number; restockDetected: boolean; costPriceClose: number | null; dateFormatted: string; fullDate: string }>>((acc, d) => {
        const parsed = safeParseDateForChart(d.date);
        if (parsed) acc.push({ ...d, ...parsed });
        return acc;
      }, []);
  }, [summaries, days, hasData, selectedSupplier]);

  // Effective data
  const effectiveIntelligence = intelligence ?? null;
  const effectiveVelocities = useMemo(() => velocity ?? [], [velocity]);

  const bestVelocity = useMemo(() => {
    if (effectiveVelocities.length) {
      if (selectedSupplier !== 'all') {
        const match = effectiveVelocities.find(v => v.supplier_id === selectedSupplier);
        if (match) return match;
      }
      return effectiveVelocities.reduce((best, v) =>
        (v.avg_daily_depletion_7d > (best?.avg_daily_depletion_7d ?? 0)) ? v : best, effectiveVelocities[0]);
    }
    return null;
  }, [effectiveVelocities, selectedSupplier]);

  const flags = useMemo(() => {
    if (!effectiveIntelligence) return [];
    return getActiveFlags(effectiveIntelligence);
  }, [effectiveIntelligence]);

  // Derived commercial insights
  const trend = safeVelocityTrend(bestVelocity?.velocity_trend);
  const trendDisplay = formatVelocityTrendCommercial(trend);

  const marketDemandLevel = useMemo<MarketDemandLevel>(() => {
    if (!bestVelocity) return 'unknown';
    const v = safeNumber(bestVelocity.avg_daily_depletion_7d);
    if (v == null) return 'unknown';
    if (v >= 20) return 'very-high';
    if (v >= 10) return 'high';
    if (v >= 3) return 'moderate';
    return 'low';
  }, [bestVelocity]);

  const demandLabel: Record<MarketDemandLevel, { text: string; color: string }> = {
    'very-high': { text: 'Muito Alta', color: 'text-destructive' },
    'high': { text: 'Alta', color: 'text-warning' },
    'moderate': { text: 'Moderada', color: 'text-primary' },
    'low': { text: 'Baixa', color: 'text-muted-foreground' },
    'unknown': { text: '—', color: 'text-muted-foreground' },
  };

  const supplierText = useMemo(() => {
    if (selectedSupplier !== 'all' && supplierNamesMap) {
      const name = supplierNamesMap.get(selectedSupplier);
      return name ? `em ${name}` : 'fornecedor selecionado';
    }
    const count = effectiveIntelligence?.supplier_count;
    if (count == null || count === 0) return 'no fornecedor';
    return `em ${count} fornecedor${count > 1 ? 'es' : ''}`;
  }, [effectiveIntelligence, selectedSupplier, supplierNamesMap]);

  const priceChanges = safePriceChanges(bestVelocity);

  const handleRetry = () => {
    refetchSummary();
    refetchVelocity();
    refetchIntelligence();
  };

  const turnoverScore = effectiveIntelligence?.turnover_score;
  const showTurnover = turnoverScore != null && Number.isFinite(turnoverScore);

  return {
    // State
    period, setPeriod,
    showCost, setShowCost,
    selectedSupplier, setSelectedSupplier,
    days,

    // Loading/error
    loadingSummary,
    hasData,
    hasError,

    // Data
    chartData,
    effectiveIntelligence,
    effectiveVelocities: effectiveVelocities as StockVelocity[],
    bestVelocity,
    flags,
    supplierOptions,
    supplierNamesMap,

    // Derived
    trend,
    trendDisplay,
    marketDemandLevel,
    demandLabel,
    supplierText,
    priceChanges,
    turnoverScore,
    showTurnover,

    // Actions
    handleRetry,
  };
}
