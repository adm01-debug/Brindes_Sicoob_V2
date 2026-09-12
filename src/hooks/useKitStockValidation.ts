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

export function useKitStockValidation(
  items: KitItem[],
  box: KitBox | null,
  kitQuantity: number
) {
  const productIds = [
    ...(box ? [box.id] : []),
    ...items.map(i => i.id),
  ];
  const selectedVariantIds = items
    .map(item => item.selectedVariantId)
    .filter((id): id is string => Boolean(id));

  const { data: stockData, isLoading, error } = useQuery({
    queryKey: ['kit-stock-validation', productIds.join(','), selectedVariantIds.join(',')],
    queryFn: async () => {
      if (productIds.length === 0) return [];

      const result = await invokeExternalDb<VariantStock>({
        table: 'product_variants',
        operation: 'select',
        select: 'id, product_id, stock_quantity, color_name',
        filters: { product_id: productIds, is_active: true },
        limit: 500,
      });

      return result.records;
    },
    enabled: productIds.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // O resumo por produto atende caixas e cards. Para itens com uma variante
  // selecionada, a disponibilidade abaixo usa exclusivamente o SKU escolhido.
  const stockByProduct = new Map<string, number>();
  const stockByVariant = new Map<string, number>();
  if (stockData) {
    for (const v of stockData) {
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

    // Itens substituíveis precisam de uma variante explícita. Somar cores ou
    // tamanhos diferentes mascara a indisponibilidade do SKU pedido.
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

      const available = item.selectedVariantId
        ? (stockByVariant.get(item.selectedVariantId) ?? 0)
        : (stockByProduct.get(item.id) ?? 0);
      if (available < required) {
        alerts.push({
          itemId: item.id,
          itemName: item.name,
          sku: item.sku,
          required,
          available,
          deficit: required - available,
          reason: 'insufficient_stock',
        });
      }
    }
  }

  return {
    alerts,
    isLoading,
    error,
    stockByProduct,
    hasStockIssues: alerts.length > 0,
  };
}
