export interface SourceItem {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  variant_id: string | null;
  color_name: string | null;
  color_hex: string | null;
  size_code: string | null;
  personalization_snapshot: Record<string, unknown> | unknown[] | null;
  unit_price?: number | null;
}

export interface ReorderPersonalizationRequest {
  techniqueId: string;
  colors?: number;
  width?: number | null;
  height?: number | null;
}

/** Erro de regra comercial seguro para apresentar a quem iniciou a recompra. */
export class ReorderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReorderValidationError";
  }
}

export interface VerifiedReorderItem {
  source_order_item_id: string;
  product_id: string;
  product_sku: string | null;
  product_name: string;
  product_image_url: string | null;
  quantity: number;
  unit_price: number;
  minimum_quantity: number;
  available_stock: number;
  historical_unit_price: number | null;
  price_changed: boolean;
  stock_is_reserved: false;
  source_variant_id: string | null;
  source_variant_sku: string | null;
  color_name: string | null;
  color_hex: string | null;
  size_code: string | null;
  catalog_checked_at: string;
  catalog_valid_until: string;
}

function optionalPositiveNumber(value: unknown, field: string): number | undefined {
  if (value == null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new ReorderValidationError(`A ${field} da personalização histórica é inválida.`);
  return parsed;
}

export function personalizationRequestsFromSnapshot(snapshot: SourceItem['personalization_snapshot']): ReorderPersonalizationRequest[] {
  if (snapshot == null) return [];
  let entries: unknown[];
  if (Array.isArray(snapshot)) entries = snapshot;
  else if (typeof snapshot === 'object' && Array.isArray(snapshot.personalizations)) entries = snapshot.personalizations;
  else if (typeof snapshot === 'object' && Object.keys(snapshot).length === 0) return [];
  else entries = [snapshot];

  return entries.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new ReorderValidationError('A personalização histórica está incompleta e precisa ser revisada.');
    }
    const raw = entry as Record<string, unknown>;
    const techniqueId = raw.techniqueId ?? raw.technique_id ?? raw.area_id;
    if (typeof techniqueId !== 'string' || !techniqueId.trim()) {
      throw new ReorderValidationError('A técnica da personalização histórica precisa ser revisada.');
    }
    const colorsValue = optionalPositiveNumber(raw.colors ?? raw.colors_count ?? raw.num_cores, 'quantidade de cores');
    if (colorsValue !== undefined && !Number.isInteger(colorsValue)) {
      throw new ReorderValidationError('A quantidade de cores da personalização histórica é inválida.');
    }
    return {
      techniqueId: techniqueId.trim(),
      colors: colorsValue,
      width: optionalPositiveNumber(raw.width ?? raw.width_cm ?? raw.largura_cm, 'largura'),
      height: optionalPositiveNumber(raw.height ?? raw.height_cm ?? raw.altura_cm, 'altura'),
    };
  });
}

export interface CatalogProduct {
  id: string;
  name: string;
  sku: string | null;
  sale_price: number | null;
  base_price?: number | null;
  primary_image_url: string | null;
  image_url?: string | null;
  is_active: boolean | null;
  active?: boolean | null;
  stock_quantity: number | null;
  min_quantity: number | null;
  min_order_quantity?: number | null;
  is_stockout?: boolean | null;
  last_stock_update_at?: string | null;
  price_updated_at?: string | null;
  price_verified_at?: string | null;
  price_last_verified_at?: string | null;
  price_freshness_threshold_days?: number | null;
}

export interface CatalogVariant {
  id: string;
  product_id: string;
  sku: string | null;
  sale_price: number | null;
  color_name: string | null;
  color_hex: string | null;
  size_code: string | null;
  stock_quantity: number | null;
  selected_thumbnail: string | null;
  is_active: boolean | null;
}

interface ResolvedItem {
  source: SourceItem;
  product: CatalogProduct;
  variant?: CatalogVariant;
  quantity: number;
  minimum: number;
  stock: number;
  price: number;
  stockKey: string;
  historicalPrice: number | null;
}

const CATALOG_QUERY_VALIDITY_MS = 5 * 60 * 1000;

function catalogValidity(checkedAt: string): string {
  const checkedTime = new Date(checkedAt).getTime();
  if (!Number.isFinite(checkedTime)) {
    throw new ReorderValidationError('A data da consulta ao catálogo é inválida.');
  }
  return new Date(checkedTime + CATALOG_QUERY_VALIDITY_MS).toISOString();
}

