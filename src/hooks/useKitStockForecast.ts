/**
 * useKitStockForecast — calcula uma data segura de fechamento do kit a partir
 * do estoque atual e das entradas futuras realmente cadastradas por variante.
 */
import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';
import type { KitItem } from '@/lib/kit-builder';

export interface KitStockForecast {
  idealClosingDate: string | null;
  bufferDays: number;
  itemsAtRisk: Array<{
    itemId: string;
    itemName: string;
    deficit: number;
    nextEntryDate: string | null;
    nextEntryQty: number;
    coveredByForecast: boolean;
  }>;
  ready: boolean;
  hasCompleteReplenishmentForecast: boolean;
}

export interface ForecastProduct { id: string; stock_quantity: number | null }
export interface ForecastVariant { id: string; product_id: string; stock_quantity: number | null }
export interface ForecastSupplierSource {
  variant_id: string;
  next_quantity_1: number | null;
  next_date_1: string | null;
  next_quantity_2: number | null;
  next_date_2: string | null;
  next_quantity_3: number | null;
  next_date_3: string | null;
}

export function kitStockForecastQueryKey(items: KitItem[], kitQuantity: number): readonly string[] {
  const itemSignature = items
    .map((item) => `${item.id}:${item.selectedVariantId ?? "produto"}:${item.quantity}`)
    .sort((left, right) => left.localeCompare(right))
    .join("|");
  return ['kit-stock-forecast', itemSignature, String(kitQuantity)];
}

const BUFFER_DAYS = 3;

interface Requirement {
  itemId: string;
  itemName: string;
  productId: string;
  variantId?: string;
  required: number;
}

interface ForecastData {
  products: ForecastProduct[];
  variants: ForecastVariant[];
  sources: ForecastSupplierSource[];
}

interface SupplyEntry { date: string; quantity: number }

interface ForecastIndexes {
  productsById: Map<string, ForecastProduct>;
  variantsById: Map<string, ForecastVariant>;
  variantsByProduct: Map<string, ForecastVariant[]>;
  sourcesByVariant: Map<string, ForecastSupplierSource[]>;
}

interface RiskCalculation {
  item: KitStockForecast['itemsAtRisk'][number];
  coverageDate: string | null;
}

function nonNegativeNumber(value: unknown): number {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
}

function isIsoDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function sourceEntries(source: ForecastSupplierSource): SupplyEntry[] {
  const pairs = [
    [source.next_date_1, source.next_quantity_1],
    [source.next_date_2, source.next_quantity_2],
    [source.next_date_3, source.next_quantity_3],
  ] as const;

  return pairs.flatMap(([date, quantity]) => isIsoDate(date) && nonNegativeNumber(quantity) > 0
    ? [{ date, quantity: nonNegativeNumber(quantity) }]
    : []);
}

