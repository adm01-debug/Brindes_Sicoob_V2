/**
 * Fetch products with full enrichment (colors, images, variants, suppliers).
 */
import { logger } from '@/lib/logger';
import { invokeExternalDb, invokeBatchBridge, type BatchQuery, type BatchResult, type InvokeResult } from './bridge';
import {
  type PromobrindProduct,
  PRODUCT_SELECT_FIELDS_WITH_SALE,
  PRODUCT_SELECT_FIELDS_LEGACY,
  shouldFallbackSelect,
} from './product-types';
import { resolvePrivateStorageUrl } from '@/lib/private-storage';

interface FetchPromobrindProductsOptions<ReturnCount extends boolean | undefined = undefined> {
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: { column: string; ascending?: boolean };
  filters?: Record<string, unknown>;
  returnCount?: ReturnCount;
}

type ProductOrder = { column: string; ascending?: boolean };

interface ProductPageParams {
  filters: Record<string, unknown>;
  orderBy: ProductOrder;
  limit: number;
  offset: number;
  countMode: 'planned' | 'none';
}

interface VariantRecord {
  id?: string;
  product_id: string;
  color_name: string | null;
  color_hex: string | null;
  color_code: string | null;
  color_id: string | null;
  sku: string | null;
  stock_quantity: number | null;
  images: string[] | null;
  selected_thumbnail: string | null;
}

interface ImageRecord {
  product_id: string;
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
  variant_id: string | null;
}

type SupplierRecord = { id: string; name: string; code: string };
type ColorVariationRecord = { id: string; name: string; slug: string; group_id: string };
type ColorGroupRecord = { id: string; name: string; slug: string };

interface ProductImageInfo {
  url: string;
  urlOriginal: string | null;
  filename: string | null;
  type: string;
  isPrimary: boolean;
  isOgImage: boolean;
  appliesToColor: boolean | null;
  order: number;
  supplierCode: string | null;
  altText: string | null;
  titleText: string | null;
  variantId: string | null;
}

interface ProductColorInfo {
  name: string;
  hex: string;
  code: string;
  sku?: string;
  stock?: number;
  image?: string;
  images?: string[];
  groupSlug?: string;
  groupName?: string;
  variationSlug?: string;
}

type FetchPromobrindProductsResult<ReturnCount extends boolean | undefined> =
  ReturnCount extends true
    ? { products: PromobrindProduct[]; count: number | null }
    : PromobrindProduct[];

function buildProductFilters(options?: FetchPromobrindProductsOptions<boolean | undefined>): Record<string, unknown> {
  const filters: Record<string, unknown> = {
    ...(options?.filters?.is_active === undefined ? { is_active: true } : {}),
    ...options?.filters,
  };
  if (options?.search) filters._search = options.search;
  return filters;
}

async function invokeProductPage(params: ProductPageParams, select: string): Promise<InvokeResult<PromobrindProduct>> {
  return invokeExternalDb<PromobrindProduct>({
    table: 'products',
    operation: 'select',
    ...params,
    select,
  });
}

function isTimeoutError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return /statement timeout|57014|canceling statement/.test(message);
}

async function fetchPageWithFallback(params: ProductPageParams): Promise<InvokeResult<PromobrindProduct>> {
  try {
    return await invokeProductPage(params, PRODUCT_SELECT_FIELDS_WITH_SALE);
  } catch (error) {
    if (!shouldFallbackSelect(error)) throw error;
    return invokeProductPage(params, PRODUCT_SELECT_FIELDS_LEGACY);
  }
}

type PaginatedPageResult =
  | { kind: 'success'; page: InvokeResult<PromobrindProduct> }
  | { kind: 'timeout'; fallback: boolean };