function assertCatalogPriceFreshness(product: CatalogProduct, checkedAt: string): void {
  const rawTimestamp = product.price_last_verified_at
    ?? product.price_verified_at
    ?? product.price_updated_at;
  if (!rawTimestamp) return;

  const priceTime = new Date(rawTimestamp).getTime();
  const checkedTime = new Date(checkedAt).getTime();
  const thresholdDays = Number(product.price_freshness_threshold_days ?? 60);
  if (!Number.isFinite(priceTime) || !Number.isFinite(thresholdDays) || thresholdDays <= 0) {
    throw new ReorderValidationError(`A validade do preço de “${product.name}” está inconsistente no catálogo.`);
  }
  if (checkedTime - priceTime > thresholdDays * 24 * 60 * 60 * 1000) {
    throw new ReorderValidationError(`O preço de “${product.name}” venceu e precisa ser confirmado com o fornecedor.`);
  }
}

export function buildVerifiedReorderItems(
  items: SourceItem[],
  products: CatalogProduct[],
  variants: CatalogVariant[],
  checkedAt: string,
): VerifiedReorderItem[] {
  const validUntil = catalogValidity(checkedAt);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

  const resolved: ResolvedItem[] = items.map((source) => {
    const product = source.product_id ? productsById.get(source.product_id) : undefined;
    if (!product || product.is_active === false || product.active === false) {
      throw new ReorderValidationError(`O produto “${source.product_name}” não está mais disponível no catálogo.`);
    }
    assertCatalogPriceFreshness(product, checkedAt);

    const variant = source.variant_id ? variantsById.get(source.variant_id) : undefined;
    if (source.variant_id && (!variant || variant.product_id !== product.id || variant.is_active === false)) {
      throw new ReorderValidationError(`A variante de “${product.name}” não está mais disponível.`);
    }

    const quantity = Number(source.quantity);
    const minimum = Math.max(
      Number(product.min_quantity ?? 1),
      Number(product.min_order_quantity ?? 1),
    );
    const stock = Number(variant ? variant.stock_quantity : product.stock_quantity);
    const price = Number(variant?.sale_price ?? product.sale_price ?? product.base_price ?? 0);
    const historicalPrice = source.unit_price == null ? null : Number(source.unit_price);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new ReorderValidationError(`A quantidade de “${product.name}” é inválida.`);
    if (!Number.isFinite(price) || price <= 0) throw new ReorderValidationError(`O produto “${product.name}” está sem preço vigente.`);
    if (!Number.isFinite(minimum) || minimum <= 0) throw new ReorderValidationError(`A quantidade mínima de “${product.name}” é inválida.`);
    if (!Number.isFinite(stock) || stock < 0) throw new ReorderValidationError(`O estoque de “${product.name}” está inválido.`);
    if (product.is_stockout === true) throw new ReorderValidationError(`O produto “${product.name}” está indisponível no catálogo.`);
    if (historicalPrice !== null && (!Number.isFinite(historicalPrice) || historicalPrice < 0)) {
      throw new ReorderValidationError(`O preço histórico de “${product.name}” está inválido.`);
    }

    return {
      source,
      product,
      variant,
      quantity,
      minimum,
      stock,
      price,
      stockKey: variant ? `variant:${variant.id}` : `product:${product.id}`,
      historicalPrice,
    };
  });

  const demandByStock = new Map<string, { quantity: number; minimum: number; stock: number; name: string }>();
  for (const item of resolved) {
    const current = demandByStock.get(item.stockKey);
    if (current) current.quantity += item.quantity;
    else demandByStock.set(item.stockKey, {
      quantity: item.quantity,
      minimum: item.minimum,
      stock: item.stock,
      name: item.product.name,
    });
  }
  for (const demand of demandByStock.values()) {
    if (demand.quantity < demand.minimum) {
      throw new ReorderValidationError(`A quantidade mínima vigente de “${demand.name}” é ${demand.minimum}.`);
    }
    if (demand.quantity > demand.stock) throw new ReorderValidationError(`Estoque insuficiente para “${demand.name}”.`);
  }

  return resolved.map(({ source, product, variant, quantity, minimum, stock, price, historicalPrice }) => ({
    source_order_item_id: source.id,
    product_id: product.id,
    product_sku: variant?.sku || product.sku,
    product_name: product.name,
    product_image_url: variant?.selected_thumbnail || product.primary_image_url || product.image_url || null,
    quantity,
    unit_price: price,
    minimum_quantity: minimum,
    available_stock: stock,
    historical_unit_price: historicalPrice,
    price_changed: historicalPrice !== null && historicalPrice !== price,
    stock_is_reserved: false,
    source_variant_id: variant?.id || null,
    source_variant_sku: variant?.sku || null,
    color_name: variant?.color_name || source.color_name,
    color_hex: variant?.color_hex || source.color_hex,
    size_code: variant?.size_code || source.size_code,
    catalog_checked_at: checkedAt,
    catalog_valid_until: validUntil,
  }));
}