function aggregateEntries(entries: SupplyEntry[]): SupplyEntry[] {
  const quantitiesByDate = new Map<string, number>();
  for (const entry of entries) {
    quantitiesByDate.set(entry.date, (quantitiesByDate.get(entry.date) ?? 0) + entry.quantity);
  }
  return [...quantitiesByDate.entries()]
    .map(([date, quantity]) => ({ date, quantity }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function buildRequirements(items: KitItem[], kitQuantity: number): Requirement[] {
  const requirements = new Map<string, Requirement>();
  for (const item of items) {
    const variantId = item.selectedVariantId;
    const key = variantId ? `variant:${variantId}` : `product:${item.id}`;
    const previous = requirements.get(key);
    if (previous) {
      previous.required += nonNegativeNumber(item.quantity) * nonNegativeNumber(kitQuantity);
      continue;
    }
    requirements.set(key, {
      itemId: item.id,
      itemName: item.name,
      productId: item.id,
      variantId,
      required: nonNegativeNumber(item.quantity) * nonNegativeNumber(kitQuantity),
    });
  }
  return [...requirements.values()];
}

function groupBy<T>(items: T[], keyFor: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFor(item);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  return grouped;
}

function createIndexes({ products, variants, sources }: ForecastData): ForecastIndexes {
  return {
    productsById: new Map(products.map((product) => [product.id, product])),
    variantsById: new Map(variants.map((variant) => [variant.id, variant])),
    variantsByProduct: groupBy(variants, (variant) => variant.product_id),
    sourcesByVariant: groupBy(sources, (source) => source.variant_id),
  };
}

function applicableVariants(requirement: Requirement, indexes: ForecastIndexes): ForecastVariant[] {
  if (!requirement.variantId) return indexes.variantsByProduct.get(requirement.productId) ?? [];
  const variant = indexes.variantsById.get(requirement.variantId);
  return variant ? [variant] : [];
}

function currentStock(requirement: Requirement, variants: ForecastVariant[], indexes: ForecastIndexes): number {
  if (requirement.variantId) return nonNegativeNumber(indexes.variantsById.get(requirement.variantId)?.stock_quantity);
  if (variants.length > 0) return variants.reduce((total, variant) => total + nonNegativeNumber(variant.stock_quantity), 0);
  return nonNegativeNumber(indexes.productsById.get(requirement.productId)?.stock_quantity);
}

function futureEntries(variants: ForecastVariant[], indexes: ForecastIndexes): SupplyEntry[] {
  return aggregateEntries(variants.flatMap((variant) =>
    (indexes.sourcesByVariant.get(variant.id) ?? []).flatMap(sourceEntries),
  ));
}

function calculateRisk(requirement: Requirement, indexes: ForecastIndexes): RiskCalculation | null {
  const variants = applicableVariants(requirement, indexes);
  const availableNow = currentStock(requirement, variants, indexes);
  const deficit = Math.max(0, requirement.required - availableNow);
  if (deficit === 0) return null;

  const entries = futureEntries(variants, indexes);
  let available = availableNow;
  let coverageDate: string | null = null;
  for (const entry of entries) {
    available += entry.quantity;
    if (available >= requirement.required) {
      coverageDate = entry.date;
      break;
    }
  }
  return {
    coverageDate,
    item: {
      itemId: requirement.itemId,
      itemName: requirement.itemName,
      deficit,
      nextEntryDate: entries[0]?.date ?? null,
      nextEntryQty: entries[0]?.quantity ?? 0,
      coveredByForecast: Boolean(coverageDate),
    },
  };
}

/** Exportada para que a regra de disponibilidade seja testada sem rede. */
export function calculateKitStockForecast(
  items: KitItem[],
  kitQuantity: number,
  { products, variants, sources }: ForecastData,
): KitStockForecast {
  const itemsAtRisk: KitStockForecast['itemsAtRisk'] = [];
  let latestCoverageDate: string | null = null;
  const indexes = createIndexes({ products, variants, sources });
  for (const requirement of buildRequirements(items, kitQuantity)) {
    const risk = calculateRisk(requirement, indexes);
    if (!risk) continue;
    itemsAtRisk.push(risk.item);
    if (risk.coverageDate && (!latestCoverageDate || risk.coverageDate > latestCoverageDate)) {
      latestCoverageDate = risk.coverageDate;
    }
  }

  const hasCompleteReplenishmentForecast = itemsAtRisk.every((item) => item.coveredByForecast);
  return {
    idealClosingDate: hasCompleteReplenishmentForecast && latestCoverageDate
      ? addDays(latestCoverageDate, BUFFER_DAYS)
      : null,
    bufferDays: BUFFER_DAYS,
    itemsAtRisk,
    ready: itemsAtRisk.length === 0,
    hasCompleteReplenishmentForecast,
  };
}

export function useKitStockForecast(items: KitItem[], kitQuantity: number) {
  const productIds = [...new Set(items.map((item) => item.id).filter(Boolean))].sort();
  return useQuery({
    queryKey: kitStockForecastQueryKey(items, kitQuantity),
    queryFn: async (): Promise<KitStockForecast> => {
      if (productIds.length === 0) {
        return { idealClosingDate: null, bufferDays: BUFFER_DAYS, itemsAtRisk: [], ready: true, hasCompleteReplenishmentForecast: true };
      }

      const [productsResult, variantsResult] = await Promise.all([
        invokeExternalDb<ForecastProduct>({
          table: 'products', operation: 'select', select: 'id,stock_quantity',
          filters: { id: productIds, is_active: true }, limit: productIds.length,
        }),
        invokeExternalDb<ForecastVariant>({
          table: 'product_variants', operation: 'select', select: 'id,product_id,stock_quantity',
          filters: { product_id: productIds, is_active: true }, limit: 500,
        }),
      ]);
      const variantIds = (variantsResult.records ?? []).map((variant) => variant.id);
      const sourcesResult = variantIds.length > 0
        ? await invokeExternalDb<ForecastSupplierSource>({
          table: 'variant_supplier_sources', operation: 'select',
          select: 'variant_id,next_quantity_1,next_date_1,next_quantity_2,next_date_2,next_quantity_3,next_date_3',
          filters: { variant_id: variantIds, is_active: true }, limit: 1_500,
        })
        : { records: [] };

      return calculateKitStockForecast(items, kitQuantity, {
        products: productsResult.records ?? [],
        variants: variantsResult.records ?? [],
        sources: sourcesResult.records ?? [],
      });
    },
    enabled: productIds.length > 0 && kitQuantity > 0,
    staleTime: 2 * 60 * 1000,
  });
}
