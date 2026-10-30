export interface QuoteCatalogProduct {
  id: string;
  name: string;
  sku: string | null;
  sale_price: number | string | null;
  cost_price?: number | string | null;
  primary_image_url?: string | null;
  is_active: boolean | null;
}

export interface QuoteCatalogVariant {
  id: string;
  product_id: string;
  sku: string | null;
  sale_price: number | string | null;
  cost_price?: number | string | null;
  color_name?: string | null;
  color_hex?: string | null;
  size_code?: string | null;
  selected_thumbnail?: string | null;
  is_active: boolean | null;
}

export interface AttestableQuoteItem {
  product_id: string;
  product_name: string;
  product_sku?: string | null;
  product_image_url?: string | null;
  source_variant_id?: string | null;
  source_variant_sku?: string | null;
  color_name?: string | null;
  color_hex?: string | null;
  size_code?: string | null;
  quantity: number;
  unit_price: number;
  unit_cost?: number | null;
  personalizations?: Array<Record<string, unknown>> | null;
}

export interface VerifiedSnapshot {
  product_id: string;
  source_variant_id: string | null;
  unit_price: number;
  unit_cost: number;
}

function money(value: unknown, label: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} indisponível no catálogo.`);
  return Math.round(parsed * 100) / 100;
}

function sameMoney(left: unknown, right: number): boolean {
  const parsed = typeof left === 'number' ? left : Number(left);
  return Number.isFinite(parsed) && Math.abs(parsed - right) <= 0.005;
}

function fallbackCost(price: number): number {
  return Math.round(price * 70) / 100;
}

export function verifyQuoteCatalogItem(
  item: AttestableQuoteItem,
  product: QuoteCatalogProduct | undefined,
  variant: QuoteCatalogVariant | undefined,
  previous: VerifiedSnapshot | undefined,
): { unitPrice: number; unitCost: number; snapshotPreserved: boolean } {
  if (!product || product.is_active !== true || product.id !== item.product_id) {
    throw new Error('Um produto do orçamento não está ativo no catálogo vigente.');
  }

  const variantId = item.source_variant_id || null;
  if (variantId && (!variant || variant.product_id !== product.id || variant.is_active !== true)) {
    throw new Error('A variante do orçamento não pertence a um produto ativo do catálogo.');
  }

  const sourcePrice = money(variant?.sale_price ?? product.sale_price, 'Preço unitário');
  const sourceCostValue = variant?.cost_price ?? product.cost_price;
  const sourceCost = sourceCostValue == null
    ? fallbackCost(sourcePrice)
    : money(sourceCostValue, 'Custo unitário');

  const unchangedSnapshot = Boolean(
    previous
    && previous.product_id === product.id
    && previous.source_variant_id === variantId
    && sameMoney(item.unit_price, previous.unit_price)
    && sameMoney(item.unit_cost, previous.unit_cost)
  );
  const unitPrice = unchangedSnapshot ? previous.unit_price : sourcePrice;
  const unitCost = unchangedSnapshot ? previous.unit_cost : sourceCost;

  if (!sameMoney(item.unit_price, unitPrice) || !sameMoney(item.unit_cost, unitCost)) {
    throw new Error('Preço ou custo do item diverge do catálogo. Atualize o preço ou use o desconto comercial aprovado.');
  }
  if (item.product_name.trim() !== product.name.trim()) {
    throw new Error('O nome do produto diverge do catálogo vigente. Atualize o item antes de salvar.');
  }
  if (variantId && item.source_variant_sku !== variant?.sku) {
    throw new Error('O SKU da variante diverge do catálogo vigente. Atualize o item antes de salvar.');
  }

  return { unitPrice, unitCost, snapshotPreserved: unchangedSnapshot };
}
