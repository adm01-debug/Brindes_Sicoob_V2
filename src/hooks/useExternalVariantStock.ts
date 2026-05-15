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
        invokeExternalDb<{
          id: string;
          variant_id: string | null;
          supplier_code: string | null;
          url_cdn: string | null;
          is_og_image: boolean | null;
          is_primary: boolean | null;
          image_type: string | null;
        }>({
          table: 'product_images',
          operation: 'select',
          select: 'id, variant_id, supplier_code, url_cdn, is_og_image, is_primary, image_type',
          filters: { product_id: productId },
          limit: 200,
        }),
      ]);

      // Index images for fast lookup
      const imagesByCode = new Map<string, string>();
      const imagesByVariantId = new Map<string, string>();
      const primaryImages = new Set<string>();

      for (const img of imagesResult.records) {
        if (!img.url_cdn) continue;
        if (img.image_type === 'box') continue;

        if (img.is_primary || img.is_og_image) {
          primaryImages.add(img.url_cdn);
        }

        if (img.variant_id) {
          if (!imagesByVariantId.has(img.variant_id) || img.is_og_image) {
            imagesByVariantId.set(img.variant_id, img.url_cdn);
          }
        }

        if (img.supplier_code) {
          const code = img.supplier_code.toUpperCase();
          if (!imagesByCode.has(code) || img.is_og_image) {
            imagesByCode.set(code, img.url_cdn);
          }
        }
      }

      return variantsResult.records.map(v => {
        const variantImage = imagesByVariantId.get(v.id) || null;
        const colorImage = v.color_code ? imagesByCode.get(v.color_code.toUpperCase()) : null;
        const isMainImage = v.selected_thumbnail ? primaryImages.has(v.selected_thumbnail) : false;
        const validSelectedThumb = v.selected_thumbnail && !isMainImage ? v.selected_thumbnail : null;
        
        const thumbnail = variantImage || colorImage || validSelectedThumb || null;

        return {
          ...v,
          next_entry_date: null,
          next_entry_quantity: null,
          selected_thumbnail: thumbnail,
          images: v.images as string[] | null,
        };
      });
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
}
