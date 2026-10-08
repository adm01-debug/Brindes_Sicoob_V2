/**
 * useColorEnrichment — Batch-enriches lightweight products with color-specific
 * images and stock when a color filter is active.
 * 
 * Without this, lightweight products have colors: [] and the card cannot
 * show the variant image/stock for the filtered color.
 * 
 * Uses incremental enrichment: keeps a growing cache of results and only
 * fetches data for NEW product IDs that haven't been enriched yet.
 */
import { useQuery } from '@tanstack/react-query';
import { useRef, useMemo, useEffect } from 'react';
import { invokeBatchBridge } from '@/lib/external-db';
import { logger } from '@/lib/logger';

interface ColorEnrichmentData {
  image: string | null;
  stock: number;
  stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
  colorName: string | null;
  colorHex: string | null;
}

interface UseColorEnrichmentOptions {
  /** Product IDs to enrich (should be the visible/filtered set) */
  productIds: string[];
  /** Active color group slugs */
  colorGroups: string[];
  /** Active color variation slugs */
  colorVariations: string[];
}

// Cached reference tables (shared across instances)
let cachedColorGroups: Array<{ id: string; slug: string }> | null = null;
let cachedColorVariations: Array<{ id: string; name: string; slug: string; group_id: string; hex_code: string | null }> | null = null;

interface VariantRow {
  product_id: string;
  color_id: string | null;
  color_name: string | null;
  color_hex: string | null;
  color_code: string | null;
  stock_quantity: number | null;
  selected_thumbnail: string | null;
  images: string[] | null;
  id: string;
}

interface ImageRow {
  product_id: string;
  variant_id: string | null;
  supplier_code: string | null;
  url_cdn: string | null;
  is_og_image: boolean | null;
  is_primary: boolean | null;
  image_type: string | null;
}

interface ImageLookups {
  byVariantId: Map<string, string>;
  byProductAndCode: Map<string, string>;
  primariesByProduct: Map<string, Set<string>>;
}

const CHUNK_SIZE = 80;

function bridgeRecords<T>(result: Awaited<ReturnType<typeof invokeBatchBridge>>[number] | undefined): T[] {
  if (!result?.success || !result.data?.records) return [];
  return result.data.records as T[];
}

async function ensureColorReferences(): Promise<void> {
  if (cachedColorGroups && cachedColorVariations) return;
  const results = await invokeBatchBridge([
    { table: 'color_groups', operation: 'select', select: 'id, slug', filters: { is_active: true }, limit: 200, offset: 0, cacheKey: 'ref:color_groups' },
    { table: 'color_variations', operation: 'select', select: 'id, name, slug, group_id, hex_code', filters: { is_active: true }, limit: 500, offset: 0, cacheKey: 'ref:color_variations' },
  ]);
  cachedColorGroups = bridgeRecords<{ id: string; slug: string }>(results[0]);
  cachedColorVariations = bridgeRecords<{ id: string; name: string; slug: string; group_id: string; hex_code: string | null }>(results[1]);
}

function resolveTargetColorIds(colorGroups: string[], colorVariations: string[]): Set<string> {
  const groups = cachedColorGroups ?? [];
  const variations = cachedColorVariations ?? [];
  const groupsBySlug = new Map(groups.map(group => [group.slug, group.id]));
  const variationsBySlug = new Map(variations.map(variation => [variation.slug, variation]));
  const targetIds = new Set<string>();
  for (const slug of colorVariations) {
    const variation = variationsBySlug.get(slug);
    if (variation) targetIds.add(variation.id);
  }
  for (const slug of colorGroups) {
    const groupId = groupsBySlug.get(slug);
    if (!groupId) continue;
    variations.filter(variation => variation.group_id === groupId).forEach(variation => targetIds.add(variation.id));
  }
  return targetIds;
}

async function fetchColorVariants(productIds: string[], colorIds: string[]): Promise<VariantRow[]> {
  const rows: VariantRow[] = [];
  for (let index = 0; index < productIds.length; index += CHUNK_SIZE) {
    const results = await invokeBatchBridge([{
      table: 'product_variants', operation: 'select',
      select: 'id, product_id, color_id, color_name, color_hex, color_code, stock_quantity, selected_thumbnail, images',
      filters: { is_active: true, product_id: productIds.slice(index, index + CHUNK_SIZE), color_id: colorIds },
      limit: 3000, offset: 0,
    }]);
    rows.push(...bridgeRecords<VariantRow>(results[0]));
  }
  return rows;
}