async function fetchPaginatedPage(params: ProductPageParams): Promise<PaginatedPageResult> {
  try {
    return { kind: 'success', page: await invokeProductPage(params, PRODUCT_SELECT_FIELDS_WITH_SALE) };
  } catch (error) {
    if (isTimeoutError(error)) return { kind: 'timeout', fallback: false };
    if (!shouldFallbackSelect(error)) throw error;
  }
  try {
    return { kind: 'success', page: await invokeProductPage(params, PRODUCT_SELECT_FIELDS_LEGACY) };
  } catch (error) {
    if (isTimeoutError(error)) return { kind: 'timeout', fallback: true };
    throw error;
  }
}

async function fetchLimitedProducts(
  options: FetchPromobrindProductsOptions<boolean | undefined>,
  filters: Record<string, unknown>,
  orderBy: ProductOrder,
  shouldRequestCount: boolean,
): Promise<{ products: PromobrindProduct[]; count: number | null }> {
  const result = await fetchPageWithFallback({
    filters,
    orderBy,
    limit: options.limit as number,
    offset: options.offset ?? 0,
    countMode: shouldRequestCount ? 'planned' : 'none',
  });
  return { products: result.records ?? [], count: result.count ?? null };
}

async function waitAfterTimeout(offset: number, consecutiveErrors: number, fallback: boolean): Promise<void> {
  const context = fallback ? ' (fallback)' : '';
  logger.warn(`[external-db] Timeout${context} at offset=${offset}, retrying (${consecutiveErrors}/2)...`);
  await new Promise(resolve => setTimeout(resolve, 1000 * consecutiveErrors));
}

async function shouldStopAfterTimeout(
  result: Extract<PaginatedPageResult, { kind: 'timeout' }>,
  offset: number,
  consecutiveErrors: number,
  productCount: number,
): Promise<boolean> {
  if (consecutiveErrors >= 2) {
    logger.warn(`[external-db] Stopping pagination${result.fallback ? ' (fallback)' : ''} at offset=${offset}. Got ${productCount} products.`);
    return true;
  }
  await waitAfterTimeout(offset, consecutiveErrors, result.fallback);
  return false;
}

function pageSizeFor(offset: number): number {
  return offset >= 1000 ? 125 : 200;
}

function pageCountMode(shouldRequestCount: boolean, offset: number): 'planned' | 'none' {
  return shouldRequestCount && offset === 0 ? 'planned' : 'none';
}

function updatedTotalCount(current: number | null, page: InvokeResult<PromobrindProduct>): number | null {
  return typeof page.count === 'number' ? page.count : current;
}

function reachedPaginationEnd(recordCount: number, pageSize: number, total: number | null, loaded: number): boolean {
  if (recordCount < pageSize) return true;
  return total !== null && loaded >= total;
}

async function fetchAllProducts(
  filters: Record<string, unknown>,
  orderBy: ProductOrder,
  shouldRequestCount: boolean,
): Promise<{ products: PromobrindProduct[]; count: number | null }> {
  const products: PromobrindProduct[] = [];
  const startedAt = Date.now();
  let offset = 0;
  let count: number | null = null;
  let consecutiveErrors = 0;

  while (offset < 200000) {
    if (Date.now() - startedAt > 30_000) {
      logger.warn(`[external-db] Pagination time budget exceeded (30000ms). Got ${products.length} products at offset=${offset}.`);
      break;
    }
    const pageSize = pageSizeFor(offset);
    const result = await fetchPaginatedPage({
      filters,
      orderBy,
      limit: pageSize,
      offset,
      countMode: pageCountMode(shouldRequestCount, offset),
    });
    if (result.kind === 'timeout') {
      consecutiveErrors += 1;
      if (await shouldStopAfterTimeout(result, offset, consecutiveErrors, products.length)) break;
      continue;
    }
    consecutiveErrors = 0;
    const records = result.page.records ?? [];
    count = updatedTotalCount(count, result.page);
    products.push(...records);
    offset += records.length;
    if (reachedPaginationEnd(records.length, pageSize, count, products.length)) break;
  }
  return { products, count };
}

