/**
 * Resolve a imagem específica de um produto baseado nos filtros de cor ativos.
 * 
 * Lógica baseada nos dados REAIS do banco:
 * 1. Usa groupSlug e variationSlug (vindos do enriquecimento color_variations → color_groups)
 * 2. Fallback para keyword matching apenas se groupSlug não estiver disponível
 * 3. Retorna color.image (thumbnail da variante daquela cor)
 */

import type { Product, ProductColor } from "@/hooks/useProducts";

export interface ActiveColorFilter {
  groups: string[];     // slugs dos grupos selecionados (ex: ['rosa', 'azul'])
  variations: string[]; // slugs das variações selecionadas (ex: ['azul-marinho'])
}

function hasActiveColors(activeColors: ActiveColorFilter | null | undefined): activeColors is ActiveColorFilter {
  return Boolean(activeColors && (activeColors.groups.length || activeColors.variations.length));
}

function normalizedSlug(slug: string): string {
  return slug.toLowerCase().replace(/-/g, ' ');
}

function findVariationColor(colors: ProductColor[], slug: string): ProductColor | undefined {
  const direct = colors.find(color => color.variationSlug === slug);
  if (direct) return direct;
  const normalized = normalizedSlug(slug);
  return colors.find(color => {
    const name = color.name.toLowerCase();
    return name.includes(normalized) || normalized.includes(name);
  });
}

function findGroupColor(colors: ProductColor[], slug: string): ProductColor | undefined {
  const direct = colors.find(color => color.groupSlug === slug);
  if (direct) return direct;
  const normalized = normalizedSlug(slug);
  return colors.find(color => {
    const group = color.group.toLowerCase();
    const name = color.name.toLowerCase();
    return group === normalized || group.includes(normalized) || name.includes(normalized);
  });
}

function firstMatchingColor(
  colors: ProductColor[],
  slugs: string[],
  matcher: (colors: ProductColor[], slug: string) => ProductColor | undefined,
): ProductColor | undefined {
  for (const slug of slugs) {
    const color = matcher(colors, slug);
    if (color) return color;
  }
  return undefined;
}

function firstMatchingImage(
  colors: ProductColor[],
  slugs: string[],
  matcher: (colors: ProductColor[], slug: string) => ProductColor | undefined,
): string | undefined {
  for (const slug of slugs) {
    const image = getColorImage(matcher(colors, slug));
    if (image) return image;
  }
  return undefined;
}

/**
 * Dado um produto e os filtros de cor ativos, retorna a URL da imagem
 * da cor que corresponde ao filtro, ou undefined para fallback.
 */
export function resolveColorImage(
  product: Product,
  activeColors: ActiveColorFilter | null | undefined
): string | undefined {
  if (!hasActiveColors(activeColors)) return undefined;
  if (!product.colors?.length) return undefined;
  const variationImage = firstMatchingImage(product.colors, activeColors.variations, findVariationColor);
  return variationImage || firstMatchingImage(product.colors, activeColors.groups, findGroupColor);
}

/**
 * Extrai a melhor imagem de um ProductColor
 */
function getColorImage(color: ProductColor | undefined): string | undefined {
  if (!color) return undefined;
  if (color.images?.length) return color.images[0];
  if (color.image) return color.image;
  return undefined;
}

type ProductVariation = NonNullable<Product['variations']>[number];

function findVariantForColor(product: Product, color: ProductColor): ProductVariation | undefined {
  return product.variations?.find(variant => variant.sku === color.code || variant.color?.name === color.name);
}

function matchVariation(product: Product, slug: string): ProductVariation | undefined {
  const color = product.colors.find(item => item.variationSlug === slug);
  const byColor = color ? findVariantForColor(product, color) : undefined;
  if (byColor) return byColor;
  const normalized = normalizedSlug(slug);
  return product.variations?.find(variant => {
    const name = variant.color?.name?.toLowerCase() || '';
    return name === normalized || name.includes(normalized);
  });
}

function stockForGroup(product: Product, slug: string): number | undefined {
  const color = product.colors.find(item => item.groupSlug === slug);
  const variant = color?.code ? findVariantForColor(product, color) : undefined;
  if (variant) return variant.stock ?? 0;
  const groupColors = product.colors.filter(item => item.groupSlug === slug);
  if (!groupColors.length) return undefined;
  return groupColors.reduce((total, item) => {
    const itemVariant = product.variations?.find(candidate => candidate.color?.name === item.name);
    return total + (itemVariant?.stock ?? 0);
  }, 0);
}

function firstStock(slugs: string[], resolver: (slug: string) => number | undefined): number | undefined {
  for (const slug of slugs) {
    const stock = resolver(slug);
    if (stock !== undefined) return stock;
  }
  return undefined;
}

function stockResult(stock: number | undefined): { stock: number; stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock' } | undefined {
  if (stock === undefined) return undefined;
  if (stock <= 0) return { stock, stockStatus: 'out-of-stock' };
  if (stock < 10) return { stock, stockStatus: 'low-stock' };
  return { stock, stockStatus: 'in-stock' };
}

/**
 * Retorna o nome da cor que está sendo filtrada para o badge
 */
/**
 * Resolve o estoque da variação que corresponde ao filtro de cor ativo.
 * Retorna { stock, stockStatus } ou undefined se nenhum filtro ativo.
 */
export function resolveColorStock(
  product: Product,
  activeColors: ActiveColorFilter | null | undefined
): { stock: number; stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock' } | undefined {
  if (!hasActiveColors(activeColors)) return undefined;
  if (!product.variations?.length) return undefined;
  const variationStock = firstStock(activeColors.variations, slug => matchVariation(product, slug)?.stock);
  const groupStock = firstStock(activeColors.groups, slug => stockForGroup(product, slug));
  return stockResult(variationStock ?? groupStock);
}

export function getActiveColorName(
  product: Product,
  activeColors: ActiveColorFilter | null | undefined
): string | undefined {
  if (!hasActiveColors(activeColors)) return undefined;
  if (!product.colors?.length) return undefined;
  const variation = firstMatchingColor(product.colors, activeColors.variations, findVariationColor);
  const group = firstMatchingColor(product.colors, activeColors.groups, findGroupColor);
  return (variation || group)?.name;
}
