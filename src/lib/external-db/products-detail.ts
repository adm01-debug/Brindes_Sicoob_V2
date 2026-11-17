/**
 * Product detail fetching — fetchById, bySku, categories, colors.
 */
import { logger } from '@/lib/logger';
import { invokeExternalDb, invokeBatchBridge, type InvokeResult, type BatchQuery } from './bridge';
import { getCachedByIds, getFreshFromCacheSafe, putInCacheSafe } from './immutableCache';
import {
  type PromobrindProduct,
  PRODUCT_SELECT_FIELDS_WITH_SALE,
  PRODUCT_SELECT_FIELDS_LEGACY,
  PRODUCT_SELECT_FIELDS_DETAIL,
  shouldFallbackSelect,
} from './product-types';
import { resolvePrivateStorageUrl } from '@/lib/private-storage';

const PRODUCT_IMAGE_BUCKET = 'personalization-images';
const PRODUCT_VIDEO_BUCKET = 'product-videos';

interface ProductImage {
  url_cdn: string;
  url_original: string | null;
  filename: string | null;
  image_type: string;
  is_primary: boolean;
  is_og_image: boolean;
  applies_to_color: boolean | null;
  display_order: number;
  alt_text: string | null;
  title_text: string | null;
  supplier_code: string | null;
}

interface Variant {
  id: string;
  color_name: string | null;
  color_hex: string | null;
  color_code: string | null;
  sku: string | null;
  stock_quantity: number | null;
}

interface Video {
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
  cloudflare_status: string | null;
}

interface KitComponent {
  id: string;
  component_name: string | null;
  component_code: string | null;
  component_product_id: string | null;
  component_sku: string | null;
  quantity: number | null;
  display_order: number | null;
  is_optional: boolean | null;
  is_packaging: boolean | null;
  is_replaceable: boolean | null;
  allows_personalization: boolean | null;
  material: string | null;
  primary_image_url: string | null;
  height_mm: number | null;
  width_mm: number | null;
  length_mm: number | null;
  weight_g: number | null;
  notes: string | null;
}

async function resolveProductImageRows(rows: ProductImage[]): Promise<ProductImage[]> {
  return Promise.all(rows.map(async (image) => ({
    ...image,
    url_cdn: await resolvePrivateStorageUrl(image.url_cdn, PRODUCT_IMAGE_BUCKET) ?? image.url_cdn,
    url_original: await resolvePrivateStorageUrl(image.url_original, PRODUCT_IMAGE_BUCKET),
  })));
}

async function resolveProductVideoRows(rows: Video[]): Promise<Video[]> {
  return Promise.all(rows.map(async (video) => ({
    ...video,
    url_stream: await resolvePrivateStorageUrl(video.url_stream, PRODUCT_VIDEO_BUCKET),
    url_thumbnail: await resolvePrivateStorageUrl(video.url_thumbnail, PRODUCT_VIDEO_BUCKET),
    url_original: await resolvePrivateStorageUrl(video.url_original, PRODUCT_VIDEO_BUCKET),
  })));
}

interface ColorEntry {
  name: string;
  hex: string;
  code?: string;
  sku?: string;
  stock?: number;
  image?: string;
  images?: string[];
  _variantId?: string;
  _needsFallback?: boolean;
}

type DetailEnrichmentSlot = 'category' | 'supplier' | 'materials';

type SelectAttempt =
  | { result: InvokeResult<PromobrindProduct>; error?: never }
  | { result?: never; error: unknown };

async function tryProductSelect(
  productId: string,
  select: string,
  maxRetries: number,
): Promise<SelectAttempt> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return {
        result: await invokeExternalDb<PromobrindProduct>({
          table: 'products', operation: 'select', filters: { id: productId }, select, limit: 1,
        }),
      };
    } catch (error) {
      lastError = error;
      if (shouldFallbackSelect(error)) return { error };
      if (!isTransientError(error)) throw error;
      if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  return { error: lastError };
}