export async function fetchPromobrindProducts<ReturnCount extends boolean | undefined = undefined>(
  options?: FetchPromobrindProductsOptions<ReturnCount>,
): Promise<FetchPromobrindProductsResult<ReturnCount>> {
  const filters = buildProductFilters(options);
  const orderBy = options?.orderBy ?? { column: 'name', ascending: true };
  const shouldRequestCount = options?.returnCount === true;
  const fetchResult = typeof options?.limit === 'number' && options.limit > 0
    ? await fetchLimitedProducts(options, filters, orderBy, shouldRequestCount)
    : await fetchAllProducts(filters, orderBy, shouldRequestCount);
  const { products, count: totalCount } = fetchResult;

  // Enrich products
  if (products.length > 0) {
    await enrichProducts(products, options);
  }

  if (options?.returnCount) {
    return { products, count: totalCount } as FetchPromobrindProductsResult<ReturnCount>;
  }
  return products as FetchPromobrindProductsResult<ReturnCount>;
}

// ============================================
// ENRICHMENT LOGIC
// ============================================

interface EnrichmentQueryMap {
  variants: number[];
  images: number[];
  suppliers: number[];
  colorVariations: number[];
  colorGroups: number[];
}

function chunkIds(ids: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += size) chunks.push(ids.slice(index, index + size));
  return chunks;
}

function addHeavyEnrichmentQueries(queries: BatchQuery[], map: EnrichmentQueryMap, chunks: string[][]): void {
  for (const chunk of chunks) {
    map.variants.push(queries.length);
    queries.push({
      table: 'product_variants',
      select: 'product_id, color_name, color_hex, color_code, color_id, sku, stock_quantity, images, selected_thumbnail',
      filters: { is_active: true, product_id: chunk }, limit: 1000, offset: 0,
    });
  }
  for (const chunk of chunks) {
    map.images.push(queries.length);
    queries.push({
      table: 'product_images',
      select: 'product_id, url_cdn, url_original, filename, image_type, is_primary, is_og_image, applies_to_color, display_order, alt_text, title_text, supplier_code, variant_id',
      filters: { is_active: true, product_id: chunk }, limit: 1000, offset: 0,
    });
  }
  map.colorVariations.push(queries.length);
  queries.push({ table: 'color_variations', select: 'id, name, slug, group_id', filters: { is_active: true }, limit: 500, offset: 0, cacheKey: 'ref:color_variations' });
  map.colorGroups.push(queries.length);
  queries.push({ table: 'color_groups', select: 'id, name, slug', filters: { is_active: true }, limit: 100, offset: 0, cacheKey: 'ref:color_groups' });
}

function buildEnrichmentQueries(
  productIds: string[],
  supplierIds: string[],
  heavy: boolean,
): { queries: BatchQuery[]; map: EnrichmentQueryMap } {
  const queries: BatchQuery[] = [];
  const map: EnrichmentQueryMap = { variants: [], images: [], suppliers: [], colorVariations: [], colorGroups: [] };
  if (heavy) addHeavyEnrichmentQueries(queries, map, chunkIds(productIds, 80));
  if (supplierIds.length) {
    map.suppliers.push(queries.length);
    queries.push({ table: 'suppliers', select: 'id, name, code', filters: { id: supplierIds }, limit: supplierIds.length, offset: 0 });
  }
  return { queries, map };
}

async function runEnrichmentQueries(queries: BatchQuery[]): Promise<BatchResult[] | null> {
  try {
    return await invokeBatchBridge(queries);
  } catch (error) {
    logger.warn('[external-db] Batch enrichment failed, products will have basic data:', error);
    return null;
  }
}

function collectRecords<T>(results: BatchResult[], indexes: number[]): T[] {
  const records: T[] = [];
  for (const index of indexes) {
    const result = results[index];
    if (result?.success && result.data?.records) records.push(...result.data.records as T[]);
  }
  return records;
}

