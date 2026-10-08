/**
 * Lightweight product fetch — minimal fields, no enrichment.
 * Used for selectors and catalog listing.
 */
import { logger } from '@/lib/logger';
import { invokeExternalDb, invokeBatchBridge, type InvokeResult } from './bridge';

const PRODUCT_SELECT_LIGHTWEIGHT = 'id, name, sku, supplier_reference, sale_price, cost_price, primary_image_url, supplier_id, category_id, main_category_id, brand, is_active, stock_quantity, min_quantity, is_kit, gender';
const LIGHTWEIGHT_PAGE_SIZE = 500;          // antes 100 — reduz round-trips em 5x
const LIGHTWEIGHT_MAX_CONCURRENCY = 3;       // antes 2 — bridge tem singleton + warmup
const LIGHTWEIGHT_MIN_SPLIT_PAGE_SIZE = 125;
const LIGHTWEIGHT_MAX_TOTAL = 15000;
const LIGHTWEIGHT_INITIAL_BURST = 4;         // 1ª onda paralela; depois sequencial até esvaziar

export interface LightweightProduct {
  id: string;
  name: string;
  sku: string;
  supplier_reference?: string | null;
  sale_price?: number | null;
  cost_price?: number | null;
  primary_image_url: string | null;
  supplier_id: string | null;
  category_id: string | null;
  main_category_id: string | null;
  brand: string | null;
  is_active: boolean;
  stock_quantity?: number | null;
  min_quantity?: number | null;
  is_kit?: boolean | null;
  gender?: string | null;
  /** SSOT da idade do preço — trigger no BD externo. */
  price_updated_at?: string | null;
}

interface LightweightOptions {
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: { column: string; ascending?: boolean };
  filters?: Record<string, unknown>;
}

interface LightweightContext {
  filters: Record<string, unknown>;
  orderBy: { column: string; ascending?: boolean };
  baseOffset: number;
}

function isTimeoutError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /(statement timeout|canceling statement|57014|bad gateway|boot_error|function failed to start)/i.test(message);
}

async function fetchPage(params: {
  filters: Record<string, unknown>;
  orderBy: { column: string; ascending?: boolean };
  limit: number;
  offset: number;
  countMode?: 'exact' | 'planned' | 'estimated' | 'none';
}): Promise<InvokeResult<LightweightProduct>> {
  return invokeExternalDb<LightweightProduct>({
    table: 'products', operation: 'select',
    filters: params.filters, select: PRODUCT_SELECT_LIGHTWEIGHT,
    orderBy: params.orderBy, limit: params.limit,
    offset: params.offset, countMode: params.countMode ?? 'none',
  });
}

async function fetchPageResilient(params: {
  filters: Record<string, unknown>;
  orderBy: { column: string; ascending?: boolean };
  limit: number;
  offset: number;
  countMode?: 'exact' | 'planned' | 'estimated' | 'none';
}): Promise<InvokeResult<LightweightProduct>> {
  try {
    return await fetchPage(params);
  } catch (error) {
    if (!isTimeoutError(error) || params.limit <= LIGHTWEIGHT_MIN_SPLIT_PAGE_SIZE) throw error;
    const firstHalf = Math.ceil(params.limit / 2);
    const secondHalf = params.limit - firstHalf;
    logger.warn(`[lightweight] Timeout at offset=${params.offset}, splitting ${params.limit} -> ${firstHalf}+${secondHalf}`);
    const [left, right] = await Promise.all([
      fetchPageResilient({ ...params, limit: firstHalf, countMode: 'none' }),
      fetchPageResilient({ ...params, offset: params.offset + firstHalf, limit: secondHalf, countMode: 'none' }),
    ]);
    return {
      records: [...(left.records ?? []), ...(right.records ?? [])],
      count: params.countMode === 'none' ? null : left.count ?? right.count ?? null,
    };
  }
}

function lightweightContext(options?: LightweightOptions): LightweightContext {
  const filters: Record<string, unknown> = { ...options?.filters };
  if (options?.search) filters._search = options.search;
  return {
    filters,
    orderBy: options?.orderBy ?? { column: 'name', ascending: true },
    baseOffset: options?.offset ?? 0,
  };
}

function initialBurstQueries(context: LightweightContext) {
  return Array.from({ length: LIGHTWEIGHT_INITIAL_BURST }, (_, index) => ({
    table: 'products', operation: 'select' as const,
    select: PRODUCT_SELECT_LIGHTWEIGHT, filters: context.filters, orderBy: context.orderBy,
    limit: LIGHTWEIGHT_PAGE_SIZE, offset: context.baseOffset + index * LIGHTWEIGHT_PAGE_SIZE,
  }));
}

async function fetchInitialBurst(context: LightweightContext): Promise<{ products: LightweightProduct[]; lastPageSize: number }> {
  const batchResults = await invokeBatchBridge(initialBurstQueries(context));
  const products: LightweightProduct[] = [];
  let lastPageSize = LIGHTWEIGHT_PAGE_SIZE;
  for (const result of batchResults) {
    if (!result.success || !result.data?.records) continue;
    const records = result.data.records as LightweightProduct[];
    products.push(...records);
    lastPageSize = records.length;
  }
  return { products, lastPageSize };
}

