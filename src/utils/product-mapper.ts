/**
 * Product Mapper
 * 
 * Converts raw PromobrindProduct to the internal Product format.
 */
import type { Product } from '@/types/product-catalog';
import { getProductImageUrl, getProductPrice, getProductStock, type PromobrindProduct } from '@/lib/external-db';
import { normalizeColors } from '@/utils/product-colors';

function getStockStatus(stock: number): 'in-stock' | 'low-stock' | 'out-of-stock' {
  if (stock <= 0) return 'out-of-stock';
  if (stock < 10) return 'low-stock';
  return 'in-stock';
}

export function parseMaterials(materials: unknown): string[] {
  if (!materials) return [];
  if (Array.isArray(materials)) return materials.filter((m): m is string => typeof m === 'string' && !!m.trim());
  if (typeof materials === 'string') {
    return materials.split(/[,;|]/).map(m => m.trim()).filter(Boolean);
  }
  return [];
}

function parseTagList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === 'string')
      .map((value) => value.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,;|]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Converte o JSONB `tags` do banco externo na estrutura de marketing esperada
 * pela UI. Tolera ausência de chaves e formatos legados (array plano ou string).
 */
function normalizeMarketingTags(tags: unknown): Product['tags'] {
  const source = (typeof tags === 'object' && tags !== null && !Array.isArray(tags))
    ? (tags as Record<string, unknown>)
    : {};

  return {
    publicoAlvo: parseTagList(source.publicoAlvo ?? source.publico_alvo),
    datasComemorativas: parseTagList(source.datasComemorativas ?? source.datas_comemorativas),
    endomarketing: parseTagList(source.endomarketing),
    ramo: parseTagList(source.ramo),
    nicho: parseTagList(source.nicho),
    temas: parseTagList(source.temas),
  };
}

function normalizeImageUrl(image: unknown): string | null {
  if (typeof image === 'string') return image.trim() || null;
  if (typeof image !== 'object' || image === null || Array.isArray(image)) return null;

  const source = image as Record<string, unknown>;
  for (const key of ['url', 'src', 'image_url']) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return null;
}

function productImages(product: PromobrindProduct, fallback: string | null): string[] {
  const images = Array.isArray(product.images)
    ? product.images.map(normalizeImageUrl).filter((image): image is string => image !== null)
    : [];
  if (images.length > 0) return images;
  return [fallback || '/placeholder.svg'];
}

function productVariations(product: PromobrindProduct): NonNullable<Product['variations']> {
  if (!Array.isArray(product.colors)) return [];
  return product.colors.flatMap((color, index) => {
    if (typeof color !== 'object' || color === null || !('name' in color)) return [];
    return [{
      id: `${product.id}-${index}`,
      sku: color.sku || product.sku,
      color: { name: color.name, hex: color.hex || '#CCCCCC' },
      stock: color.stock ?? 0,
      image: color.image || null,
      images: color.images || [],
      videos: [],
      size_code: color.size_code || null,
    }];
  });
}

