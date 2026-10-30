/**
 * executive-summary — helpers de agregação para o dossiê executivo.
 *
 * `buildCategorySection` produz a estrutura "Mapa de Categorias" usada
 * no PDF e no PPTX: top categorias do cliente, top do setor, GAPs
 * prioritários (forte no setor / fraco no cliente) e insight textual.
 */
import type { ClientCategoryAffinityResult, CategoryAggregate } from "@/hooks/bi/useClientCategoryAffinity";
import type { IndustryCategoryTrendsResult, IndustryCategoryAggregate } from "@/hooks/bi/useIndustryCategoryTrends";

export interface CategoryMapRow {
  label: string;
  clientSharePct: number;
  industrySharePct: number;
  trend: "up" | "down" | "stable" | "n/a";
  deltaPct: number | null;
}

export interface CategoryGap {
  label: string;
  industrySharePct: number;
  reason: string;
}

export interface CategorySection {
  hasData: boolean;
  isMock: boolean;
  rows: CategoryMapRow[];
  gaps: CategoryGap[];
  insight: string;
  favoriteLabel: string | null;
  topGapLabel: string | null;
}

const GAP_MIN_INDUSTRY_SHARE = 8; // % no setor para considerar relevante
const STRONG_CLIENT_SHARE = 5;    // % do cliente para "ter"

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function firstDefined<T>(values: Array<T | null | undefined>, fallback: T): T {
  for (const value of values) {
    if (value !== null && value !== undefined) return value;
  }
  return fallback;
}

function arrayOrEmpty<T>(value: T[] | null | undefined): T[] {
  return value || [];
}

function categoryLabel(value: { label: string } | null | undefined): string | null {
  return value ? value.label : null;
}

function hasCategoryData(rows: CategoryMapRow[], gaps: CategoryGap[]): boolean {
  return rows.length > 0 || gaps.length > 0;
}

function usesMockData(
  affinity: ClientCategoryAffinityResult | null | undefined,
  industry: IndustryCategoryTrendsResult | null | undefined,
): boolean {
  return Boolean(affinity?.isMock || industry?.isMock);
}

function orderedCategorySlugs(
  client: CategoryAggregate[],
  industry: IndustryCategoryAggregate[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const category of [...client, ...industry]) {
    if (seen.has(category.slug)) continue;
    seen.add(category.slug);
    result.push(category.slug);
  }
  return result;
}

function categoryRow(
  slug: string,
  client: Map<string, CategoryAggregate>,
  industry: Map<string, IndustryCategoryAggregate>,
): CategoryMapRow {
  const clientCategory = client.get(slug);
  const industryCategory = industry.get(slug);
  return {
    label: firstDefined([clientCategory?.label, industryCategory?.label], slug),
    clientSharePct: clampPct(firstDefined([clientCategory?.revenueSharePct], 0)),
    industrySharePct: clampPct(firstDefined([industryCategory?.revenueSharePct], 0)),
    trend: firstDefined([clientCategory?.trend], "n/a"),
    deltaPct: firstDefined([clientCategory?.deltaPct], null),
  };
}

function categoryGaps(
  industry: IndustryCategoryAggregate[],
  client: Map<string, CategoryAggregate>,
): CategoryGap[] {
  return industry
    .filter(category => category.revenueSharePct >= GAP_MIN_INDUSTRY_SHARE)
    .filter(category => (client.get(category.slug)?.revenueSharePct ?? 0) < STRONG_CLIENT_SHARE)
    .slice(0, 4)
    .map(category => ({
      label: category.label,
      industrySharePct: clampPct(category.revenueSharePct),
      reason: `${category.revenueSharePct.toFixed(0)}% da receita do setor — cliente ainda não compra de forma relevante.`,
    }));
}

function categoryInsight(favorite: CategoryAggregate | null, topGap: CategoryGap | null): string {
  if (favorite && topGap) {
    return `Cliente tem afinidade forte em "${favorite.label}" (${favorite.revenueSharePct.toFixed(0)}% da receita). Oportunidade clara: introduzir "${topGap.label}" — categoria que move ${topGap.industrySharePct.toFixed(0)}% do setor e ainda não está no mix.`;
  }
  if (favorite) {
    return `Cliente concentrado em "${favorite.label}" (${favorite.revenueSharePct.toFixed(0)}% da receita). Mix do setor sem GAPs relevantes para sugerir agora.`;
  }
  if (topGap) {
    return `Sem histórico relevante do cliente. Categoria líder do setor: "${topGap.label}" (${topGap.industrySharePct.toFixed(0)}%) — bom ponto de partida para prospecção.`;
  }
  return "Sem dados suficientes para mapa de categorias.";
}

export function buildCategorySection(
  catAffinity: ClientCategoryAffinityResult | null | undefined,
  catIndustry: IndustryCategoryTrendsResult | null | undefined,
): CategorySection {
  const clientCats = arrayOrEmpty(catAffinity?.categories);
  const industryCats = arrayOrEmpty(catIndustry?.categories);

  const clientBySlug = new Map<string, CategoryAggregate>(clientCats.map((c) => [c.slug, c]));
  const industryBySlug = new Map<string, IndustryCategoryAggregate>(industryCats.map((c) => [c.slug, c]));

  const rows = orderedCategorySlugs(clientCats, industryCats)
    .slice(0, 8)
    .map(slug => categoryRow(slug, clientBySlug, industryBySlug));

  // GAPs: forte no setor (≥8%) e fraco no cliente (<5%)
  const gaps = categoryGaps(industryCats, clientBySlug);

  const favorite = firstDefined([catAffinity?.favorite, clientCats[0]], null);
  const favoriteLabel = categoryLabel(favorite);
  const topGap = firstDefined([gaps[0]], null);
  const topGapLabel = categoryLabel(topGap);

  const insight = categoryInsight(favorite, topGap);

  const hasData = hasCategoryData(rows, gaps);
  const isMock = usesMockData(catAffinity, catIndustry);

  return { hasData, isMock, rows, gaps, insight, favoriteLabel, topGapLabel };
}