async function resolveImageRecords(records: ImageRecord[]): Promise<ImageRecord[]> {
  return Promise.all(records.map(async (image) => ({
    ...image,
    url_cdn: await resolvePrivateStorageUrl(image.url_cdn, 'personalization-images') ?? image.url_cdn,
    url_original: await resolvePrivateStorageUrl(image.url_original, 'personalization-images'),
  })));
}

async function populateSupplierCache(suppliers: SupplierRecord[]): Promise<void> {
  try {
    const { putInCacheSafe } = await import('./immutableCache');
    for (const supplier of suppliers) {
      if (supplier.id && supplier.name) putInCacheSafe('suppliers', supplier);
    }
  } catch {
    // Cache de referência é apenas uma otimização.
  }
}

function toProductImageInfo(image: ImageRecord): ProductImageInfo {
  return {
    url: image.url_cdn,
    urlOriginal: image.url_original || null,
    filename: image.filename || null,
    type: image.image_type,
    isPrimary: image.is_primary,
    isOgImage: image.is_og_image || false,
    appliesToColor: image.applies_to_color ?? null,
    order: image.display_order,
    supplierCode: image.supplier_code || null,
    altText: image.alt_text || null,
    titleText: image.title_text || null,
    variantId: image.variant_id || null,
  };
}

function getOrCreate<T>(map: Map<string, T[]>, key: string): T[] {
  const existing = map.get(key);
  if (existing) return existing;
  const created: T[] = [];
  map.set(key, created);
  return created;
}

function buildImagesByProduct(records: ImageRecord[], productIds: Set<string>): Map<string, ProductImageInfo[]> {
  const imagesByProduct = new Map<string, ProductImageInfo[]>();
  for (const image of records) {
    if (!productIds.has(image.product_id)) continue;
    getOrCreate(imagesByProduct, image.product_id).push(toProductImageInfo(image));
  }
  return imagesByProduct;
}

function sortedUrls(images: ProductImageInfo[], predicate: (image: ProductImageInfo) => boolean): string[] {
  return images.filter(predicate).sort((left, right) => left.order - right.order).map(image => image.url);
}

function firstPopulatedImages(...candidates: string[][]): string[] {
  return candidates.find(images => images.length > 0) || [];
}

function resolveVariantImages(variant: VariantRecord, images: ProductImageInfo[]): string[] {
  const byVariant = sortedUrls(images, image => image.variantId === variant.id && !image.isPrimary && !image.isOgImage);
  const byCode = variant.color_code
    ? sortedUrls(images, image => image.supplierCode === variant.color_code && !image.isPrimary && !image.isOgImage)
    : [];
  const allByVariant = byVariant.length ? [] : sortedUrls(images, image => image.variantId === variant.id);
  return firstPopulatedImages(byVariant, byCode, allByVariant, variant.images || []);
}

function colorClassification(
  colorId: string | null,
  variations: Map<string, ColorVariationRecord>,
  groups: Map<string, ColorGroupRecord>,
): Pick<ProductColorInfo, 'groupSlug' | 'groupName' | 'variationSlug'> {
  if (!colorId) return {};
  const variation = variations.get(colorId);
  if (!variation) return {};
  const group = groups.get(variation.group_id);
  return { variationSlug: variation.slug, groupSlug: group?.slug, groupName: group?.name };
}

function createColorInfo(
  variant: VariantRecord,
  images: ProductImageInfo[],
  variations: Map<string, ColorVariationRecord>,
  groups: Map<string, ColorGroupRecord>,
): ProductColorInfo {
  const finalImages = resolveVariantImages(variant, images);
  const thumbnail = finalImages[0] || variant.selected_thumbnail || undefined;
  return {
    name: variant.color_name as string,
    hex: variant.color_hex || '#CCCCCC',
    code: variant.color_code || '',
    sku: variant.sku || undefined,
    stock: variant.stock_quantity ?? undefined,
    image: thumbnail,
    images: finalImages.length ? finalImages : undefined,
    ...colorClassification(variant.color_id, variations, groups),
  };
}

