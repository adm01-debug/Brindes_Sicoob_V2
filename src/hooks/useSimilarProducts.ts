/**
 * useSimilarProducts — Fetches similar products via the external DB.
 * 
 * Strategy:
 * 1. Query `product_relationships` (107k+ cross-supplier pairs) for direct similar matches
 * 2. Fallback: Query `product_group_members` for group-based siblings
 * 3. Last resort: Related products from same supplier/category
 * 
 * All levels use lightweight batch queries (no individual product detail fetches).
 */
import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';
import type { Product } from '@/types/product-catalog';
import { logger } from '@/lib/logger';

export interface SimilarProductItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  image_url: string;
  supplier_name: string;
  category_name: string;
  category_id?: string;
  colors_count?: number;
  stock?: number;
}

/** Lightweight product columns needed for similar product cards */
const SIMILAR_PRODUCT_SELECT = 'id,name,sku,sale_price,primary_image_url,supplier_id,stock_quantity,brand,category_id';

interface LightweightProduct {
  id: string;
  name: string;
  sku: string;
  sale_price: number;
  primary_image_url: string;
  supplier_id: string;
  stock_quantity: number;
  brand: string;
  category_id: string;
}

function mapLightweightToSimilarItem(p: LightweightProduct): SimilarProductItem {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: p.sale_price,
    image_url: p.primary_image_url || '/placeholder.svg',
    supplier_name: p.brand || 'Fornecedor',
    category_name: '',
    category_id: p.category_id || undefined,
    colors_count: 0,
    stock: p.stock_quantity || 0,
  };
}

/** Batch-fetch lightweight product data by an array of IDs */
async function fetchProductsByIds(ids: string[]): Promise<SimilarProductItem[]> {
  if (ids.length === 0) return [];

  const { records } = await invokeExternalDb<LightweightProduct>({
    table: 'products',
    operation: 'select',
    select: SIMILAR_PRODUCT_SELECT,
    filters: { id: ids, is_active: true },
    limit: ids.length,
  });

  return (records || [])
    .filter(p => p.sale_price > 0)
    .map(mapLightweightToSimilarItem);
}

async function fetchRelationshipProducts(productId: string): Promise<SimilarProductItem[]> {
  try {
    const { records } = await invokeExternalDb<{ related_product_id: string }>({
      table: 'product_relationships',
      operation: 'select',
      select: 'related_product_id',
      filters: { product_id: productId, relationship_type: 'similar' },
      limit: 50,
    });
    return fetchProductsByIds((records ?? []).map(item => item.related_product_id));
  } catch (error) {
    logger.warn('[useSimilarProducts] product_relationships query failed, trying groups:', error);
    return [];
  }
}

async function fetchGroupProducts(productId: string): Promise<SimilarProductItem[]> {
  try {
    const { records: memberships } = await invokeExternalDb<{ group_id: string }>({
      table: 'product_group_members',
      operation: 'select',
      select: 'group_id',
      filters: { product_id: productId },
      limit: 10,
    });
    const groupIds = [...new Set((memberships ?? []).map(item => item.group_id).filter(Boolean))];
    if (groupIds.length === 0) return [];

    const { records: allMembers } = await invokeExternalDb<{ product_id: string }>({
      table: 'product_group_members',
      operation: 'select',
      select: 'product_id',
      filters: { group_id: `in.(${groupIds.join(',')})` },
      limit: 100,
    });
    const siblingIds = [...new Set(
      (allMembers ?? []).map(item => item.product_id).filter(id => id !== productId),
    )];
    return fetchProductsByIds(siblingIds);
  } catch (error) {
    logger.warn('[useSimilarProducts] product_group_members query failed, using fallback:', error);
    return [];
  }
}

function buildFallbackFilters(supplierId?: string, categoryId?: string): Record<string, unknown> {
  if (supplierId && supplierId !== 'unknown') return { is_active: true, supplier_id: supplierId };
  if (categoryId) return { is_active: true, main_category_id: categoryId };
  return { is_active: true };
}

async function fetchFallbackProducts(
  productId: string,
  supplierId?: string,
  categoryId?: string,
): Promise<SimilarProductItem[]> {
  try {
    const { records } = await invokeExternalDb<LightweightProduct>({
      table: 'products',
      operation: 'select',
      select: SIMILAR_PRODUCT_SELECT,
      filters: buildFallbackFilters(supplierId, categoryId),
      limit: 30,
      orderBy: { column: 'name', ascending: true },
    });
    return (records ?? [])
      .filter(item => item.id !== productId && item.sale_price > 0)
      .map(mapLightweightToSimilarItem);
  } catch (error) {
    logger.warn('[useSimilarProducts] Fallback query failed:', error);
    return [];
  }
}

async function findSimilarProducts(
  productId: string,
  supplierId?: string,
  categoryId?: string,
): Promise<SimilarProductItem[]> {
  const related = await fetchRelationshipProducts(productId);
  if (related.length > 0) return related;
  const grouped = await fetchGroupProducts(productId);
  return grouped.length > 0 ? grouped : fetchFallbackProducts(productId, supplierId, categoryId);
}

export function useSimilarProducts(product: Product | null | undefined) {
  const productId = product?.id;
  const supplierId = product?.supplier?.id;
  const categoryId = product?.category_id;

  return useQuery<SimilarProductItem[]>({
    queryKey: ['similar-products', productId],
    queryFn: async () => {
      if (!productId) return [];
      return findSimilarProducts(productId, supplierId, categoryId ?? undefined);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!product,
  });
}