async function fetchProductImages(productIds: string[]): Promise<ImageRow[]> {
  const rows: ImageRow[] = [];
  for (let index = 0; index < productIds.length; index += CHUNK_SIZE) {
    const results = await invokeBatchBridge([{
      table: 'product_images', operation: 'select',
      select: 'product_id, variant_id, supplier_code, url_cdn, is_og_image, is_primary, image_type',
      filters: { product_id: productIds.slice(index, index + CHUNK_SIZE) },
      limit: 3000, offset: 0,
    }]);
    rows.push(...bridgeRecords<ImageRow>(results[0]));
  }
  return rows;
}

function storePrimaryImage(row: ImageRow, target: Map<string, Set<string>>): void {
  if (!row.url_cdn || (!row.is_primary && !row.is_og_image)) return;
  const urls = target.get(row.product_id) ?? new Set<string>();
  urls.add(row.url_cdn);
  target.set(row.product_id, urls);
}

function storePreferredImage(key: string | null, url: string, preferred: boolean | null, target: Map<string, string>): void {
  if (!key) return;
  if (!target.has(key) || preferred) target.set(key, url);
}

function buildImageLookups(rows: ImageRow[]): ImageLookups {
  const lookups: ImageLookups = {
    byVariantId: new Map(),
    byProductAndCode: new Map(),
    primariesByProduct: new Map(),
  };
  for (const row of rows) {
    if (!row.url_cdn || row.image_type === 'box') continue;
    storePrimaryImage(row, lookups.primariesByProduct);
    storePreferredImage(row.variant_id, row.url_cdn, row.is_og_image, lookups.byVariantId);
    const supplierKey = row.supplier_code
      ? `${row.product_id}|${row.supplier_code.toUpperCase()}`
      : null;
    storePreferredImage(supplierKey, row.url_cdn, row.is_og_image, lookups.byProductAndCode);
  }
  return lookups;
}

function groupVariants(rows: VariantRow[]): Map<string, VariantRow[]> {
  const grouped = new Map<string, VariantRow[]>();
  for (const row of rows) {
    const productRows = grouped.get(row.product_id) ?? [];
    productRows.push(row);
    grouped.set(row.product_id, productRows);
  }
  return grouped;
}

function directVariantMatch(productId: string, variants: VariantRow[], lookups: ImageLookups): VariantRow | undefined {
  return variants.find(variant => {
    if (lookups.byVariantId.has(variant.id)) return true;
    if (!variant.color_code) return false;
    return lookups.byProductAndCode.has(`${productId}|${variant.color_code.toUpperCase()}`);
  });
}

function directVariantUrl(productId: string, variant: VariantRow, lookups: ImageLookups): string | null {
  const byVariant = lookups.byVariantId.get(variant.id);
  if (byVariant) return byVariant;
  if (!variant.color_code) return null;
  return lookups.byProductAndCode.get(`${productId}|${variant.color_code.toUpperCase()}`) ?? null;
}

function thumbnailMatch(productId: string, variants: VariantRow[], lookups: ImageLookups): VariantRow | undefined {
  const primaryUrls = lookups.primariesByProduct.get(productId);
  return variants.find(variant => Boolean(variant.selected_thumbnail && !primaryUrls?.has(variant.selected_thumbnail)));
}

function arrayImageMatch(productId: string, variants: VariantRow[], lookups: ImageLookups): { variant: VariantRow; url: string } | null {
  const primaryUrls = lookups.primariesByProduct.get(productId);
  for (const variant of variants) {
    const images = variant.images ?? [];
    const url = images.find(image => !primaryUrls?.has(image)) ?? images[0];
    if (url) return { variant, url };
  }
  return null;
}

function resolveVariantPresentation(productId: string, variants: VariantRow[], lookups: ImageLookups) {
  const direct = directVariantMatch(productId, variants, lookups);
  if (direct) return { variant: direct, image: directVariantUrl(productId, direct, lookups) };
  const thumbnail = thumbnailMatch(productId, variants, lookups);
  if (thumbnail) return { variant: thumbnail, image: thumbnail.selected_thumbnail };
  const arrayImage = arrayImageMatch(productId, variants, lookups);
  if (arrayImage) return { variant: arrayImage.variant, image: arrayImage.url };
  return { variant: variants[0], image: null };
}

