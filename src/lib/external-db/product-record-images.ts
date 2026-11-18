import { isPrivateStorageUrl, resolvePrivateStorageUrlSafe } from '@/lib/private-storage';
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

type ProductImageRecord = {
  primary_image_url?: string | null;
  image_url?: string | null;
  og_image_url?: string | null;
  images?: string[] | null;
};

const hasPrivateReference = (record: ProductImageRecord): boolean => {
  // Alem da referencia duravel `supabase-storage://`, registros legados guardam a URL
  // `/storage/v1/object/public/...` do bucket privado. O resolvedor individual trata os
  // dois formatos; o filtro em lote precisa reconhecer os mesmos valores.
  const isPrivate = (value: unknown) =>
    typeof value === 'string' && isPrivateStorageUrl(value, PRODUCT_IMAGE_BUCKET);
  return isPrivate(record.primary_image_url)
    || isPrivate(record.image_url)
    || isPrivate(record.og_image_url)
    || (Array.isArray(record.images) && record.images.some(isPrivate));
};

/**
 * Versao em lote para as leituras que consultam `products` direto pelo bridge
 * (novidades, reposicoes, kit builder, simulador). Sem isso esses fluxos
 * entregam a referencia duravel `supabase-storage://` para o `<img src>`.
 * Registros sem referencia privada nao geram nenhuma requisicao.
 */
export async function resolveProductImageRecords<T extends ProductImageRecord>(
  records: readonly T[] | null | undefined,
): Promise<T[]> {
  const list = Array.isArray(records) ? [...records] : [];
  const pending = list.filter(hasPrivateReference);
  if (pending.length === 0) return list;
  await Promise.all(pending.map(record => resolveProductRecordImages(record as PromobrindProduct)));
  return list;
}
