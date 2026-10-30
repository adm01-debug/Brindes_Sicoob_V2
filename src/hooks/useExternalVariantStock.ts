import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';

export interface ExternalVariantStock {
  id: string;
  product_id: string;
  sku: string;
  supplier_sku: string | null;
  color_code: string | null;
  color_name: string | null;
  color_hex: string | null;
  size_code: string | null;
  stock_quantity: number | null;
  next_entry_date: string | null;
  next_entry_quantity: number | null;
  selected_thumbnail: string | null;
  images: string[] | null;
  bitrix_product_id: string | number | null;
}

interface VariantImageRow {
  id: string;
  variant_id: string | null;
  supplier_code: string | null;
  url_cdn: string | null;
  is_og_image: boolean | null;
  is_primary: boolean | null;
  image_type: string | null;
}

function indexImageVariant(image: VariantImageRow, index: Map<string, string>) {
  if (!image.variant_id || !image.url_cdn) return;
  if (!index.has(image.variant_id) || image.is_og_image) index.set(image.variant_id, image.url_cdn);
}

function indexImageCode(image: VariantImageRow, index: Map<string, string>) {
  if (!image.supplier_code || !image.url_cdn) return;
  const code = image.supplier_code.toUpperCase();
  if (!index.has(code) || image.is_og_image) index.set(code, image.url_cdn);
}

function indexVariantImages(images: VariantImageRow[]) {
  const byCode = new Map<string, string>();
  const byVariantId = new Map<string, string>();
  const primary = new Set<string>();
  for (const image of images) {
    if (!image.url_cdn || image.image_type === 'box') continue;
    if (image.is_primary || image.is_og_image) primary.add(image.url_cdn);
    indexImageVariant(image, byVariantId);
    indexImageCode(image, byCode);
  }
  return { byCode, byVariantId, primary };
}

function withVariantThumbnail(
  variant: ExternalVariantStock,
  images: ReturnType<typeof indexVariantImages>,
): ExternalVariantStock {
  const variantImage = images.byVariantId.get(variant.id) || null;
  const colorImage = variant.color_code ? images.byCode.get(variant.color_code.toUpperCase()) : null;
  const selectedImage = variant.selected_thumbnail && !images.primary.has(variant.selected_thumbnail)
    ? variant.selected_thumbnail
    : null;
  return {
    ...variant,
    next_entry_date: null,
    next_entry_quantity: null,
    selected_thumbnail: variantImage || colorImage || selectedImage || null,
    images: variant.images as string[] | null,
  };
}

/**
 * Hook to fetch product variants with optimized selective field loading.
 * Parallelizes variant and image fetching for maximum performance.
 */
export function useExternalVariantStock(productId: string | undefined) {
  return useQuery({
    queryKey: ['external-variant-stock', productId],
    queryFn: async (): Promise<ExternalVariantStock[]> => {
      if (!productId) return [];

      // Fetch variants and images in parallel
      const [variantsResult, imagesResult] = await Promise.all([
        invokeExternalDb<ExternalVariantStock>({
          table: 'product_variants',
          operation: 'select',
          // Optimized select: skip heavy text arrays unless fallback is needed
          select: 'id, product_id, sku, supplier_sku, color_code, color_name, color_hex, size_code, stock_quantity, selected_thumbnail, images, bitrix_product_id',
          filters: { product_id: productId, is_active: true },
          limit: 100,
        }),
        invokeExternalDb<VariantImageRow>({
          table: 'product_images',
          operation: 'select',
          select: 'id, variant_id, supplier_code, url_cdn, is_og_image, is_primary, image_type',
          filters: { product_id: productId },
          limit: 200,
        }),
      ]);

      const images = indexVariantImages(imagesResult.records ?? []);
      return (variantsResult.records ?? []).map((variant) => withVariantThumbnail(variant, images));
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
}
