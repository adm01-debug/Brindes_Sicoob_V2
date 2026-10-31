import type { QuoteItem } from '@/hooks/quotes/quoteTypes';

export interface QuotePrefillProduct {
  id: string;
  name: string;
  sku?: string | null;
  price: number;
  minQuantity?: number | null;
  images?: string[] | null;
  image_url?: string | null;
  stock?: number | null;
  priceUpdatedAt?: string | null;
  priceFreshnessThresholdDays?: number | null;
}

export interface QuoteUrlPrefillResult {
  items: QuoteItem[];
  clientId: string | null;
  unavailableIds: string[];
  truncatedCount: number;
  invalidCount: number;
}

const MAX_URL_PREFILL_PRODUCTS = 20;

interface QuoteItemHint {
  productId: string;
  quantity?: number;
  colorName?: string;
  colorHex?: string;
  sizeCode?: string;
}

function safeId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const id = value.trim();
  return id.length > 0 && id.length <= 200 ? id : undefined;
}

function parseItemsParam(params: URLSearchParams): {
  hints: QuoteItemHint[];
  invalidCount: number;
} {
  let invalidCount = 0;
  const hints = params.getAll('items[]').flatMap((raw) => {
    try {
      const item = JSON.parse(raw) as Record<string, unknown>;
      const productId = safeId(item.product_id ?? item.productId);
      if (!productId) {
        invalidCount += 1;
        return [];
      }
      const rawQuantity = Number(item.quantity);
      return [
        {
          productId,
          quantity:
            Number.isFinite(rawQuantity) && rawQuantity > 0
              ? Math.min(Math.floor(rawQuantity), 1_000_000)
              : undefined,
          colorName: typeof item.color_name === 'string' ? safeHint(item.color_name) : undefined,
          colorHex: safeColorHex(item.color_hex),
          sizeCode: typeof item.size_code === 'string' ? safeHint(item.size_code) : undefined,
        },
      ];
    } catch {
      invalidCount += 1;
      return [];
    }
  });
  return { hints, invalidCount };
}

function getProductHints(params: URLSearchParams): {
  hints: QuoteItemHint[];
  invalidCount: number;
} {
  const itemParams = parseItemsParam(params);
  if (itemParams.hints.length > 0) return itemParams;

  const values = [
    ...params.getAll('product_id'),
    ...params.getAll('produto'),
    ...params.getAll('products').flatMap((value) => value.split(',')),
  ];
  const uniqueIds = [
    ...new Set(values.map(safeId).filter((value): value is string => Boolean(value))),
  ];
  const hints = uniqueIds.map((productId) => ({
    productId,
    colorName: uniqueIds.length === 1 ? safeHint(params.get('color_name')) : undefined,
    colorHex: uniqueIds.length === 1 ? safeColorHex(params.get('color_hex')) : undefined,
    sizeCode: uniqueIds.length === 1 ? safeHint(params.get('size_code')) : undefined,
  }));
  const invalidIds = values.filter((value) => value.trim().length > 0 && !safeId(value)).length;
  return { hints, invalidCount: itemParams.invalidCount + invalidIds };
}

function safeHint(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= 100 ? trimmed : undefined;
}

function safeColorHex(value: unknown): string | undefined {
  if (
    typeof value !== 'string' ||
    !/^#?(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(value.trim())
  )
    return undefined;
  return value.trim();
}

function getMinimumQuantity(product: QuotePrefillProduct): number {
  const rawMinimum = product.minQuantity ?? 0;
  if (!Number.isFinite(rawMinimum) || rawMinimum < 1) return 1;
  return Math.floor(rawMinimum);
}

function getCatalogImage(product: QuotePrefillProduct): string | undefined {
  return product.images?.[0] ?? product.image_url ?? undefined;
}

function getCanonicalPrice(product: QuotePrefillProduct): number {
  return Number.isFinite(product.price) ? product.price : 0;
}

function toQuoteItem(
  product: QuotePrefillProduct,
  hint: QuoteItemHint,
  sortOrder: number,
): QuoteItem {
  const minimumQuantity = getMinimumQuantity(product);

  return {
    product_id: product.id,
    product_name: product.name,
    product_sku: product.sku ?? '',
    product_image_url: getCatalogImage(product),
    quantity: Math.max(minimumQuantity, hint.quantity ?? minimumQuantity),
    unit_price: getCanonicalPrice(product),
    color_name: hint.colorName,
    color_hex: hint.colorHex,
    size_code: hint.sizeCode,
    stock_available: product.stock,
    catalog_available_stock: product.stock,
    catalog_minimum_quantity: minimumQuantity,
    price_updated_at: product.priceUpdatedAt,
    price_freshness_threshold_days: product.priceFreshnessThresholdDays,
    sort_order: sortOrder,
    personalizations: [],
  };
}

async function fetchCatalogProducts(
  ids: string[],
  fetchProduct: (id: string) => Promise<QuotePrefillProduct | null>,
): Promise<Map<string, QuotePrefillProduct | null>> {
  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        return [id, await fetchProduct(id)] as const;
      } catch {
        return [id, null] as const;
      }
    }),
  );
  return new Map(entries);
}

export async function resolveQuoteUrlPrefill(
  params: URLSearchParams,
  fetchProduct: (id: string) => Promise<QuotePrefillProduct | null>,
): Promise<QuoteUrlPrefillResult> {
  const parsed = getProductHints(params);
  const hints = parsed.hints.slice(0, MAX_URL_PREFILL_PRODUCTS);
  const idsToFetch = [...new Set(hints.map((hint) => hint.productId))];
  const productMap = await fetchCatalogProducts(idsToFetch, fetchProduct);
  const unavailableIds = idsToFetch.filter((id) => {
    const product = productMap.get(id);
    return !product || product.id !== id;
  });
  const items = hints.flatMap((hint, index) => {
    const product = productMap.get(hint.productId);
    if (!product || product.id !== hint.productId) return [];
    return [toQuoteItem(product, hint, index)];
  });

  return {
    items,
    clientId: params.get('client_id')?.trim().slice(0, 128) || null,
    unavailableIds,
    truncatedCount: Math.max(0, parsed.hints.length - hints.length),
    invalidCount: parsed.invalidCount,
  };
}
