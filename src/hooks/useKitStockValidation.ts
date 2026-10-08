/**
 * Hook para validação de estoque dos itens do Kit Builder
 * Consulta o banco externo para verificar disponibilidade
 */

import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db/bridge';
import type { KitItem, KitBox } from '@/lib/kit-builder/types';

export interface StockAlert {
  itemId: string;
  itemName: string;
  sku: string;
  required: number;
  available: number;
  deficit: number;
  isBox?: boolean;
  reason?: 'insufficient_stock' | 'variant_required';
}

interface VariantStock {
  id: string;
  product_id: string;
  stock_quantity: number | null;
  color_name: string | null;
}

interface ProductStock {
  id: string;
  stock_quantity: number | null;
}

interface StockData {
  variants: VariantStock[];
  products: ProductStock[];
}

interface StockMaps {
  byProduct: Map<string, number>;
  byVariant: Map<string, number>;
}

function initialProductStock(stockData?: StockData): Map<string, number> {
  const stock = new Map<string, number>();
  for (const product of stockData?.products ?? []) stock.set(product.id, product.stock_quantity ?? 0);
  return stock;
}

function addVariantStock(maps: StockMaps, initialized: Set<string>, variant: VariantStock): void {
  if (!initialized.has(variant.product_id)) {
    initialized.add(variant.product_id);
    maps.byProduct.set(variant.product_id, 0);
  }
  maps.byProduct.set(variant.product_id, (maps.byProduct.get(variant.product_id) || 0) + (variant.stock_quantity ?? 0));
  maps.byVariant.set(variant.id, variant.stock_quantity ?? 0);
}

function buildStockMaps(stockData?: StockData): StockMaps {
  const maps: StockMaps = { byProduct: initialProductStock(stockData), byVariant: new Map() };
  const initializedProducts = new Set<string>();
  for (const variant of stockData?.variants ?? []) addVariantStock(maps, initializedProducts, variant);
  return maps;
}

function boxStockAlert(box: KitBox | null, quantity: number, stock: Map<string, number>): StockAlert | null {
  if (!box) return null;
  const available = stock.get(box.id) ?? 0;
  if (available >= quantity) return null;
  return { itemId: box.id, itemName: box.name, sku: box.sku, required: quantity, available, deficit: quantity - available, isBox: true };
}

function missingVariantAlert(item: KitItem, required: number): StockAlert | null {
  const requiresVariant = Boolean(item.isReplaceable && item.allowedVariantIds?.length);
  if (!requiresVariant || item.selectedVariantId) return null;
  return { itemId: item.id, itemName: item.name, sku: item.sku, required, available: 0, deficit: required, reason: 'variant_required' };
}

function itemStockKey(item: KitItem): string {
  return item.selectedVariantId ? `variant:${item.selectedVariantId}` : `product:${item.id}`;
}

function itemAvailableStock(item: KitItem, maps: StockMaps): number {
  return item.selectedVariantId ? maps.byVariant.get(item.selectedVariantId) ?? 0 : maps.byProduct.get(item.id) ?? 0;
}

function addItemRequirement(requirements: Map<string, StockAlert>, item: KitItem, required: number, maps: StockMaps): void {
  const key = itemStockKey(item);
  const previous = requirements.get(key);
  if (previous) {
    previous.required += required;
    previous.deficit = Math.max(0, previous.required - previous.available);
    return;
  }
  const available = itemAvailableStock(item, maps);
  requirements.set(key, { itemId: item.id, itemName: item.name, sku: item.sku, required, available, deficit: Math.max(0, required - available), reason: 'insufficient_stock' });
}

function buildStockAlerts(input: { items: KitItem[]; box: KitBox | null; kitQuantity: number; maps: StockMaps; hasData: boolean }): StockAlert[] {
  if (!input.hasData) return [];
  const alerts: StockAlert[] = [];
  const boxAlert = boxStockAlert(input.box, input.kitQuantity, input.maps.byProduct);
  if (boxAlert) alerts.push(boxAlert);
  const requirements = new Map<string, StockAlert>();
  for (const item of input.items) {
    const required = item.quantity * input.kitQuantity;
    const variantAlert = missingVariantAlert(item, required);
    if (variantAlert) alerts.push(variantAlert);
    else addItemRequirement(requirements, item, required, input.maps);
  }
  alerts.push(...Array.from(requirements.values()).filter(requirement => requirement.deficit > 0));
  return alerts;
}

export function useKitStockValidation(
  items: KitItem[],
  box: KitBox | null,
  kitQuantity: number
) {
  const productIds = [...new Set([
    ...(box ? [box.id] : []),
    ...items.map(i => i.id),
  ])].sort();
  const selectedVariantIds = [...new Set(items
    .map(item => item.selectedVariantId)
    .filter((id): id is string => Boolean(id)))].sort();

  const { data: stockData, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['kit-stock-validation', productIds.join(','), selectedVariantIds.join(',')],
    queryFn: async () => {
      if (productIds.length === 0) return { variants: [], products: [] };

      const [variantResult, productResult] = await Promise.all([
        invokeExternalDb<VariantStock>({
          table: 'product_variants',
          operation: 'select',
          select: 'id, product_id, stock_quantity, color_name',
          filters: { product_id: productIds, is_active: true },
          limit: 500,
        }),
        invokeExternalDb<ProductStock>({
          table: 'products',
          operation: 'select',
          select: 'id, stock_quantity',
          filters: { id: productIds, is_active: true },
          limit: productIds.length,
        }),
      ]);

      return {
        variants: variantResult.records ?? [],
        products: productResult.records ?? [],
      };
    },
    enabled: productIds.length > 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const stockMaps = buildStockMaps(stockData);
  const alerts = buildStockAlerts({ items, box, kitQuantity, maps: stockMaps, hasData: Boolean(stockData) });

  return {
    alerts,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
    stockByProduct: stockMaps.byProduct,
    hasStockIssues: alerts.length > 0,
  };
}