async function fetchProductWithRetry(
  productId: string,
  maxRetries = 2,
): Promise<InvokeResult<PromobrindProduct>> {
  const selectFields = [PRODUCT_SELECT_FIELDS_DETAIL, PRODUCT_SELECT_FIELDS_WITH_SALE, PRODUCT_SELECT_FIELDS_LEGACY];
  let lastError: unknown;
  for (const select of selectFields) {
    const attempt = await tryProductSelect(productId, select, maxRetries);
    if (attempt.result) return attempt.result;
    lastError = attempt.error;
  }
  throw lastError;
}

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /(timeout|statement timeout|canceling statement|schema cache|retrying|ECONNRESET|fetch failed)/i.test(msg);
}

async function fetchProductImages(productId: string): Promise<ProductImage[]> {
  try {
    const result = await invokeExternalDb<ProductImage>({
      table: 'product_images', operation: 'select',
      select: 'url_cdn, url_original, filename, image_type, is_primary, is_og_image, applies_to_color, display_order, alt_text, title_text, supplier_code',
      filters: { product_id: productId, is_active: true },
      orderBy: { column: 'display_order', ascending: true }, limit: 80,
    });
    return resolveProductImageRows(result.records ?? []);
  } catch (error) {
    logger.warn(`[product:${productId}] Não foi possível buscar imagens:`, error);
    return [];
  }
}

function applyCachedReferences(product: PromobrindProduct, categoryId: string | null | undefined): void {
  if (categoryId && !product.category_name) {
    const cached = getFreshFromCacheSafe('categories', categoryId);
    if (cached?.name) product.category_name = cached.name;
  }
  if (product.supplier_id) {
    const cached = getFreshFromCacheSafe('suppliers', product.supplier_id);
    if (cached?.name) product.supplier_name = cached.name;
  }
}

function needsMaterials(product: PromobrindProduct): boolean {
  return !product.materials || (Array.isArray(product.materials) && product.materials.length === 0);
}

function buildDetailEnrichmentQueries(
  product: PromobrindProduct,
  productId: string,
  categoryId: string | null | undefined,
): { queries: BatchQuery[]; slots: DetailEnrichmentSlot[] } {
  const queries: BatchQuery[] = [];
  const slots: DetailEnrichmentSlot[] = [];
  if (categoryId && !product.category_name) {
    queries.push({ table: 'categories', select: 'id, name', filters: { id: categoryId }, limit: 1 });
    slots.push('category');
  }
  if (product.supplier_id && !product.supplier_name) {
    queries.push({ table: 'suppliers', select: 'id, name, code', filters: { id: product.supplier_id }, limit: 1 });
    slots.push('supplier');
  }
  if (needsMaterials(product)) {
    queries.push({
      table: 'product_materials', select: 'product_id, material_id, part',
      filters: { product_id: productId, is_active: true }, limit: 20,
    });
    slots.push('materials');
  }
  return { queries, slots };
}

function applyReferenceRecord(
  product: PromobrindProduct,
  slot: DetailEnrichmentSlot,
  records: Record<string, unknown>[],
  materialIds: Set<string>,
): void {
  if (slot === 'materials') {
    for (const record of records) {
      if (typeof record.material_id === 'string') materialIds.add(record.material_id);
    }
    return;
  }
  const record = records[0];
  if (!record || typeof record.name !== 'string') return;
  if (slot === 'category') {
    product.category_name = record.name;
    if (typeof record.id === 'string') putInCacheSafe('categories', { id: record.id, name: record.name });
    return;
  }
  product.supplier_name = record.name;
  if (typeof record.id === 'string') {
    putInCacheSafe('suppliers', {
      id: record.id,
      name: record.name,
      code: typeof record.code === 'string' ? record.code : undefined,
    });
  }
}

async function fetchDetailEnrichment(
  product: PromobrindProduct,
  productId: string,
): Promise<{ materialIds: string[] }> {
  const categoryId = product.category_id || product.main_category_id;
  applyCachedReferences(product, categoryId);
  const { queries, slots } = buildDetailEnrichmentQueries(product, productId, categoryId);
  if (!queries.length) return { materialIds: [] };
  try {
    const results = await invokeBatchBridge(queries);
    const materialIds = new Set<string>();
    slots.forEach((slot, index) => {
      const result = results[index];
      if (result?.success && result.data) {
        applyReferenceRecord(product, slot, result.data.records as Record<string, unknown>[], materialIds);
      }
    });
    return { materialIds: [...materialIds] };
  } catch (error) {
    logger.warn(`[product:${productId}] Não foi possível enriquecer em lote:`, error);
    return { materialIds: [] };
  }
}

