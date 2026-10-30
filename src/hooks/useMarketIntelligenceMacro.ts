/**
 * Hook para Inteligência de Mercado MACRO (agregada por todos os produtos).
 * Consome stock_daily_summary via external-db-bridge.
 * Retorna dados agregados + breakdown por fornecedor para comparação.
 */
import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';
import type { StockDailySummary } from './useStockHistory';

export interface MacroMarketPoint {
  date: string;
  stockClose: number;
  depleted: number;
  restocked: number;
}

export interface MacroSupplierMetrics {
  supplierId: string;
  avgDailyDepletion7d: number;
  currentStock: number;
  totalDepleted: number;
  totalRestocked: number;
  velocityTrend: number; // ratio 7d vs 30d
  daysToStockout: number | null;
}

export interface MacroMarketKpis {
  totalDepleted7d: number;
  totalDepleted30d: number;
  totalRestocked30d: number;
  totalCurrentStock: number;
  avgDailyDepletion: number;
  supplierCount: number;
  topDepletionDay: { date: string; value: number } | null;
}

export interface MacroMarketData {
  daily: MacroMarketPoint[];
  kpis: MacroMarketKpis;
  suppliers: MacroSupplierMetrics[];
  supplierIds: string[];
}

interface SupplierAccumulator {
  depleted7d: number;
  depleted30d: number;
  restocked30d: number;
  latestStock: number;
  latestDate: string;
  dailyDepleted7d: number[];
  dailyDepleted30d: number[];
}

function addMarketDay(map: Map<string, MacroMarketPoint>, row: StockDailySummary): void {
  const existing = map.get(row.summary_date);
  if (!existing) {
    map.set(row.summary_date, {
      date: row.summary_date,
      stockClose: row.stock_close,
      depleted: row.units_depleted,
      restocked: row.units_restocked,
    });
    return;
  }
  existing.stockClose += row.stock_close;
  existing.depleted += row.units_depleted;
  existing.restocked += row.units_restocked;
}

function emptySupplierAccumulator(): SupplierAccumulator {
  return {
    depleted7d: 0,
    depleted30d: 0,
    restocked30d: 0,
    latestStock: 0,
    latestDate: '',
    dailyDepleted7d: [],
    dailyDepleted30d: [],
  };
}

function addSupplierDay(
  map: Map<string, SupplierAccumulator>,
  row: StockDailySummary,
  sevenDayCutoff: string,
): void {
  if (!row.supplier_id) return;
  const data = map.get(row.supplier_id) || emptySupplierAccumulator();
  data.depleted30d += row.units_depleted;
  data.restocked30d += row.units_restocked;
  data.dailyDepleted30d.push(row.units_depleted);
  if (row.summary_date >= sevenDayCutoff) {
    data.depleted7d += row.units_depleted;
    data.dailyDepleted7d.push(row.units_depleted);
  }
  if (!data.latestDate || row.summary_date > data.latestDate) {
    data.latestStock = row.stock_close;
    data.latestDate = row.summary_date;
  }
  map.set(row.supplier_id, data);
}

function summarizeMarketDays(daily: MacroMarketPoint[], sevenDayCutoff: string) {
  let totalDepleted7d = 0;
  let totalDepleted30d = 0;
  let totalRestocked30d = 0;
  let latestStock = 0;
  let topDepletionDay: { date: string; value: number } | null = null;
  for (const day of daily) {
    totalDepleted30d += day.depleted;
    totalRestocked30d += day.restocked;
    if (day.date >= sevenDayCutoff) totalDepleted7d += day.depleted;
    latestStock = day.stockClose;
    if (!topDepletionDay || day.depleted > topDepletionDay.value) {
      topDepletionDay = { date: day.date, value: day.depleted };
    }
  }
  const activeDays = daily.filter(day => day.depleted > 0).length;
  return {
    totalDepleted7d,
    totalDepleted30d,
    totalRestocked30d,
    latestStock,
    topDepletionDay,
    avgDailyDepletion: activeDays > 0 ? totalDepleted30d / activeDays : 0,
  };
}

function toSupplierMetrics(supplierId: string, data: SupplierAccumulator): MacroSupplierMetrics {
  const avg7d = data.dailyDepleted7d.length > 0 ? data.depleted7d / data.dailyDepleted7d.length : 0;
  const avg30d = data.dailyDepleted30d.length > 0 ? data.depleted30d / data.dailyDepleted30d.length : 0;
  return {
    supplierId,
    avgDailyDepletion7d: avg7d,
    currentStock: data.latestStock,
    totalDepleted: data.depleted30d,
    totalRestocked: data.restocked30d,
    velocityTrend: avg30d > 0 ? avg7d / avg30d : 1,
    daysToStockout: avg7d > 0 ? Math.round(data.latestStock / avg7d) : null,
  };
}

/**
 * Busca stock_daily_summary agregado (macro) para visão de mercado.
 * Filtra opcionalmente por supplier_id.
 */
export function useMarketIntelligenceMacro(days = 30, supplierId?: string | null) {
  return useQuery({
    queryKey: ['market-intelligence-macro', days, supplierId],
    queryFn: async (): Promise<MacroMarketData> => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().slice(0, 10);

      const filters: Record<string, unknown> = {};
      if (supplierId) filters.supplier_id = supplierId;

      const result = await invokeExternalDb<StockDailySummary>({
        table: 'stock_daily_summary',
        operation: 'select',
        select: 'summary_date, stock_close, units_depleted, units_restocked, supplier_id',
        filters,
        limit: 5000,
        orderBy: { column: 'summary_date', ascending: true },
      });

      // Aggregate by date (for chart)
      const dateMap = new Map<string, MacroMarketPoint>();
      // Per-supplier aggregation
      const supplierDataMap = new Map<string, SupplierAccumulator>();
      const uniqueSuppliers = new Set<string>();

      const now = new Date();
      const d7 = new Date(now); d7.setDate(d7.getDate() - 7);
      const d7Str = d7.toISOString().slice(0, 10);

      for (const row of result.records ?? []) {
        if (row.summary_date < cutoffStr) continue;
        addMarketDay(dateMap, row);
        addSupplierDay(supplierDataMap, row, d7Str);
        if (row.supplier_id) uniqueSuppliers.add(row.supplier_id);
      }

      const daily = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      const summary = summarizeMarketDays(daily, d7Str);

      // Build supplier metrics
      const suppliers: MacroSupplierMetrics[] = [];
      supplierDataMap.forEach((sd, sid) => {
        suppliers.push(toSupplierMetrics(sid, sd));
      });

      suppliers.sort((a, b) => b.avgDailyDepletion7d - a.avgDailyDepletion7d);

      return {
        daily,
        kpis: {
          totalDepleted7d: summary.totalDepleted7d,
          totalDepleted30d: summary.totalDepleted30d,
          totalRestocked30d: summary.totalRestocked30d,
          totalCurrentStock: summary.latestStock,
          avgDailyDepletion: summary.avgDailyDepletion,
          supplierCount: uniqueSuppliers.size,
          topDepletionDay: summary.topDepletionDay,
        },
        suppliers,
        supplierIds: Array.from(uniqueSuppliers),
      };
    },
    staleTime: 10 * 60 * 1000,
  });
}