function validTimestamp(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function validPositiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function firstTruthyOr<T>(fallback: T, ...values: Array<T | null | undefined | false | '' | 0>): T {
  for (const value of values) {
    if (value) return value as T;
  }
  return fallback;
}

type KitComponent = NonNullable<PromobrindProduct['kit_components']>[number];

function mapKitComponent(component: KitComponent): NonNullable<Product['kitItems']>[number] {
  return {
    id: component.id,
    productId: firstTruthyOr('', component.component_product_id, component.id),
    productName: firstTruthyOr('Componente', component.component_name),
    quantity: firstTruthyOr(1, component.quantity),
    sku: firstTruthyOr('', component.component_sku, component.component_code),
    imageUrl: firstTruthyOr<string | null>(null, component.primary_image_url),
    isOptional: Boolean(component.is_optional),
    isPackaging: Boolean(component.is_packaging),
    isReplaceable: Boolean(component.is_replaceable),
    allowsPersonalization: Boolean(component.allows_personalization),
    material: firstTruthyOr<string | null>(null, component.material),
    weightG: firstTruthyOr<number | null>(null, component.weight_g),
    heightMm: component.height_mm ?? null,
    widthMm: component.width_mm ?? null,
    lengthMm: component.length_mm ?? null,
    componentTypeCode: component.component_type_code ?? null,
    supplierComponentCode: component.supplier_component_code ?? null,
    description: component.component_description ?? null,
    personalizationNotes: component.personalization_notes ?? null,
    color: component.color ?? null,
  };
}

function productDimensions(product: PromobrindProduct): Product['dimensions'] {
  return {
    height_cm: product.height_cm,
    width_cm: product.width_cm,
    length_cm: product.length_cm,
    diameter_cm: product.diameter_cm,
    weight_g: product.weight_g,
    capacity_ml: product.capacity_ml,
  };
}

function packagingFields(product: PromobrindProduct): Partial<Product> {
  return {
    packingType: product.packing_type,
    packingClassification: product.packing_classification,
    hasCommercialPackaging: product.has_commercial_packaging,
    allowsPersonalization: product.allows_personalization,
    repackingType: product.repacking_type,
    packagingContext: product.packaging_context as Product['packagingContext'],
    boxImage: product.box_image,
    boxWidthMm: product.box_width_mm,
    boxHeightMm: product.box_height_mm,
    boxLengthMm: product.box_length_mm,
    boxWeightKg: product.box_weight_kg,
    boxQuantity: product.box_quantity,
    boxVolumeCm3: product.box_volume_cm3,
  };
}

export function mapPromobrindToProduct(p: PromobrindProduct): Product {
  const imageUrl = getProductImageUrl(p);
  const stock = getProductStock(p);
  const colors = normalizeColors(p.colors); const images = productImages(p, imageUrl);
  const variations = productVariations(p);
  const categoryId = firstTruthyOr("0", p.category_id, p.main_category_id);
  const supplierId = firstTruthyOr("unknown", p.supplier_id, p.supplier_reference, p.brand);
  return {
    id: p.id,
    name: p.name,
    description: firstTruthyOr<string | null | undefined>(undefined, p.description, p.short_description, p.meta_description),
    category_id: categoryId,
    category_name: firstTruthyOr<string | null>(null, p.category_name),
    price: getProductPrice(p),
    image_url: images[0],
    og_image_url: firstTruthyOr<string | undefined>(undefined, p.og_image_url),
    images,
    sku: p.sku,
    stock,
    colors,
    materials: parseMaterials(p.materials),
    supplier_reference: p.supplier_reference,
    brand: p.brand,
    is_active: p.is_active,
    minQuantity: firstTruthyOr(1, p.min_quantity),
    stockStatus: getStockStatus(stock),
    featured: Boolean(p.is_featured),
    newArrival: Boolean(p.is_new),
    onSale: Boolean(p.is_on_sale),
    isKit: Boolean(p.is_kit),
    gender: firstTruthyOr<string | null>(null, p.gender),
    category: {
      id: categoryId,
      name: firstTruthyOr("Sem categoria", p.category_name),
    },
    supplier: {
      id: supplierId,
      name: firstTruthyOr("Fornecedor", p.supplier_name, p.brand),
    },
    tags: normalizeMarketingTags(p.tags),
    dimensions: productDimensions(p),
    ...packagingFields(p),
    leadTimeDays: p.lead_time_days ?? null,
    priceUpdatedAt: firstTruthyOr<string | null>(null, validTimestamp(p.price_updated_at), validTimestamp(p.updated_at)),
    priceFreshnessThresholdDays: validPositiveNumber(p.price_freshness_threshold_days),
    variations: variations.length > 0 ? variations : undefined,
    productVideos: p.product_videos?.length ? p.product_videos : undefined,
    kitItems: firstTruthyOr<NonNullable<Product['kitItems']> | undefined>(undefined, p.kit_components?.map(mapKitComponent)),
  };
}