async function fetchVariants(productId: string): Promise<Variant[]> {
  try {
    const result = await invokeExternalDb<Variant>({
      table: 'product_variants', operation: 'select',
      select: 'id, color_name, color_hex, color_code, sku, stock_quantity',
      filters: { product_id: productId, is_active: true }, limit: 60,
    });
    return result.records ?? [];
  } catch (error) {
    logger.warn(`[product:${productId}] Não foi possível buscar variantes:`, error);
    return [];
  }
}

async function fetchVideos(productId: string): Promise<Video[]> {
  try {
    const result = await invokeExternalDb<Video>({
      table: 'product_videos', operation: 'select',
      select: 'id, url_stream, url_hls, url_thumbnail, url_original, source_youtube_id, video_type, display_order, is_primary, title, cloudflare_status',
      filters: { product_id: productId, is_active: true },
      orderBy: { column: 'display_order', ascending: true }, limit: 20,
    });
    return resolveProductVideoRows(result.records ?? []);
  } catch (error) {
    logger.warn(`[product:${productId}] Não foi possível buscar vídeos:`, error);
    return [];
  }
}

async function fetchKitComponents(product: PromobrindProduct, productId: string): Promise<KitComponent[]> {
  if (!product.is_kit) return [];
  try {
    const result = await invokeExternalDb<KitComponent>({
      table: 'product_kit_components', operation: 'select',
      select: 'id, component_name, component_code, component_product_id, component_sku, quantity, display_order, is_optional, is_packaging, is_replaceable, allows_personalization, material, primary_image_url, height_mm, width_mm, length_mm, weight_g, notes',
      filters: { kit_product_id: productId },
      orderBy: { column: 'display_order', ascending: true }, limit: 50,
    });
    return result.records ?? [];
  } catch (error) {
    logger.warn(`[product:${productId}] Não foi possível buscar componentes do kit:`, error);
    return [];
  }
}

async function completeProductImages(productId: string, firstPage: ProductImage[]): Promise<ProductImage[]> {
  if (firstPage.length !== 80) return firstPage;
  try {
    const result = await invokeExternalDb<ProductImage>({
      table: 'product_images', operation: 'select',
      select: 'url_cdn, url_original, filename, image_type, is_primary, is_og_image, applies_to_color, display_order, alt_text, title_text, supplier_code',
      filters: { product_id: productId, is_active: true },
      orderBy: { column: 'display_order', ascending: true }, limit: 80, offset: 80,
    });
    return [...firstPage, ...await resolveProductImageRows(result.records ?? [])];
  } catch (error) {
    logger.warn(`[product:${productId}] Falha paginando imagens (página 2):`, error);
    return firstPage;
  }
}

function applyDetailImages(product: PromobrindProduct, images: ProductImage[]): void {
  if (!images.length) return;
  const colorImages = images.filter(image => Boolean(image.supplier_code) && image.image_type !== 'box').sort((left, right) => left.display_order - right.display_order);
  const generalImages = images.filter(image => !image.supplier_code && image.image_type !== 'box').sort((left, right) => left.display_order - right.display_order);
  const mainImages = [...colorImages, ...generalImages];
  const primary = mainImages.find(image => image.is_primary) || mainImages[0];
  if (primary) {
    product.primary_image_url = primary.url_cdn;
    product.image_url = primary.url_cdn;
  }
  const ogImage = mainImages.find(image => image.is_og_image)
    || mainImages.find(image => image.image_type === 'main')
    || primary;
  if (ogImage) product.og_image_url = ogImage.url_cdn;
  product.images = mainImages.map(image => image.url_cdn);
}

