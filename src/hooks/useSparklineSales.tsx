/**
 * Batch sparkline data provider.
 * Fetches aggregated daily market activity (units_depleted) from supplier
 * stock_daily_summary via external-db-bridge, avoiding N+1 queries.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { invokeExternalDb } from "@/lib/external-db";
import { logger } from '@/lib/logger';

// Per-product sparkline data
export interface SparklineSalesData {
  /** Daily depleted quantities (ordered by date ascending), last 30 days */
  dailyQty: number[];
  totalQty: number;
  /** Total units replenished in the period */
  totalReplenished: number;
  /** Current available stock across all supplier sources */
  availableStock: number;
}

type SparklineMap = Record<string, SparklineSalesData>;

const SparklineCtx = createContext<SparklineMap>({});

export function useSparklineData(productId: string): SparklineSalesData | undefined {
  const map = useContext(SparklineCtx);
  return map[productId];
}

interface Props {
  productIds: string[];
  children: ReactNode;
}

/**
 * Wrap a product list/grid with this provider.
 * It fetches stock_daily_summary for the given product IDs in bulk.
 */
export function SparklineSalesProvider({ productIds, children }: Props) {
  const stableIds = useMemo(() => {
    const unique = [...new Set(productIds)];
    unique.sort();
    return unique;
  }, [productIds]);

  const { data: sparkMap } = useQuery({
    queryKey: ["sparkline-supplier-batch", stableIds],
    queryFn: () => fetchSupplierSparklineBatch(stableIds),
    enabled: stableIds.length > 0,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const value = sparkMap ?? {};

  return <SparklineCtx.Provider value={value}>{children}</SparklineCtx.Provider>;
}

// ---------- Data fetching ----------

interface StockDailySummaryRow {
  product_id: string;
  summary_date: string;
  units_depleted: number | null;
  [key: string]: unknown;
}

async function fetchSparklineRecords(productIds: string[], cutoff: string) {
  const records: StockDailySummaryRow[] = [];
  const batchSize = 50;
  for (let index = 0; index < productIds.length; index += batchSize) {
    const batch = productIds.slice(index, index + batchSize);
    try {
      const result = await invokeExternalDb<StockDailySummaryRow>({
        table: 'stock_daily_summary',
        operation: 'select',
        select: 'product_id, summary_date, units_depleted',
        filters: {
          product_id: `in.(${batch.join(',')})`,
          summary_date: `gte.${cutoff}`,
        },
        limit: batch.length * 31,
        orderBy: { column: 'summary_date', ascending: true },
      });
      records.push(...(result.records || []));
    } catch (error) {
      logger.warn('[sparkline] Failed to fetch stock_daily_summary batch:', error);
    }
  }
  return records;
}

function indexSparklineRecords(records: StockDailySummaryRow[]) {
  const map: Record<string, Record<string, number>> = {};
  for (const row of records) {
    if (!row.product_id) continue;
    const date = row.summary_date?.substring(0, 10);
    if (!date) continue;
    const productMap = map[row.product_id] ?? (map[row.product_id] = {});
    productMap[date] = (productMap[date] || 0) + (row.units_depleted || 0);
  }
  return map;
}

function buildDailySeries(dateMap: Record<string, number>, today: Date) {
  const dailyQty: number[] = [];
  let totalQty = 0;
  for (let index = 29; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - index);
    const value = dateMap[date.toISOString().substring(0, 10)] ?? 0;
    dailyQty.push(value);
    totalQty += value;
  }
  return { dailyQty, totalQty, totalReplenished: 0, availableStock: 0 };
}

async function fetchSupplierSparklineBatch(productIds: string[]): Promise<SparklineMap> {
  if (!productIds.length) return {};

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().substring(0, 10);

  const map = indexSparklineRecords(await fetchSparklineRecords(productIds, cutoffStr));

  // Generate contiguous 30-day arrays
  const result: SparklineMap = {};
  const today = new Date();

  for (const pid of productIds) {
    const dateMap = map[pid] || {};
    result[pid] = buildDailySeries(dateMap, today);
  }

  return result;
}