function buildColorsByProduct(
  variants: VariantRecord[],
  productIds: Set<string>,
  imagesByProduct: Map<string, ProductImageInfo[]>,
  ...classifications: [
    variations: Map<string, ColorVariationRecord>,
    groups: Map<string, ColorGroupRecord>,
  ]
): Map<string, ProductColorInfo[]> {
  const [variations, groups] = classifications;
  const colorsByProduct = new Map<string, ProductColorInfo[]>();
  for (const variant of variants) {
    if (!variant.color_name || !productIds.has(variant.product_id)) continue;
    const colors = getOrCreate(colorsByProduct, variant.product_id);
    if (colors.some(color => color.name === variant.color_name)) continue;
    colors.push(createColorInfo(variant, imagesByProduct.get(variant.product_id) || [], variations, groups));
  }
  return colorsByProduct;
}

function applyProductImages(product: PromobrindProduct, images: ProductImageInfo[] | undefined): void {
  if (!images?.length) return;
  images.sort((left, right) => left.order - right.order);
  const colorImages = images.filter(image => Boolean(image.supplierCode) && image.type !== 'box');
  const generalImages = images.filter(image => !image.supplierCode && image.type !== 'box');
  const mainImages = [...colorImages, ...generalImages];
  const primary = mainImages.find(image => image.isPrimary) || mainImages[0];
  if (primary) {
    product.primary_image_url = primary.url;
    product.image_url = primary.url;
  }
  const ogImage = mainImages.find(image => image.isOgImage)
    || mainImages.find(image => image.type === 'main')
    || primary;
  if (ogImage) product.og_image_url = ogImage.url;
  product.images = mainImages.map(image => image.url);
}

function applyEnrichments(
  products: PromobrindProduct[],
  imagesByProduct: Map<string, ProductImageInfo[]>,
  colorsByProduct: Map<string, ProductColorInfo[]>,
  suppliers: Map<string, string>,
): void {
  for (const product of products) {
    applyProductImages(product, imagesByProduct.get(product.id));
    const colors = colorsByProduct.get(product.id);
    if (colors?.length) product.colors = colors;
    if (product.supplier_id && suppliers.has(product.supplier_id)) product.supplier_name = suppliers.get(product.supplier_id);
  }
}

async function enrichProducts(products: PromobrindProduct[], options?: { limit?: number }): Promise<void> {
  const productIds = new Set(products.map(product => product.id));
  const supplierIds = [...new Set(products.map(product => product.supplier_id).filter(Boolean))] as string[];
  const heavy = products.length <= 500 || typeof options?.limit === 'number';
  if (!heavy) logger.info(`[external-db] Skipping heavy enrichment for ${products.length} products to prevent timeouts`);

  const { queries, map } = buildEnrichmentQueries([...productIds], supplierIds, heavy);
  const results = await runEnrichmentQueries(queries);
  if (!results) return;

  const variants = collectRecords<VariantRecord>(results, map.variants);
  const images = await resolveImageRecords(collectRecords<ImageRecord>(results, map.images));
  const supplierRecords = collectRecords<SupplierRecord>(results, map.suppliers);
  const colorVariations = collectRecords<ColorVariationRecord>(results, map.colorVariations);
  const colorGroups = collectRecords<ColorGroupRecord>(results, map.colorGroups);
  await populateSupplierCache(supplierRecords);

  const imagesByProduct = buildImagesByProduct(images, productIds);
  const variationsMap = new Map(colorVariations.map(variation => [variation.id, variation]));
  const groupsMap = new Map(colorGroups.map(group => [group.id, group]));
  const colorsByProduct = buildColorsByProduct(variants, productIds, imagesByProduct, variationsMap, groupsMap);
  const suppliersMap = new Map(supplierRecords.map(supplier => [supplier.id, supplier.name]));
  applyEnrichments(products, imagesByProduct, colorsByProduct, suppliersMap);
}