async function applyMaterials(product: PromobrindProduct, productId: string, materialIds: string[]): Promise<void> {
  if (!materialIds.length) return;
  try {
    const namesById = await getCachedByIds<{ id: string; name: string }>('material_types', materialIds);
    const names = materialIds.map(id => namesById.get(id)?.name).filter((name): name is string => Boolean(name));
    if (names.length) product.materials = names;
  } catch (error) {
    logger.warn(`[product:${productId}] Não foi possível buscar nomes de material_types:`, error);
  }
}

function imageUrlsForVariant(variant: Variant, images: ProductImage[]): string[] {
  if (!variant.color_code) return [];
  return images
    .filter(image => image.supplier_code === variant.color_code)
    .sort((left, right) => left.display_order - right.display_order)
    .map(image => image.url_cdn);
}

function buildColorEntry(variant: Variant, images: ProductImage[], product: PromobrindProduct): ColorEntry {
  const variantImages = imageUrlsForVariant(variant, images);
  const image = variantImages[0] || product.primary_image_url || product.image_url || undefined;
  return {
    name: variant.color_name as string,
    hex: variant.color_hex || '#CCCCCC',
    code: variant.color_code || '',
    sku: variant.sku || undefined,
    stock: variant.stock_quantity ?? undefined,
    image,
    images: variantImages.length ? variantImages : undefined,
    _variantId: variantImages.length ? undefined : variant.id,
    _needsFallback: variantImages.length === 0,
  };
}

function buildColorEntries(
  variants: Variant[],
  images: ProductImage[],
  product: PromobrindProduct,
): { colors: ColorEntry[]; fallbackIds: string[] } {
  const colors: ColorEntry[] = [];
  const fallbackIds: string[] = [];
  for (const variant of variants) {
    if (!variant.color_name || colors.some(color => color.name === variant.color_name)) continue;
    const entry = buildColorEntry(variant, images, product);
    colors.push(entry);
    if (entry._needsFallback) fallbackIds.push(variant.id);
  }
  return { colors, fallbackIds };
}

type VariantImageFallback = { id: string; images: string[] | null; selected_thumbnail: string | null };

function applyVariantFallbacks(colors: ColorEntry[], fallbackRows: VariantImageFallback[]): void {
  const byId = new Map(fallbackRows.map(row => [row.id, row]));
  for (const color of colors) {
    if (!color._needsFallback || !color._variantId) continue;
    const row = byId.get(color._variantId);
    if (!row) continue;
    const images = row.images || [];
    const thumbnail = images[0] || row.selected_thumbnail || color.image;
    if (images.length) color.images = images;
    if (thumbnail) color.image = thumbnail;
  }
}

async function fetchVariantFallbacks(productId: string, ids: string[]): Promise<VariantImageFallback[]> {
  if (!ids.length) return [];
  try {
    const result = await invokeExternalDb<VariantImageFallback>({
      table: 'product_variants', operation: 'select', select: 'id, images, selected_thumbnail',
      filters: { id: `in.(${ids.join(',')})` }, limit: Math.max(ids.length, 10),
    });
    return result.records ?? [];
  } catch (error) {
    logger.warn(`[product:${productId}] Fallback de imagens de variantes falhou:`, error);
    return [];
  }
}

function cleanColorEntry(color: ColorEntry): Omit<ColorEntry, '_variantId' | '_needsFallback'> {
  const { _variantId: _variantId, _needsFallback: _needsFallback, ...clean } = color;
  return clean;
}

async function applyVariantColors(
  product: PromobrindProduct,
  productId: string,
  variants: Variant[],
  images: ProductImage[],
): Promise<void> {
  if (!variants.length) return;
  const { colors, fallbackIds } = buildColorEntries(variants, images, product);
  applyVariantFallbacks(colors, await fetchVariantFallbacks(productId, fallbackIds));
  if (colors.length) product.colors = colors.map(cleanColorEntry);
}

function applyVideos(product: PromobrindProduct, videos: Video[]): void {
  if (!videos.length) return;
  product.product_videos = videos
    .filter(video => !video.cloudflare_status || video.cloudflare_status === 'ready')
    .map(video => ({
      id: video.id,
      url_stream: video.url_stream,
      url_hls: video.url_hls,
      url_thumbnail: video.url_thumbnail,
      url_original: video.url_original,
      source_youtube_id: video.source_youtube_id,
      video_type: video.video_type,
      display_order: video.display_order,
      is_primary: video.is_primary,
      title: video.title,
    }));
}

