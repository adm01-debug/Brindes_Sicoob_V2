/**
 * Resolve TODAS as variantes de cor que correspondem aos filtros ativos.
 * Usado pelo mini-carrossel de variantes no ProductCard quando múltiplas cores são filtradas.
 */
import { COLOR_GROUP_HEX } from './color-group-hex';
import type { ActiveColorFilter } from './color-image-resolver';

export interface MatchedColorVariant {
  /** Nome da variante (ex: "Azul Royal", "Rosa Bebê") */
  name: string;
  /** Hex code da cor */
  hex: string;
  /** URL da imagem específica da variante (se disponível) */
  image?: string;
  /** Slug do grupo de cor */
  groupSlug?: string;
  /** Slug da variação de cor */
  variationSlug?: string;
}

type ProductColorCandidate = {
  name?: string;
  hex?: string;
  group?: string;
  groupSlug?: string;
  variationSlug?: string;
  image?: string;
  images?: string[];
};

function fallbackColors(groups: string[]): MatchedColorVariant[] {
  return groups
    .filter(group => Boolean(COLOR_GROUP_HEX[group]))
    .map(group => ({ name: group.charAt(0).toUpperCase() + group.slice(1), hex: COLOR_GROUP_HEX[group] ?? '#888', groupSlug: group }));
}

function addMatch(results: MatchedColorVariant[], seen: Set<string>, color: ProductColorCandidate, slug: string): void {
  const dedupKey = (color.name || '') + '|' + (color.hex || '');
  if (seen.has(dedupKey)) return;
  seen.add(dedupKey);
  results.push({
    name: color.name || slug,
    hex: color.hex || COLOR_GROUP_HEX[slug] || '#888',
    image: color.images?.[0] || color.image,
    groupSlug: color.groupSlug,
    variationSlug: color.variationSlug,
  });
}

function groupMatches(colors: ProductColorCandidate[], slug: string): ProductColorCandidate[] {
  const normalizedSlug = slug.toLowerCase().trim();
  return colors.filter(color => {
    if (color.groupSlug === slug) return true;
    const group = (color.group || '').toLowerCase().trim();
    return group === normalizedSlug || group.includes(normalizedSlug) || normalizedSlug.includes(group);
  });
}

function addGroupMatches(results: MatchedColorVariant[], seen: Set<string>, colors: ProductColorCandidate[], groups: string[]): void {
  for (const group of groups) {
    const firstMatch = groupMatches(colors, group)[0];
    if (firstMatch) {
      addMatch(results, seen, firstMatch, group);
      continue;
    }
    const fallback = fallbackColors([group])[0];
    const fallbackKey = `${group}|fallback`;
    if (fallback && !seen.has(fallbackKey)) {
      seen.add(fallbackKey);
      results.push(fallback);
    }
  }
}

function addVariationMatches(results: MatchedColorVariant[], seen: Set<string>, colors: ProductColorCandidate[], variations: string[]): void {
  for (const variation of variations) {
    const match = colors.find(color => color.variationSlug === variation);
    if (match) addMatch(results, seen, match, variation);
  }
}

/**
 * Retorna TODAS as variantes de um produto que fazem match com os filtros de cor ativos.
 * Diferente de resolveHighlightHex (que retorna a primeira), esta retorna um array completo.
 */
export function resolveAllMatchingColors(
  productColors: ProductColorCandidate[],
  activeColorFilter?: ActiveColorFilter | null,
): MatchedColorVariant[] {
  if (!activeColorFilter) return [];
  if (!activeColorFilter.groups.length && !activeColorFilter.variations.length) return [];
  if (!productColors?.length) return fallbackColors(activeColorFilter.groups);

  const seen = new Set<string>();
  const results: MatchedColorVariant[] = [];
  addGroupMatches(results, seen, productColors, activeColorFilter.groups);
  addVariationMatches(results, seen, productColors, activeColorFilter.variations);
  return results;
}
