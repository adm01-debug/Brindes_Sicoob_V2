/**
 * stockAlerts — Geração de alertas de estoque extraída do useVariantStock
 */
import type { ProductStockSummary, StockAlert, VariantStock } from '@/types/stock';

type AlertBase = Pick<StockAlert, 'productId' | 'productName' | 'productSku' | 'variantId' | 'colorName' | 'currentStock' | 'threshold' | 'createdAt'>;

const STATUS_ALERTS: Partial<Record<VariantStock['status'], {
  suffix: string;
  type: StockAlert['type'];
  severity: StockAlert['severity'];
  title: string;
  message: (variant: VariantStock) => string;
  action: string;
}>> = {
  out_of_stock: { suffix: 'out', type: 'out_of_stock', severity: 'error', title: 'Sem Estoque', message: variant => `${variant.colorName || 'Variação'} está sem estoque!`, action: 'Fazer pedido ao fornecedor' },
  critical: { suffix: 'critical', type: 'critical', severity: 'error', title: 'Estoque Crítico', message: variant => `${variant.colorName || 'Variação'}: apenas ${variant.currentStock} unidades (mínimo: ${variant.minStock})`, action: 'Reabastecer urgentemente' },
  low_stock: { suffix: 'low', type: 'low_stock', severity: 'warning', title: 'Estoque Baixo', message: variant => `${variant.colorName || 'Variação'}: ${variant.currentStock}/${variant.minStock} mínimo`, action: 'Planejar reposição' },
};

function alertBase(product: ProductStockSummary, variant: VariantStock): AlertBase {
  return {
    productId: product.productId,
    productName: product.productName,
    productSku: product.productSku,
    variantId: variant.variantId,
    colorName: variant.colorName,
    currentStock: variant.currentStock,
    threshold: variant.minStock,
    createdAt: new Date().toISOString(),
  };
}

function statusAlert(product: ProductStockSummary, variant: VariantStock): StockAlert | null {
  const config = STATUS_ALERTS[variant.status];
  if (!config) return null;
  return {
    id: `alert-${variant.id}-${config.suffix}`,
    type: config.type,
    severity: config.severity,
    title: config.title,
    message: config.message(variant),
    suggestedAction: config.action,
    ...alertBase(product, variant),
  };
}

function predictedAlert(product: ProductStockSummary, variant: VariantStock): StockAlert | null {
  const days = variant.daysUntilStockout;
  if (days === undefined || days > 15 || variant.status === 'out_of_stock') return null;
  const critical = days <= 7;
  return {
    id: `alert-${variant.id}-${critical ? 'predict-critical' : 'predict-warning'}`,
    type: 'stockout_predicted',
    severity: critical ? 'error' : 'warning',
    title: critical ? 'Esgotamento Iminente' : 'Esgotamento Próximo',
    message: `${variant.colorName || 'Variação'} deve esgotar em ${days} dias${critical ? '!' : ''}`,
    suggestedAction: critical ? 'Fazer pedido IMEDIATAMENTE' : 'Planejar reposição',
    ...alertBase(product, variant),
  };
}

function variantAlerts(product: ProductStockSummary, variant: VariantStock): StockAlert[] {
  return [statusAlert(product, variant), predictedAlert(product, variant)].filter((alert): alert is StockAlert => alert !== null);
}

export function generateStockAlerts(products: ProductStockSummary[]): StockAlert[] {
  const alerts = products.flatMap(product => product.variants.flatMap(variant => variantAlerts(product, variant)));
  return alerts.sort((a, b) => {
    const severityOrder = { error: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
