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
  /** true quando a janela tem mais registros do que o limite de leitura do painel. */
  truncated: boolean;
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

const PAGE_SIZE = 5000;
const MAX_ROWS = 60000;

type StockRow = StockDailySummary & { id?: string | number };
interface StockRowsPage { rows: StockRow[]; truncated: boolean }

// O bridge pode repetir a consulta SEM a ordem pedida quando a coluna nao existe
// (`meta.orderBy_fallback`). Sem ordem total o deslocamento repete/omite linhas,
// entao a paginacao e abortada em vez de agregar dado incompleto.
function hasOrderFallback(meta: unknown): boolean {
  return (
    typeof meta === 'object' && meta !== null &&
    typeof (meta as { orderBy_fallback?: unknown }).orderBy_fallback === 'string'
  );
}

// Depois de um timeout o bridge reduz o limite da pagina e marca
// `meta.pagination_degraded`: a pagina curta NAO significa fim da leitura.
function hasDegradedPage(meta: unknown): boolean {
  return (
    typeof meta === 'object' && meta !== null &&
    (meta as { pagination_degraded?: unknown }).pagination_degraded === true
  );
}

// Offset igual ao total exato faz o PostgREST responder PGRST103 em vez de uma
// pagina vazia; isso encerra a leitura em vez de derrubar o painel.
function isRangeError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return /PGRST103|range not satisfiable|requested range/i.test(msg);
}

/** Sonda se ha registros depois do teto de leitura (limit 1 no offset do teto). */
async function hasRowsBeyondCap(filters: Record<string, unknown>): Promise<boolean> {
  const probe = await invokeExternalDb<StockRow>({
    table: 'stock_daily_summary',
    operation: 'select',
    select: 'id',
    filters,
    limit: 1,
    offset: MAX_ROWS,
    orderBy: { column: 'id', ascending: true },
  });
  return (probe.records ?? []).length > 0;
}

/**
 * Decide se a leitura que parou no teto deixou dado para tras. A contagem exata da
 * ultima pagina cheia responde de graca quando o bridge a devolve; sem ela, uma
 * sonda no offset do teto responde. Sonda que falha (timeout, 5xx) nao prova fim de
 * dado: nesse caso o painel avisa que o total pode estar incompleto.
 */
async function capTruncated(
  rowsLength: number,
  total: number | null,
  filters: Record<string, unknown>,
): Promise<boolean> {
  if (total !== null) return total > rowsLength;
  try {
    return await hasRowsBeyondCap(filters);
  } catch (error) {
    return !isRangeError(error);
  }
}

interface StockPage {
  records?: StockRow[];
  count?: number | null;
  meta?: unknown;
}

/** `null` = PostgREST recusou o deslocamento (PGRST103): o dado acabou, nao e erro. */
async function readStockPage(
  filters: Record<string, unknown>,
  offset: number,
): Promise<StockPage | null> {
  try {
    return await invokeExternalDb<StockRow>({
      table: 'stock_daily_summary',
      operation: 'select',
      select: 'summary_date, stock_close, units_depleted, units_restocked, supplier_id',
      filters,
      limit: PAGE_SIZE,
      offset,
      orderBy: { column: 'id', ascending: true },
    });
  } catch (error) {
    // Offset 0 recusado nao e fim de dado: e falha real da consulta.
    if (offset > 0 && isRangeError(error)) return null;
    throw error;
  }
}

type PageStop = 'continue' | 'short' | 'degraded';

/** Pagina curta encerra a leitura; degradada encerra e ja sinaliza parcial. */
function pageStop(meta: unknown, received: number): PageStop {
  if (hasDegradedPage(meta)) return 'degraded';
  return received < PAGE_SIZE ? 'short' : 'continue';
}

/**
 * Pagina `stock_daily_summary` por `id` (ordem total: sem repetir nem omitir
 * linhas empatadas na mesma data) ate a ultima pagina incompleta.
 */
async function fetchStockSummaries(filters: Record<string, unknown>): Promise<StockRowsPage> {
  const rows: StockRow[] = [];
  let truncated = false;
  let total: number | null = null;
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const page = await readStockPage(filters, offset);
    // `null` = deslocamento recusado: o dado acabou aqui.
    if (!page) break;
    const batch = page.records ?? [];
    rows.push(...batch);
    // Contagem exata do bridge (quando devolvida) evita a sonda do teto.
    if (typeof page.count === 'number') total = page.count;
    const stop = pageStop(page.meta, batch.length);
    if (stop !== 'continue') {
      truncated = stop === 'degraded';
      break;
    }
    if (hasOrderFallback(page.meta)) throw new Error('Consulta de estoque sem ordenação garantida pelo bridge');
  }
  // Saiu do laco com todas as paginas cheias = bateu no teto; so entao vale
  // confirmar se existe registro alem dele (60 mil exatos nao e resultado parcial).
  if (rows.length >= MAX_ROWS) truncated = await capTruncated(rows.length, total, filters);
  return { rows, truncated };
}

/**
 * Busca stock_daily_summary agregado (macro) para visao de mercado.
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
      // Corte aplicado no servidor (`summary_date_gte` -> `.gte`): sem isso os
      // registros do periodo ficavam fora da pagina quando a base crescia e
      // ampliar o periodo nao recuperava os dias anteriores.
      filters.summary_date_gte = cutoffStr;

      const { rows, truncated } = await fetchStockSummaries(filters);

      // Aggregate by date (for chart)
      const dateMap = new Map<string, MacroMarketPoint>();
      // Per-supplier aggregation
      const supplierDataMap = new Map<string, SupplierAccumulator>();
      const uniqueSuppliers = new Set<string>();

      const now = new Date();
      const d7 = new Date(now); d7.setDate(d7.getDate() - 7);
      const d7Str = d7.toISOString().slice(0, 10);

      for (const row of rows) {
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
        truncated,
      };
    },
    staleTime: 10 * 60 * 1000,
  });
}
