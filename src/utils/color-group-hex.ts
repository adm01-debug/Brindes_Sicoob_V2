/**
 * Mapa de slugs de grupo de cor → hex representativo.
 * Usado para aplicar brilho dinâmico nos cards/lista/tabela quando um filtro de cor está ativo.
 */
export const COLOR_GROUP_HEX: Record<string, string> = {
  rosa: '#E91E8C',
  roxo: '#8B5CF6',
  azul: '#3B82F6',
  verde: '#22C55E',
  vermelho: '#EF4444',
  amarelo: '#EAB308',
  laranja: '#F97316',
  marrom: '#92400E',
  preto: '#1a1a1a',
  branco: '#E5E7EB',
  cinza: '#6B7280',
  bege: '#D2B48C',
  dourado: '#D4A017',
  prata: '#A8A9AD',
  nude: '#E8C4A0',
  lilás: '#C084FC',
  vinho: '#722F37',
  coral: '#FF6B6B',
  turquesa: '#06B6D4',
  creme: '#FFFDD0',
};

type ProductColor = { hex?: string; group?: string; groupSlug?: string; variationSlug?: string };

function groupHighlight(colors: ProductColor[], groups: string[]): string | null {
  if (groups.length === 0) return null;
  const match = colors.find(color => groups.includes(color.groupSlug || ''));
  if (match?.hex) return match.hex;
  const groupKey = groups.find(group => COLOR_GROUP_HEX[group]);
  return groupKey ? COLOR_GROUP_HEX[groupKey] ?? null : null;
}

function variationHighlight(colors: ProductColor[], variations: string[]): string | null {
  if (variations.length === 0) return null;
  return colors.find(color => variations.includes(color.variationSlug || ''))?.hex ?? null;
}

function configuredHighlight(colors: ProductColor[], highlights?: string[]): string | null {
  if (!highlights?.length) return null;
  return colors.find(color => highlights.includes(color.group || ''))?.hex ?? null;
}

/**
 * Resolve a cor hex do destaque com base nos filtros ativos e cores do produto.
 */
export function resolveHighlightHex(
  productColors: ProductColor[],
  activeColorFilter?: { groups: string[]; variations: string[] } | null,
  highlightColors?: string[],
): string | null {
  if (activeColorFilter) {
    const byGroup = groupHighlight(productColors, activeColorFilter.groups);
    if (byGroup) return byGroup;
    const byVariation = variationHighlight(productColors, activeColorFilter.variations);
    if (byVariation) return byVariation;
  }
  return configuredHighlight(productColors, highlightColors);
}