async function fetchRemainingPages(context: LightweightContext, initial: LightweightProduct[], maxTotal: number): Promise<LightweightProduct[]> {
  const products = [...initial];
  let nextOffset = context.baseOffset + LIGHTWEIGHT_INITIAL_BURST * LIGHTWEIGHT_PAGE_SIZE;
  while (products.length < maxTotal) {
    const page = await fetchNextPage(context, nextOffset, products.length);
    if (!page) break;
    products.push(...page);
    if (page.length < LIGHTWEIGHT_PAGE_SIZE) break;
    nextOffset += LIGHTWEIGHT_PAGE_SIZE;
  }
  return products.slice(0, maxTotal);
}

async function fetchNextPage(context: LightweightContext, offset: number, currentCount: number): Promise<LightweightProduct[] | null> {
  try {
    const page = await fetchPageResilient({
      filters: context.filters, orderBy: context.orderBy, limit: LIGHTWEIGHT_PAGE_SIZE, offset, countMode: 'none',
    });
    return page.records?.length ? page.records : null;
  } catch (error) {
    logger.warn(`[lightweight] Fase 2 abortada em offset=${offset} (${currentCount} produtos):`, error);
    return null;
  }
}

export async function fetchPromobrindProductsLightweight(options?: LightweightOptions): Promise<LightweightProduct[]> {
  const context = lightweightContext(options);

  if (typeof options?.limit === 'number' && options.limit > 0) {
    const result = await fetchPageResilient({ filters: context.filters, orderBy: context.orderBy, limit: options.limit, offset: context.baseOffset, countMode: 'none' });
    return result.records ?? [];
  }

  const maxTotal = LIGHTWEIGHT_MAX_TOTAL;

  // Estratégia em 2 fases (substitui o batch fixo de 150 queries × 100 records):
  //   Fase 1 — burst inicial paralelo de LIGHTWEIGHT_INITIAL_BURST páginas × 500 records.
  //            Cobre 2k registros (suficiente para 1ª tela em todas as UIs hoje).
  //   Fase 2 — paginação sequencial até esgotar, com early-exit assim que uma
  //            página retornar < LIGHTWEIGHT_PAGE_SIZE.
  //
  // Ganhos: 4 round-trips iniciais em vez de 150, mantendo concurrency segura;
  // sem novo protocolo entre client e bridge; sem mudança de ordenação.

  let burst;
  try {
    burst = await fetchInitialBurst(context);
  } catch (batchError) {
    logger.warn('[lightweight] Burst inicial falhou, fallback sequencial:', batchError);
    return fetchSequential(context.filters, context.orderBy, context.baseOffset, maxTotal);
  }

  // Early-exit: se a última página do burst veio incompleta, não há mais dados.
  if (burst.lastPageSize < LIGHTWEIGHT_PAGE_SIZE) return burst.products;
  if (burst.products.length >= maxTotal) return burst.products.slice(0, maxTotal);
  return fetchRemainingPages(context, burst.products, maxTotal);
}

async function fetchSequential(
  filters: Record<string, unknown>,
  orderBy: { column: string; ascending?: boolean },
  baseOffset: number,
  maxTotal: number,
): Promise<LightweightProduct[]> {
  const firstPage = await fetchPageResilient({ filters, orderBy, limit: LIGHTWEIGHT_PAGE_SIZE, offset: baseOffset, countMode: 'planned' });
  const firstPageRecords = firstPage.records ?? [];
  const products: LightweightProduct[] = [...firstPageRecords];
  if (firstPageRecords.length < LIGHTWEIGHT_PAGE_SIZE) return products;

  const estimatedTotal = estimateTotal(firstPage.count, firstPageRecords.length, maxTotal);
  const remaining = estimatedTotal - products.length;
  if (remaining <= 0) return products;

  const offsets = Array.from(
    { length: Math.ceil(remaining / LIGHTWEIGHT_PAGE_SIZE) },
    (_, i) => baseOffset + LIGHTWEIGHT_PAGE_SIZE * (i + 1),
  );

  for (let i = 0; i < offsets.length; i += LIGHTWEIGHT_MAX_CONCURRENCY) {
    const batch = offsets.slice(i, i + LIGHTWEIGHT_MAX_CONCURRENCY);
    const pages = await Promise.all(
      batch.map(offset => fetchPageResilient({ filters, orderBy, limit: LIGHTWEIGHT_PAGE_SIZE, offset, countMode: 'none' })),
    );
    appendPages(products, pages);
    const lastPage = pages[pages.length - 1];
    if ((lastPage?.records?.length ?? 0) < LIGHTWEIGHT_PAGE_SIZE) break;
    if (products.length >= maxTotal) break;
  }
  return products;
}

function estimateTotal(count: number | null | undefined, loaded: number, maxTotal: number): number {
  return typeof count === 'number' && count > loaded ? Math.min(count, maxTotal) : maxTotal;
}

function appendPages(products: LightweightProduct[], pages: InvokeResult<LightweightProduct>[]): void {
  for (const page of pages) products.push(...(page.records ?? []));
}