export async function fetchPromobrindProductById(
  productId: string
): Promise<PromobrindProduct | null> {
  const result = await fetchProductWithRetry(productId);

  const product = result.records?.[0] || null;
  if (!product) return null;

  if (!product.description && product.meta_description) {
    product.description = product.meta_description;
  }

  const imagesPromise = fetchProductImages(productId);
  const enrichmentPromise = fetchDetailEnrichment(product, productId);

  const variantsPromise = fetchVariants(productId);
  const videosPromise = fetchVideos(productId);
  const kitPromise = fetchKitComponents(product, productId);

  // Dispara TUDO em paralelo
  const [allProductImages, enrichment, variants, videos, kitComponents] =
    await Promise.all([imagesPromise, enrichmentPromise, variantsPromise, videosPromise, kitPromise]);

  const imagesAll = await completeProductImages(productId, allProductImages);
  applyDetailImages(product, imagesAll);
  await applyMaterials(product, productId, enrichment.materialIds);

  await applyVariantColors(product, productId, variants, imagesAll);
  applyVideos(product, videos);
  if (kitComponents.length) product.kit_components = kitComponents;

  return product;
}

export async function fetchPromobrindProductBySku(sku: string): Promise<PromobrindProduct | null> {
  let result: InvokeResult<PromobrindProduct>;
  try {
    result = await invokeExternalDb<PromobrindProduct>({
      table: 'products', operation: 'select',
      filters: { sku }, select: PRODUCT_SELECT_FIELDS_WITH_SALE, limit: 1,
    });
  } catch (err) {
    if (!shouldFallbackSelect(err)) throw err;
    result = await invokeExternalDb<PromobrindProduct>({
      table: 'products', operation: 'select',
      filters: { sku }, select: PRODUCT_SELECT_FIELDS_LEGACY, limit: 1,
    });
  }
  return result.records?.[0] || null;
}

export async function fetchPromobrindCategories(): Promise<{ id: string; name: string }[]> {
  try {
    const result = await invokeExternalDb<{ id: string; name: string }>({
      table: 'categories', operation: 'select', select: 'id, name',
      limit: 500, orderBy: { column: 'name', ascending: true }, countMode: 'none',
    });
    // Popula cache de imutáveis: economiza chamadas posteriores em telas de detalhe.
    for (const c of result.records ?? []) {
      if (c?.id && c?.name) putInCacheSafe('categories', { id: c.id, name: c.name });
    }
    return result.records ?? [];
  } catch {
    const result = await invokeExternalDb<{ category_id: string; main_category_id: string }>({
      table: 'products', operation: 'select',
      filters: { is_active: true }, select: 'category_id, main_category_id', limit: 1000,
    });
    const uniqueIds = new Set<string>();
    (result.records ?? []).forEach(p => {
      if (p.category_id) uniqueIds.add(p.category_id);
      if (p.main_category_id) uniqueIds.add(p.main_category_id);
    });
    return Array.from(uniqueIds).map(id => ({ id, name: id }));
  }
}

export async function fetchPromobrindColors(): Promise<{ name: string; hex: string; group?: string }[]> {
  try {
    const result = await invokeExternalDb<{ color_name: string | null; color_hex: string | null; color_code: string | null }>({
      table: 'product_variants', operation: 'select',
      select: 'color_name, color_hex, color_code',
      filters: { is_active: true }, limit: 5000,
    });
    const uniqueColors = new Map<string, { name: string; hex: string; group?: string }>();
    (result.records ?? []).forEach(variant => {
      if (variant.color_name && !uniqueColors.has(variant.color_name)) {
        uniqueColors.set(variant.color_name, { name: variant.color_name, hex: variant.color_hex || '#CCCCCC' });
      }
    });
    return Array.from(uniqueColors.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  } catch (err) {
    logger.warn('Erro ao buscar cores das variantes:', err);
    return [];
  }
}
