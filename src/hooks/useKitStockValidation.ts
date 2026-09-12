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
          filters: { id: productIds, active: true },
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

  // O resumo por produto atende caixas e cards. Para itens com uma variante
  // selecionada, a disponibilidade abaixo usa exclusivamente o SKU escolhido.
  const stockByProduct = new Map<string, number>();
  const stockByVariant = new Map<string, number>();
  if (stockData) {
    for (const product of stockData.products) {
      stockByProduct.set(product.id, product.stock_quantity ?? 0);
    }
    const productsWithVariants = new Set<string>();
    for (const v of stockData.variants) {
      if (!productsWithVariants.has(v.product_id)) {
        productsWithVariants.add(v.product_id);
        stockByProduct.set(v.product_id, 0);
      }
      const current = stockByProduct.get(v.product_id) || 0;
      stockByProduct.set(v.product_id, current + (v.stock_quantity ?? 0));
      stockByVariant.set(v.id, v.stock_quantity ?? 0);
    }
  }

  // Build alerts
  const alerts: StockAlert[] = [];

  if (stockData) {
    // Check box stock
    if (box) {
      const available = stockByProduct.get(box.id) ?? 0;
      const required = kitQuantity;
      if (available < required) {
        alerts.push({
          itemId: box.id,
          itemName: box.name,
          sku: box.sku,
          required,
          available,
          deficit: required - available,
          isBox: true,
        });
      }
    }

    // Itens substituíveis precisam de uma variante explícita. A necessidade é
    // agregada por SKU estocável para que duas linhas nunca reutilizem o mesmo
    // saldo como se fossem pedidos independentes.
    const requiredByStockKey = new Map<string, StockAlert>();
    for (const item of items) {
      const required = item.quantity * kitQuantity;
      const requiresVariant = Boolean(item.isReplaceable && item.allowedVariantIds?.length);

      if (requiresVariant && !item.selectedVariantId) {
        alerts.push({
          itemId: item.id,
          itemName: item.name,
          sku: item.sku,
          required,
          available: 0,
          deficit: required,
          reason: 'variant_required',
        });
        continue;
      }

      const stockKey = item.selectedVariantId
        ? `variant:${item.selectedVariantId}`
        : `product:${item.id}`;
      const previous = requiredByStockKey.get(stockKey);
      if (previous) {
        previous.required += required;
        previous.deficit = Math.max(0, previous.required - previous.available);
      } else {
        const available = item.selectedVariantId
          ? (stockByVariant.get(item.selectedVariantId) ?? 0)
          : (stockByProduct.get(item.id) ?? 0);
        requiredByStockKey.set(stockKey, {
          itemId: item.id,
          itemName: item.name,
          sku: item.sku,
          required,
          available,
          deficit: Math.max(0, required - available),
          reason: 'insufficient_stock',
        });
      }
    }

    for (const requirement of requiredByStockKey.values()) {
      if (requirement.deficit > 0) alerts.push(requirement);
    }
  }

  return {
    alerts,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
    stockByProduct,
    hasStockIssues: alerts.length > 0,
  };
}
