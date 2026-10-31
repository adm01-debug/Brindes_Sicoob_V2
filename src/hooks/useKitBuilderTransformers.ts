/**
 * Kit Builder Transformers
 * Pure functions to transform external DB products into Kit types.
 */

import { getProductImageUrl, getProductPrice } from '@/lib/external-db';
import {
  type KitBox,
  type KitItem,
  type ExternalProductForKit,
  mmToCm,
  calculateVolume,
  extractProductDimensions,
  estimateDefaultDimensions,
} from '@/lib/kit-builder';

function resolveProductMaterial(product: ExternalProductForKit): string | undefined {
  if (product.material) return product.material;
  if (!Array.isArray(product.materials) || product.materials.length === 0) return undefined;

  const firstMaterial = product.materials[0];
  if (typeof firstMaterial === 'string') return firstMaterial;
  if (firstMaterial && typeof firstMaterial === 'object') {
    const candidate = (firstMaterial as { name?: string; material?: string }).name ?? (firstMaterial as { name?: string; material?: string }).material;
    return typeof candidate === 'string' && candidate.trim() ? candidate : undefined;
  }

  return undefined;
}

function productDimensions(product: ExternalProductForKit) {
  const width = mmToCm(product.width_mm);
  const height = mmToCm(product.height_mm);
  const depth = mmToCm(product.length_mm);
  if (width && height && depth) return { width, height, depth };
  return extractProductDimensions(product);
}

function hasPositiveDimensions(
  dimensions: { width: number; height: number; depth: number },
): boolean {
  return dimensions.width > 0 && dimensions.height > 0 && dimensions.depth > 0;
}

function materialMaxWeight(material: string): number | undefined {
  if (material.includes('micro') || material.includes('papelão')) return 2000;
  if (material.includes('kraft') || material.includes('cartão')) return 3000;
  if (material.includes('madeira') || material.includes('mdf')) return 10000;
  if (material.includes('metal') || material.includes('lata')) return 15000;
  return undefined;
}

export function transformToKitBox(product: ExternalProductForKit): KitBox | null {
  const dimensions = productDimensions(product);
  if (!dimensions) return null;
  if (!hasPositiveDimensions(dimensions)) return null;

  const volume = calculateVolume(dimensions.width, dimensions.height, dimensions.depth);

  // Estimate max weight based on material
  const mat = resolveProductMaterial(product)?.toLowerCase() || '';

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    imageUrl: getProductImageUrl(product),
    price: getProductPrice(product),
    internalWidth: dimensions.width,
    internalHeight: dimensions.height,
    internalDepth: dimensions.depth,
    internalVolume: volume,
    material: resolveProductMaterial(product),
    weight: product.weight_g ?? undefined,
    maxWeight: materialMaxWeight(mat),
  };
}

export function transformToKitItem(product: ExternalProductForKit, category?: string): KitItem {
  let dimensions: { width: number; height: number; depth: number } | null = null;

  const wMm = mmToCm(product.width_mm);
  const hMm = mmToCm(product.height_mm);
  const lMm = mmToCm(product.length_mm);
  if (wMm && hMm && lMm) {
    dimensions = { width: wMm, height: hMm, depth: lMm };
  }

  if (!dimensions) {
    dimensions = extractProductDimensions(product) || estimateDefaultDimensions(category);
  }

  const volume = calculateVolume(dimensions.width, dimensions.height, dimensions.depth);

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    imageUrl: getProductImageUrl(product),
    price: getProductPrice(product),
    width: dimensions.width,
    height: dimensions.height,
    depth: dimensions.depth,
    volume,
    weight: product.weight_g ?? undefined,
    material: resolveProductMaterial(product),
    category,
    quantity: 1,
    isOptional: false,
    isReplaceable: product.is_replaceable ?? false,
    allowsPersonalization: product.allows_personalization ?? true,
    allowedVariantIds: product.allowed_variant_ids ?? undefined,
  };
}
