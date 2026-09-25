import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invokeExternalDb } from '@/lib/external-db';

export interface QuoteStockItem {
  quote_id: string;
  product_id: string | null;
  quantity: number;
  source_variant_id: string | null;
}

export interface QuoteStockProduct {
  id: string;
  stock_quantity: number | null;
}

export interface QuoteStockVariant {
  id: string;
  product_id: string;
  stock_quantity: number | null;
}

export interface QuoteStockSupplierSource {
  variant_id: string;
  quantity: number | null;
  updated_at: string | null;
}

interface StockRequirement {
  quoteId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
}

interface StockIndexes {
  products: Map<string, QuoteStockProduct>;
  variantsById: Map<string, QuoteStockVariant>;
  variantsByProduct: Map<string, QuoteStockVariant[]>;
  sourcesByVariant: Map<string, QuoteStockSupplierSource>;
}

function nonNegative(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function requirementsFrom(items: QuoteStockItem[]): StockRequirement[] {
  const grouped = new Map<string, StockRequirement>();
  for (const item of items) {
    if (!item.product_id) continue;
    const variantId = item.source_variant_id;
    const key = `${item.quote_id}:${variantId ?? item.product_id}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += nonNegative(item.quantity);
      continue;
    }
    grouped.set(key, {
      quoteId: item.quote_id,
      productId: item.product_id,
      variantId,
      quantity: nonNegative(item.quantity),
    });
  }
  return [...grouped.values()];
}

function groupVariants(variants: QuoteStockVariant[]): Map<string, QuoteStockVariant[]> {
  const result = new Map<string, QuoteStockVariant[]>();
  for (const variant of variants) {
    result.set(variant.product_id, [...(result.get(variant.product_id) ?? []), variant]);
  }
  return result;
}

function latestSourceByVariant(sources: QuoteStockSupplierSource[]): Map<string, QuoteStockSupplierSource> {
  const result = new Map<string, QuoteStockSupplierSource>();
  for (const source of sources) {
    const current = result.get(source.variant_id);
    if (!current || (source.updated_at ?? '') > (current.updated_at ?? '')) result.set(source.variant_id, source);
  }
  return result;
}

function stockForVariant(variant: QuoteStockVariant, sources: Map<string, QuoteStockSupplierSource>): number {
  const source = sources.get(variant.id);
  return source ? nonNegative(source.quantity) : nonNegative(variant.stock_quantity);
}

function availableForRequirement(
  requirement: StockRequirement,
  indexes: StockIndexes,
): number {
  if (requirement.variantId) {
    const variant = indexes.variantsById.get(requirement.variantId);
    return variant ? stockForVariant(variant, indexes.sourcesByVariant) : 0;
  }
  const variants = indexes.variantsByProduct.get(requirement.productId) ?? [];
  if (variants.length > 0) return variants.reduce((total, variant) => total + stockForVariant(variant, indexes.sourcesByVariant), 0);
  return nonNegative(indexes.products.get(requirement.productId)?.stock_quantity);
}

/** Calcula riscos usando somente estoque e variantes retornados pelo catálogo. */
export function calculateQuoteStockIssues(
  items: QuoteStockItem[],
  products: QuoteStockProduct[],
  variants: QuoteStockVariant[],
  sources: QuoteStockSupplierSource[],
): Record<string, boolean> {
  const indexes: StockIndexes = {
    products: new Map(products.map((product) => [product.id, product])),
    variantsById: new Map(variants.map((variant) => [variant.id, variant])),
    variantsByProduct: groupVariants(variants),
    sourcesByVariant: latestSourceByVariant(sources),
  };
  const issues: Record<string, boolean> = {};

  for (const requirement of requirementsFrom(items)) {
    const available = availableForRequirement(requirement, indexes);
    if (requirement.quantity > available) issues[requirement.quoteId] = true;
  }
  return issues;
}

export function useQuotesStockStatus(quoteIds: string[]) {
  const sortedQuoteIds = [...new Set(quoteIds)].sort();
  return useQuery({
    queryKey: ['quotes-stock-status', sortedQuoteIds],
    enabled: sortedQuoteIds.length > 0,
    queryFn: async () => {
      const { data: items, error } = await supabase
        .from('quote_items')
        .select('quote_id,product_id,quantity,source_variant_id')
        .in('quote_id', sortedQuoteIds);
      if (error) throw error;

      const stockItems = (items ?? []) as QuoteStockItem[];
      const productIds = [...new Set(stockItems.flatMap((item) => item.product_id ? [item.product_id] : []))];
      if (productIds.length === 0) return {};

      const [productsResult, variantsResult] = await Promise.all([
        invokeExternalDb<QuoteStockProduct>({
          table: 'products', operation: 'select', select: 'id,stock_quantity', filters: { id: productIds }, limit: productIds.length,
        }),
        invokeExternalDb<QuoteStockVariant>({
          table: 'product_variants', operation: 'select', select: 'id,product_id,stock_quantity', filters: { product_id: productIds }, limit: 500,
        }),
      ]);
      const variantIds = (variantsResult.records ?? []).map((variant) => variant.id);
      const sourcesResult = variantIds.length > 0
        ? await invokeExternalDb<QuoteStockSupplierSource>({
          table: 'variant_supplier_sources', operation: 'select', select: 'variant_id,quantity,updated_at', filters: { variant_id: variantIds, is_active: true }, limit: 1_500,
        })
        : { records: [] };

      return calculateQuoteStockIssues(
        stockItems,
        productsResult.records ?? [],
        variantsResult.records ?? [],
        sourcesResult.records ?? [],
      );
    },
    staleTime: 60_000,
  });
}
