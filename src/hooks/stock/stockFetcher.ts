/**
 * stockFetcher — Busca paginada e processamento de dados de estoque
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import {
  type VariantStock,
  type ProductStockSummary,
  type StockAlert,
  type FutureStockEntry,
  calculateStockStatus,
  calculateDaysUntilStockout,
  calculateAvailableStock,
  aggregateVariantsToProduct,
} from '@/types/stock';
import { generateStockAlerts } from './stockAlerts';

// ============================================
// TIPOS PARA API EXTERNA
// ============================================

interface ExternalProductWithVariants {
  id: string;
  name: string;
  sku?: string;
  min_quantity?: number;
  stock_quantity?: number;
  updated_at?: string;
  category_id?: string;
  supplier_id?: string;
  brand?: string;
}

interface ExternalVariantStock {
  id: string;
  product_id: string;
  sku?: string;
  name?: string;
  color_id?: string;
  color_name?: string;
  color_hex?: string;
  color_code?: string;
  stock_quantity: number;
  is_active?: boolean;
  updated_at?: string;
}

interface ExternalSupplierSource {
  id: string;
  variant_id: string;
  supplier_id?: string;
  supplier_sku?: string;
  quantity: number;
  reserved_quantity?: number;
  next_quantity_1?: number | null;
  next_date_1?: string | null;
  next_quantity_2?: number | null;
  next_date_2?: string | null;
  next_quantity_3?: number | null;
  next_date_3?: string | null;
  is_active?: boolean;
  updated_at?: string;
}

export function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function valueOr<T>(value: T | null | undefined | false | '' | 0, fallback: T): T {
  return value ? value as T : fallback;
}

interface PaginationRequest {
  table: string;
  select: string;
  pageSize: number;
  offset: number;
  filters?: Record<string, unknown>;
}

function paginationBody(request: PaginationRequest): Record<string, unknown> {
  const { table, select, pageSize, offset, filters } = request;
  const body: Record<string, unknown> = {
    table, operation: 'select', select, limit: pageSize, offset, filters,
  };
  if (offset === 0) body.countMode = 'exact';
  return body;
}

function reachedPaginationEnd(totalCount: number | null, offset: number): boolean {
  return totalCount !== null && offset >= totalCount;
}

interface BridgePage<T> {
  records: T[];
  count: number | null;
  error: unknown;
}

async function requestBridgePage<T>(body: Record<string, unknown>): Promise<BridgePage<T>> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', { body });
  return {
    records: (data?.data?.records ?? []) as T[],
    count: (data?.data?.count ?? null) as number | null,
    error,
  };
}

function firstRecordId<T extends { id: string }>(records: T[]): string | undefined {
  return records.length === 0 ? undefined : records[0]?.id;
}

function countLabel(count: number | null): string {
  return count === null ? '?' : String(count);
}

// ============================================
// BUSCA PAGINADA
// ============================================

export async function fetchPaginatedFromBridge<T extends { id: string }>(
  ...[table, select, requestedPageSize, requestedMaxRecords, filters]: [
    string,
    string,
    number?,
    number?,
    Record<string, unknown>?,
  ]
): Promise<T[]> {
  const pageSize = requestedPageSize === undefined ? 1000 : requestedPageSize;
  const maxRecords = requestedMaxRecords === undefined ? 100000 : requestedMaxRecords;
  const all: T[] = [];
  let offset = 0;
  let lastFirstId: string | undefined;
  let totalCount: number | null = null;

  while (all.length < maxRecords) {
    const body = paginationBody({ table, select, pageSize, offset, filters });
    const { records, count, error } = await requestBridgePage<T>(body);

    if (error) {
      console.error(`[Stock] Erro ao buscar ${table}:`, error);
      break;
    }

    if (offset === 0) totalCount = count;

    if (records.length === 0) break;

    const currentFirstId = firstRecordId(records);
    if (currentFirstId === lastFirstId) {
      logger.warn(`[Stock] Paginação ignorando offset em ${table}; parando.`);
      break;
    }
    lastFirstId = currentFirstId;

    all.push(...records);
    offset += records.length;

    if (reachedPaginationEnd(totalCount, offset)) break;
  }

  logger.log(`[Stock] ${table}: carregados ${all.length}/${countLabel(totalCount)} registros`);
  return all;
}

// ============================================
// PROCESSAMENTO DE DADOS
// ============================================

function buildFutureEntries(
  supplierSource: ExternalSupplierSource,
  productId: string,
  variantId: string,
  ...details: [colorName?: string, productName?: string, productSku?: string]
): FutureStockEntry[] {
  const [colorName, productName, productSku] = details;
  const entries: FutureStockEntry[] = [];
  const pairs = [
    { q: supplierSource.next_quantity_1, d: supplierSource.next_date_1, suffix: '1', status: 'confirmed' as const },
    { q: supplierSource.next_quantity_2, d: supplierSource.next_date_2, suffix: '2', status: 'pending' as const },
    { q: supplierSource.next_quantity_3, d: supplierSource.next_date_3, suffix: '3', status: 'pending' as const },
  ];
  for (const { q, d, suffix, status } of pairs) {
    if (q && d) {
      entries.push({
        id: `${supplierSource.id}-${suffix}`, productId, variantId,
        colorName, productName, productSku,
        expectedQuantity: q, expectedDate: d,
        source: 'purchase_order', status,
        createdAt: supplierSource.updated_at || new Date().toISOString(),
        updatedAt: supplierSource.updated_at || new Date().toISOString(),
      });
    }
  }
  return entries;
}

function inTransitQuantity(source: ExternalSupplierSource | undefined): number {
  if (!source) return 0;
  return toNumber(source.next_quantity_1) + toNumber(source.next_quantity_2) + toNumber(source.next_quantity_3);
}

function buildVariantStock(
  product: ExternalProductWithVariants,
  variant: ExternalVariantStock,
  source: ExternalSupplierSource | undefined,
  futureEntries: FutureStockEntry[],
): VariantStock {
  const currentStock = source
    ? toNumber(source.quantity, toNumber(variant.stock_quantity))
    : toNumber(variant.stock_quantity);
  const reservedStock = source ? toNumber(source.reserved_quantity) : 0;
  const inTransitStock = inTransitQuantity(source);
  const minStock = valueOr(product.min_quantity, 10);

  if (source) {
    futureEntries.push(...buildFutureEntries(
      source,
      product.id,
      variant.id,
      valueOr(variant.color_name, undefined),
      product.name,
      product.sku,
    ));
  }

  const availableStock = calculateAvailableStock(currentStock, reservedStock);
  const daysUntilStockout = calculateDaysUntilStockout(availableStock);
  return {
    id: variant.id,
    productId: product.id,
    variantId: variant.id,
    variantSku: valueOr(variant.sku, `${product.sku}-${valueOr(variant.color_code, 'VAR')}`),
    colorId: variant.color_id,
    colorName: valueOr(variant.color_name, 'Padrão'),
    colorHex: variant.color_hex,
    currentStock,
    minStock,
    reservedStock,
    inTransitStock,
    availableStock,
    status: calculateStockStatus(currentStock, minStock, undefined, inTransitStock, daysUntilStockout),
    daysUntilStockout,
    futureStock: inTransitStock > 0 ? inTransitStock : undefined,
    futureStockDate: source ? valueOr(source.next_date_1, undefined) : undefined,
    updatedAt: valueOr(variant.updated_at, valueOr(product.updated_at, new Date().toISOString())),
  };
}

function productLevelVariant(product: ExternalProductWithVariants): VariantStock {
  const currentStock = toNumber(product.stock_quantity);
  const minStock = valueOr(product.min_quantity, 10);
  const availableStock = calculateAvailableStock(currentStock, 0);
  const daysUntilStockout = calculateDaysUntilStockout(availableStock);
  return {
    id: product.id,
    productId: product.id,
    variantId: product.id,
    variantSku: valueOr(product.sku, 'PROD'),
    colorName: 'Padrão',
    currentStock,
    minStock,
    reservedStock: 0,
    inTransitStock: 0,
    availableStock,
    status: calculateStockStatus(currentStock, minStock, undefined, 0, daysUntilStockout),
    daysUntilStockout,
    updatedAt: valueOr(product.updated_at, new Date().toISOString()),
  };
}

function addProductStockFallback(
  product: ExternalProductWithVariants,
  variants: VariantStock[],
): VariantStock[] {
  const productStock = toNumber(product.stock_quantity);
  const variantStock = variants.reduce((sum, variant) => sum + toNumber(variant.currentStock), 0);
  if (variantStock !== 0 || productStock <= 0) return variants;

  const minStock = valueOr(product.min_quantity, 10);
  const firstVariant = variants[0];
  if (variants.length === 1 && firstVariant) {
    const availableStock = calculateAvailableStock(productStock, firstVariant.reservedStock);
    const daysUntilStockout = calculateDaysUntilStockout(availableStock);
    return [{
      ...firstVariant,
      currentStock: productStock,
      availableStock,
      status: calculateStockStatus(productStock, minStock, undefined, 0, daysUntilStockout),
      daysUntilStockout,
    }];
  }

  const totalVariant = productLevelVariant(product);
  return [...variants, {
    ...totalVariant,
    id: `${product.id}::product_total`,
    variantId: `${product.id}::product_total`,
    colorName: 'Total do Produto',
  }];
}

function buildProductVariants(
  product: ExternalProductWithVariants,
  productVariants: ExternalVariantStock[],
  sourcesByVariant: Map<string, ExternalSupplierSource>,
  futureEntries: FutureStockEntry[],
): VariantStock[] {
  if (productVariants.length === 0) return [productLevelVariant(product)];
  const variants = productVariants.map((variant) => (
    buildVariantStock(product, variant, sourcesByVariant.get(variant.id), futureEntries)
  ));
  return addProductStockFallback(product, variants);
}

function buildProductSummary(
  product: ExternalProductWithVariants,
  variantsByProduct: Map<string, ExternalVariantStock[]>,
  sourcesByVariant: Map<string, ExternalSupplierSource>,
  ...lookups: [
    categoryMap: Map<string, string>,
    supplierMap: Map<string, string>,
    futureEntries: FutureStockEntry[],
  ]
): ProductStockSummary {
  const [categoryMap, supplierMap, futureEntries] = lookups;
  const variants = buildProductVariants(
    product,
    valueOr(variantsByProduct.get(product.id), []),
    sourcesByVariant,
    futureEntries,
  );
  const aggregated = aggregateVariantsToProduct(variants);
  const categoryName = product.category_id ? categoryMap.get(product.category_id) : undefined;
  const supplierName = product.supplier_id
    ? supplierMap.get(product.supplier_id)
    : valueOr(product.brand, undefined);
  return {
    productId: product.id,
    productName: product.name,
    productSku: valueOr(product.sku, ''),
    categoryName,
    supplierName,
    ...aggregated,
  };
}

export async function fetchAndProcessStockData(): Promise<{
  productStocks: ProductStockSummary[];
  alerts: StockAlert[];
  futureStock: FutureStockEntry[];
}> {
  const [allProducts, allVariants, allSupplierSources, allCategories, allSuppliers] = await Promise.all([
    fetchPaginatedFromBridge<ExternalProductWithVariants>(
      'products', 'id,name,sku,min_quantity,stock_quantity,updated_at,category_id,supplier_id,brand', 1000, 100000, { is_active: true }
    ),
    fetchPaginatedFromBridge<ExternalVariantStock>(
      'product_variants', 'id,product_id,sku,name,color_id,color_name,color_hex,color_code,stock_quantity,is_active,updated_at', 1000, 100000, { is_active: true }
    ),
    fetchPaginatedFromBridge<ExternalSupplierSource>(
      'variant_supplier_sources', 'id,variant_id,supplier_id,supplier_sku,quantity,next_quantity_1,next_date_1,next_quantity_2,next_date_2,next_quantity_3,next_date_3,is_active,updated_at', 1000, 100000, { is_active: true }
    ),
    fetchPaginatedFromBridge<{ id: string; name: string }>(
      'categories', 'id,name', 1000, 100000
    ),
    fetchPaginatedFromBridge<{ id: string; name: string; code?: string }>(
      'suppliers', 'id,name,code', 1000, 100000
    ),
  ]);

  // Build lookup maps for category and supplier names
  const categoryMap = new Map<string, string>();
  allCategories.forEach(c => categoryMap.set(c.id, c.name));
  const supplierMap = new Map<string, string>();
  allSuppliers.forEach(s => supplierMap.set(s.id, s.name));

  logger.log(`[Stock] Carregados: ${allProducts.length} produtos, ${allVariants.length} variantes, ${allSupplierSources.length} sources`);

  const variantsByProduct = new Map<string, ExternalVariantStock[]>();
  allVariants.forEach(v => {
    if (!v.product_id) return;
    const existing = variantsByProduct.get(v.product_id) || [];
    existing.push(v);
    variantsByProduct.set(v.product_id, existing);
  });

  const sourcesByVariant = new Map<string, ExternalSupplierSource>();
  allSupplierSources.forEach(s => {
    if (!s.variant_id) return;
    const existing = sourcesByVariant.get(s.variant_id);
    if (!existing || (s.updated_at && existing.updated_at && s.updated_at > existing.updated_at)) {
      sourcesByVariant.set(s.variant_id, s);
    }
  });

  const futureEntries: FutureStockEntry[] = [];

  if (allProducts.length === 0) {
    return { productStocks: [], alerts: [], futureStock: [] };
  }

  const summaries = allProducts.map((product) => buildProductSummary(
    product,
    variantsByProduct,
    sourcesByVariant,
    categoryMap,
    supplierMap,
    futureEntries,
  ));

  const alerts = generateStockAlerts(summaries);
  logger.log(`[Stock] Processados ${summaries.length} produtos com ${futureEntries.length} previsões`);
  return { productStocks: summaries, alerts, futureStock: futureEntries };
}
