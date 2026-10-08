/**
 * PromobrindProduct type + helper functions.
 */

export interface PromobrindProduct {
  id: string;
  name: string;
  sku: string;
  sale_price?: number | null;
  /** Alias legado aceito apenas na normalização de payloads antigos. */
  base_price?: number | null;
  cost_price?: number | null;
  /** Campo derivado pela camada de UI; não existe na tabela `products`. */
  image_url?: string | null;
  images: string[] | null;
  primary_image_url: string | null;
  og_image_url?: string | null;
  category_id: string | null;
  main_category_id: string | null;
  supplier_id: string | null;
  supplier_reference: string | null;
  supplier_name?: string | null;
  description: string | null;
  short_description: string | null;
  meta_description?: string | null;
  brand: string | null;
  is_active: boolean;
  /** Alias legado aceito apenas na normalização de payloads antigos. */
  active?: boolean | null;
  stock_quantity?: number | null;
  colors?: Array<string | {
    name: string;
    hex?: string;
    stock?: number;
    sku?: string;
    image?: string | null;
    images?: string[];
    size_code?: string | null;
  }> | null;
  materials?: Array<string | Record<string, unknown>> | null;
  dimensions?: string | null;
  min_quantity?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  height_cm?: number | null;
  width_cm?: number | null;
  length_cm?: number | null;
  diameter_cm?: number | null;
  weight_g?: number | null;
  capacity_ml?: number | null;
  packing_type?: string | null;
  packing_classification?: string | null;
  has_commercial_packaging?: boolean | null;
  repacking_type?: string | null;
  packaging_context?: string | null;
  box_image?: string | null;
  box_width_mm?: number | null;
  box_height_mm?: number | null;
  box_length_mm?: number | null;
  box_weight_kg?: number | null;
  box_quantity?: number | null;
  box_volume_cm3?: number | null;
  product_videos?: Array<{
    id: string;
    url_stream: string | null;
    url_hls: string | null;
    url_thumbnail: string | null;
    url_original: string | null;
    source_youtube_id: string | null;
    video_type: string | null;
    display_order: number;
    is_primary: boolean;
    title: string | null;
  }> | null;
  is_featured?: boolean | null;
  is_bestseller?: boolean | null;
  is_new?: boolean | null;
  is_on_sale?: boolean | null;
  is_kit?: boolean | null;
  gender?: string | null;
  category_name?: string | null;
  tags?: Record<string, unknown> | null;
  price_updated_at?: string | null;
  /** Campo futuro/derivado; ainda não faz parte dos selects do banco externo. */
  price_freshness_threshold_days?: number | null;
  lead_time_days?: number | null;
  kit_components?: Array<{
    id: string; component_name: string | null; component_code: string | null;
    component_product_id: string | null; component_sku: string | null;
    quantity: number | null; display_order: number | null;
    is_optional: boolean | null; is_packaging: boolean | null;
    is_replaceable: boolean | null; allows_personalization: boolean | null;
    material: string | null; primary_image_url: string | null;
    height_mm: number | null; width_mm: number | null; length_mm: number | null;
    weight_g: number | null; notes: string | null;
    component_type_code?: string | null; supplier_component_code?: string | null;
    component_description?: string | null; personalization_notes?: string | null;
    color?: string | null;
  }> | null;
}

function normalizeImageUrl(candidate: unknown): string | null {
  if (typeof candidate === 'string') return candidate.trim() || null;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) return null;

  const legacyImage = candidate as Record<string, unknown>;
  const value = ['url', 'src', 'image_url']
    .map((key) => legacyImage[key])
    .find((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
  return value?.trim() ?? null;
}

export function getProductImageUrl(
  product: {
    primary_image_url: PromobrindProduct['primary_image_url'];
    image_url?: PromobrindProduct['image_url'];
    images?: unknown[] | null;
  },
): string | null {
  const candidates = [product.primary_image_url, product.image_url, ...(product.images ?? [])];
  return candidates.map(normalizeImageUrl).find((value) => value !== null) ?? null;
}

export function getProductPrice(
  product: Pick<PromobrindProduct, 'sale_price' | 'base_price'>,
): number {
  return product.sale_price ?? product.base_price ?? 0;
}

export function getProductStock(product: PromobrindProduct): number {
  return product.stock_quantity || 0;
}

// Select field constants
// NOTE: `price_updated_at` is the SSOT for price freshness — populated via
// trigger on the external Promobrind DB whenever any price field changes.
// `price_freshness_threshold_days` does NOT exist in the external DB and was
// removed from all selects to eliminate "column does not exist" errors.
const PRODUCT_IDENTITY_FIELDS = 'id, name, sku';
const PRODUCT_COMMON_FIELDS =
  'cost_price, images, primary_image_url, ' +
  'category_id, main_category_id, supplier_id, supplier_reference, description, ' +
  'short_description, meta_description, brand, is_active, stock_quantity, colors, ' +
  'materials, min_quantity, created_at, updated_at, price_updated_at, ' +
  'is_featured, is_bestseller, is_new, is_on_sale, is_kit';
const PRODUCT_DIMENSION_FIELDS = 'height_cm, width_cm, length_cm, diameter_cm, weight_g, capacity_ml';
const PRODUCT_PACKAGING_FIELDS =
  'packing_type, packing_classification, has_commercial_packaging, repacking_type, packaging_context, ' +
  'box_image, box_width_mm, box_height_mm, box_length_mm, box_weight_kg, box_quantity, box_volume_cm3';

export const PRODUCT_SELECT_FIELDS_WITH_SALE =
  `${PRODUCT_IDENTITY_FIELDS}, sale_price, ${PRODUCT_COMMON_FIELDS}, gender, ` +
  `${PRODUCT_DIMENSION_FIELDS}, ${PRODUCT_PACKAGING_FIELDS}`;

export const PRODUCT_SELECT_FIELDS_LEGACY =
  `${PRODUCT_IDENTITY_FIELDS}, ${PRODUCT_COMMON_FIELDS}, ` +
  `${PRODUCT_DIMENSION_FIELDS}, ${PRODUCT_PACKAGING_FIELDS}`;

export const PRODUCT_SELECT_FIELDS_DETAIL =
  `${PRODUCT_IDENTITY_FIELDS}, sale_price, ${PRODUCT_COMMON_FIELDS}, tags, ` +
  `${PRODUCT_DIMENSION_FIELDS}, ${PRODUCT_PACKAGING_FIELDS}`;

// #2: also trigger fallback when orderBy hits a missing column
export function shouldFallbackSelect(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return /(sale_price|base_price|gender|price_updated_at|does not exist|não existe|undefined column|column .+ does not exist|could not identify an ordering operator|order by)/i.test(msg);
}
