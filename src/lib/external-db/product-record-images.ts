import { resolvePrivateStorageUrlSafe } from '@/lib/private-storage';
import type { PromobrindProduct } from './product-types';

const PRODUCT_IMAGE_BUCKET = 'personalization-images';

/**
 * Produtos criados com upload antes de existir `productId` guardam as
 * referencias `supabase-storage://` no proprio registro de `products`, sem
 * linha correspondente em `product_images`. Sem esta resolucao as fotos nao
 * carregam na listagem nem na pagina de detalhe. Valores ja resolvidos passam
 * inalterados.
 */
export async function resolveProductRecordImages(product: PromobrindProduct): Promise<void> {
  const resolveField = async (value: string | null | undefined) =>
    (await resolvePrivateStorageUrlSafe(value, PRODUCT_IMAGE_BUCKET)) ?? value ?? null;

  const [primary, image, og] = await Promise.all([
    resolveField(product.primary_image_url),
    resolveField(product.image_url),
    resolveField(product.og_image_url),
  ]);
  if (primary) product.primary_image_url = primary;
  if (image) product.image_url = image;
  if (og) product.og_image_url = og;

  if (Array.isArray(product.images) && product.images.length) {
    const resolved = await Promise.all(product.images.map(value => resolveField(value)));
    product.images = resolved.filter((value): value is string => Boolean(value));
  }
}
