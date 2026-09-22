/**
 * Product Mapper
 * 
 * Converts raw PromobrindProduct to the internal Product format.
 */
import type { Product } from '@/types/product-catalog';
import type { PromobrindProduct } from '@/lib/external-db';
import { getProductImageUrl, getProductPrice, getProductStock } from '@/lib/external-db';
import { normalizeColors } from '@/utils/product-colors';

function getStockStatus(stock: number): 'in-stock' | 'low-stock' | 'out-of-stock' {
  if (stock <= 0) return 'out-of-stock';
  if (stock < 10) return 'low-stock';
  return 'in-stock';
}

function parseMaterials(materials: unknown): string[] {
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

export function mapPromobrindToProduct(p: PromobrindProduct): Product {
  const imageUrl = getProductImageUrl(p);
  const stock = getProductStock(p);
  const colors = normalizeColors(p.colors);

  let images: string[] = [];
  if (p.images && Array.isArray(p.images)) {
    images = p.images.map((img: any) => {
      if (typeof img === 'string') return img;
      if (typeof img === 'object' && img !== null) {
        return img.url || img.src || img.image_url || '';
      }
      return '';
    }).filter(Boolean);
  }
  if (images.length === 0 && imageUrl) images = [imageUrl];
  if (images.length === 0) images = ['/placeholder.svg'];

  const variations: NonNullable<Product['variations']> = [];
  if (p.colors && Array.isArray(p.colors)) {
    p.colors.forEach((c: any, index: number) => {
      if (typeof c === 'object' && c !== null && 'name' in c) {
        variations.push({
          id: `${p.id}-${index}`,
          sku: c.sku || p.sku,
          color: { name: c.name, hex: c.hex || '#CCCCCC' },
          stock: c.stock ?? 0,
          image: c.image || null,
          images: c.images || [],
          videos: [],
          size_code: c.size_code || null,
        });
      }
    });
  }

  const categoryId = p.category_id || p.main_category_id || "0";
  const supplierId = p.supplier_id || p.supplier_reference || p.brand || "unknown";

  return {
    id: p.id,
    name: p.name,
    description: p.description || p.short_description || p.meta_description,
    category_id: categoryId,
    category_name: p.category_name || null,
    price: getProductPrice(p),
    image_url: images[0],
    og_image_url: p.og_image_url || undefined,
    images,
    sku: p.sku,
    stock,
    colors,
    materials: parseMaterials(p.materials),
    supplier_reference: p.supplier_reference,
    brand: p.brand,
    is_active: p.is_active || p.active,
    minQuantity: p.min_quantity || 1,
    stockStatus: getStockStatus(stock),
    featured: Boolean(p.is_featured || p.is_bestseller),
    newArrival: Boolean(p.is_new),
    onSale: Boolean(p.is_on_sale),
    isKit: Boolean(p.is_kit),
    gender: p.gender || null,
    category: {
      id: categoryId,
      name: p.category_name || "Sem categoria",
    },
    supplier: {
      id: supplierId,
      name: p.supplier_name || p.brand || "Fornecedor",
    },
    tags: normalizeMarketingTags(p.tags),
    dimensions: {
      height_cm: p.height_cm, width_cm: p.width_cm, length_cm: p.length_cm,
      diameter_cm: p.diameter_cm, weight_g: p.weight_g, capacity_ml: p.capacity_ml,
    },
    packingType: p.packing_type,
    packingClassification: p.packing_classification,
    hasCommercialPackaging: p.has_commercial_packaging,
    repackingType: p.repacking_type,
    packagingContext: p.packaging_context as Product['packagingContext'],
    boxImage: p.box_image,
    boxWidthMm: p.box_width_mm, boxHeightMm: p.box_height_mm,
    boxLengthMm: p.box_length_mm, boxWeightKg: p.box_weight_kg,
    boxQuantity: p.box_quantity, boxVolumeCm3: p.box_volume_cm3,
    leadTimeDays: p.lead_time_days ?? null,
    priceUpdatedAt: (typeof p.price_updated_at === 'string' && p.price_updated_at.trim() !== '' ? p.price_updated_at : null) || (typeof p.updated_at === 'string' && p.updated_at.trim() !== '' ? p.updated_at : null),
    priceFreshnessThresholdDays: p.price_freshness_threshold_days ?? null,
    variations: variations.length > 0 ? variations : undefined,
    productVideos: p.product_videos?.length ? p.product_videos : undefined,
    kitItems: p.kit_components?.map((c: any) => ({
      id: c.id,
      productId: c.component_product_id || c.id,
      productName: c.component_name || 'Componente',
      quantity: c.quantity || 1,
      sku: c.component_sku || c.component_code || '',
      imageUrl: c.primary_image_url || null,
      isOptional: c.is_optional || false,
      isPackaging: c.is_packaging || false,
      isReplaceable: c.is_replaceable || false,
      allowsPersonalization: c.allows_personalization || false,
      material: c.material || null,
      weightG: c.weight_g || null,
      heightMm: c.height_mm ?? null,
      widthMm: c.width_mm ?? null,
      lengthMm: c.length_mm ?? null,
      componentTypeCode: c.component_type_code ?? null,
      supplierComponentCode: c.supplier_component_code ?? null,
      description: c.component_description ?? null,
      personalizationNotes: c.personalization_notes ?? null,
      color: c.color ?? null,
    })) || undefined,
  };
}