function stockStatus(stock: number): ColorEnrichmentData['stockStatus'] {
  if (stock <= 0) return 'out-of-stock';
  if (stock < 10) return 'low-stock';
  return 'in-stock';
}

/**
 * Returns a Map<productId, ColorEnrichmentData> for products matching the color filter.
 */
export function useColorEnrichment({ productIds, colorGroups, colorVariations }: UseColorEnrichmentOptions) {
  const hasFilter = colorGroups.length > 0 || colorVariations.length > 0;
  const filterKey = [...colorGroups].sort().join(',') + '|' + [...colorVariations].sort().join(',');

  // Accumulator: track which product IDs have already been enriched for this filter
  const enrichedIdsRef = useRef<Set<string>>(new Set());
  const accumulatedMapRef = useRef<Map<string, ColorEnrichmentData>>(new Map());
  const lastFilterKeyRef = useRef<string>(filterKey);

  // Reset cache when filter changes — use useEffect to avoid mutating refs during render
  useEffect(() => {
    if (lastFilterKeyRef.current !== filterKey) {
      enrichedIdsRef.current = new Set();
      accumulatedMapRef.current = new Map();
      lastFilterKeyRef.current = filterKey;
    }
  }, [filterKey]);

  // Find product IDs that haven't been enriched yet
  const newProductIds = useMemo(() => {
    if (!hasFilter) return [];
    return productIds.filter(id => !enrichedIdsRef.current.has(id));
  }, [productIds, hasFilter]);

  // Stable key: use count of new IDs + total count  
  const queryEnabled = hasFilter && newProductIds.length > 0;

  const query = useQuery({
    queryKey: ['color-enrichment-batch', filterKey, newProductIds.length, productIds.length],
    queryFn: async (): Promise<Map<string, ColorEnrichmentData>> => {
      if (newProductIds.length === 0) return accumulatedMapRef.current;

      await ensureColorReferences();
      const targetColorIds = resolveTargetColorIds(colorGroups, colorVariations);

      if (targetColorIds.size === 0) return accumulatedMapRef.current;

      const colorIdArray = [...targetColorIds];
      const allVariants = await fetchColorVariants(newProductIds, colorIdArray);

      // Step 3: Fetch images for products with variants
      const productIdsWithVariants = [...new Set(allVariants.map(v => v.product_id))];
      const allImages = await fetchProductImages(productIdsWithVariants);
      const imageLookups = buildImageLookups(allImages);

      // Step 4: Build enrichment for new products
      const variantsByProduct = groupVariants(allVariants);

      let withImage = 0;
      let withoutImage = 0;

      for (const [productId, variants] of variantsByProduct) {
        const totalStock = variants.reduce((sum, variant) => sum + (variant.stock_quantity ?? 0), 0);
        const presentation = resolveVariantPresentation(productId, variants, imageLookups);
        const bestImage = presentation.image;
        const bestColorName = presentation.variant?.color_name ?? null;
        const bestColorHex = presentation.variant?.color_hex ?? null;

        if (bestImage) withImage++; else withoutImage++;

        accumulatedMapRef.current.set(productId, {
          image: bestImage,
          stock: totalStock,
          stockStatus: stockStatus(totalStock),
          colorName: bestColorName,
          colorHex: bestColorHex,
        });
      }

      // Mark all new product IDs as enriched (even those without variants)
      for (const id of newProductIds) {
        enrichedIdsRef.current.add(id);
      }

      logger.log(`[useColorEnrichment] Enriched ${newProductIds.length} new products (${accumulatedMapRef.current.size} total) for ${colorIdArray.length} color IDs | withImage: ${withImage}, withoutImage: ${withoutImage}, noVariant: ${newProductIds.length - variantsByProduct.size}`);
      return new Map(accumulatedMapRef.current);
    },
    enabled: queryEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes (reduced redundant background fetches)
    gcTime: 15 * 60 * 1000,
  });

  // Return accumulated map even when query isn't running (for already-enriched products)
  const resultMap = query.data || (accumulatedMapRef.current.size > 0 ? accumulatedMapRef.current : undefined);

  return { data: resultMap, isLoading: query.isLoading, isFetching: query.isFetching };
}
