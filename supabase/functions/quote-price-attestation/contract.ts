export interface QuoteCatalogProduct {
  id: string;
  name: string;
  sku: string | null;
  sale_price: number | string | null;
  cost_price?: number | string | null;
  primary_image_url?: string | null;
  images?: unknown[] | null;
  is_active: boolean | null;
}

export interface QuoteCatalogVariant {
  id: string;
  product_id: string;
  sku: string | null;
  supplier_sku?: string | null;
  sale_price: number | string | null;
  color_name?: string | null;
  color_hex?: string | null;
  size_code?: string | null;
  selected_thumbnail?: string | null;
  images?: unknown[] | null;
  catalog_image_urls?: string[];
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
  gender?: string | null;
  kit_group_id?: string | null;
  kit_name?: string | null;
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
  quantity?: number;
  product_name?: string;
  product_sku?: string | null;
  product_image_url?: string | null;
  source_variant_sku?: string | null;
  color_name?: string | null;
  color_hex?: string | null;
  size_code?: string | null;
  gender?: string | null;
  kit_group_id?: string | null;
  kit_name?: string | null;
}

export async function readBoundedBody(request: Request, maxBytes: number): Promise<string | null> {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

export function unwrapSuccessfulRpcEnvelope(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const envelope = value as Record<string, unknown>;
  if (envelope.success !== true || !Object.prototype.hasOwnProperty.call(envelope, 'data')) return value;
  return unwrapSuccessfulRpcEnvelope(envelope.data);
}

function money(value: unknown, label: string): number {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) {
    throw new Error(`${label} indisponível no catálogo.`);
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} indisponível no catálogo.`);
  return Math.round(parsed * 100) / 100;
}

function exactMoney(left: unknown, right: number): boolean {
  if (left === null || left === undefined || (typeof left === 'string' && !left.trim())) return false;
  const parsed = typeof left === 'number' ? left : Number(left);
  return Number.isFinite(parsed) && parsed === right;
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function imageUrls(values: unknown[]): string[] {
  return values.flatMap((value) => {
    if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const row = value as Record<string, unknown>;
    const candidate = [row.url, row.src, row.image_url].find(
      (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0,
    );
    return candidate ? [candidate.trim()] : [];
  });
}

export function isQuoteCatalogSnapshotUnchanged(
  item: AttestableQuoteItem,
  previous: VerifiedSnapshot | undefined,
): previous is VerifiedSnapshot {
  return Boolean(
    previous
    && previous.product_id === item.product_id
    && previous.source_variant_id === (item.source_variant_id || null)
    && (previous.quantity === undefined || previous.quantity === item.quantity)
    && exactMoney(item.unit_price, previous.unit_price)
    && exactMoney(item.unit_cost, previous.unit_cost)
    && (previous.product_name === undefined || item.product_name === previous.product_name)
    && (previous.product_sku === undefined || textOrNull(item.product_sku) === previous.product_sku)
    && (previous.product_image_url === undefined || textOrNull(item.product_image_url) === previous.product_image_url)
    && (previous.source_variant_sku === undefined || textOrNull(item.source_variant_sku) === previous.source_variant_sku)
    && (previous.color_name === undefined || textOrNull(item.color_name) === previous.color_name)
    && (previous.color_hex === undefined || textOrNull(item.color_hex) === previous.color_hex)
    && (previous.size_code === undefined || textOrNull(item.size_code) === previous.size_code)
    && (previous.gender === undefined || textOrNull(item.gender) === previous.gender)
    && (previous.kit_group_id === undefined || textOrNull(item.kit_group_id) === previous.kit_group_id)
    && (previous.kit_name === undefined || textOrNull(item.kit_name) === previous.kit_name)
  );
}

function matchesPreviousIdentity(item: AttestableQuoteItem, previous: VerifiedSnapshot | undefined): boolean {
  if (!previous || previous.product_id !== item.product_id
      || previous.source_variant_id !== (item.source_variant_id || null)) return false;
  return [
    [previous.product_name, item.product_name],
    [previous.product_sku, textOrNull(item.product_sku)],
    [previous.product_image_url, textOrNull(item.product_image_url)],
    [previous.source_variant_sku, textOrNull(item.source_variant_sku)],
    [previous.color_name, textOrNull(item.color_name)],
    [previous.color_hex, textOrNull(item.color_hex)],
    [previous.size_code, textOrNull(item.size_code)],
  ].every(([saved, requested]) => saved === undefined || saved === requested);
}

function fallbackCost(price: number): number {
  return Math.round(price * 70) / 100;
}

function catalogCost(value: unknown, price: number): number {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) {
    return fallbackCost(price);
  }
  const cost = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(cost) || cost < 0) throw new Error('Custo unitário indisponível no catálogo.');
  return cost === 0 ? fallbackCost(price) : cost;
}

export function verifyQuoteCatalogItem(
  item: AttestableQuoteItem,
  product: QuoteCatalogProduct | undefined,
  variant: QuoteCatalogVariant | undefined,
  previous: VerifiedSnapshot | undefined,
): { unitPrice: number; unitCost: number; snapshotPreserved: boolean } {
  const variantId = item.source_variant_id || null;
  const unchangedSnapshot = isQuoteCatalogSnapshotUnchanged(item, previous);
  const persistedIdentity = matchesPreviousIdentity(item, previous);
  if (unchangedSnapshot && previous) {
    return { unitPrice: previous.unit_price, unitCost: previous.unit_cost, snapshotPreserved: true };
  }
  if (!product || product.id !== item.product_id) throw new Error('Um produto do orçamento não existe no catálogo.');
  if (product.is_active !== true
      || (variantId && (!variant || variant.product_id !== product.id || variant.is_active !== true))) {
    throw new Error('O produto ou a variante não está ativo no catálogo vigente.');
  }

  if (variantId && (!variant || variant.product_id !== product.id)) {
    throw new Error('A variante do orçamento não pertence a um produto ativo do catálogo.');
  }

  const sourcePrice = money(variant?.sale_price ?? product.sale_price, 'Preço unitário');
  const sourceCost = catalogCost(product.cost_price, sourcePrice);
  const unitPrice = sourcePrice;
  const unitCost = sourceCost;

  if (!exactMoney(item.unit_price, unitPrice) || !exactMoney(item.unit_cost, unitCost)) {
    throw new Error('Preço ou custo do item diverge do catálogo. Atualize o preço ou use o desconto comercial aprovado.');
  }
  if (item.product_name.trim() !== product.name.trim() && !persistedIdentity) {
    throw new Error('O nome do produto diverge do catálogo vigente. Atualize o item antes de salvar.');
  }
  if (textOrNull(item.product_sku) !== textOrNull(product.sku) && !persistedIdentity) {
    throw new Error('O SKU do produto diverge do catálogo vigente. Atualize o item antes de salvar.');
  }
  if (variantId && (
    (textOrNull(item.source_variant_sku) !== textOrNull(variant?.supplier_sku ?? variant?.sku)
      && !persistedIdentity)
    || ((textOrNull(item.color_name) !== textOrNull(variant?.color_name)
      || textOrNull(item.color_hex) !== textOrNull(variant?.color_hex)
      || textOrNull(item.size_code) !== textOrNull(variant?.size_code)) && !persistedIdentity)
  )) {
    throw new Error('A identidade da variante diverge do catálogo vigente. Atualize o item antes de salvar.');
  }
  const requestedImage = textOrNull(item.product_image_url);
  if (requestedImage) {
    const allowedImages = new Set([
      ...imageUrls(product.images ?? []),
      ...imageUrls(variant?.images ?? []),
      ...(variant?.catalog_image_urls ?? []),
      ...[product.primary_image_url, variant?.selected_thumbnail]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim()),
    ]);
    if (!allowedImages.has(requestedImage)) {
      throw new Error('A imagem do produto diverge do catálogo vigente. Atualize o item antes de salvar.');
    }
  }

  return { unitPrice, unitCost, snapshotPreserved: false };
}
