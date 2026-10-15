/**
 * useClientsComparison — paraleliza dados de até 3 clientes para comparação lado-a-lado.
 * Composição de hooks BI existentes (sem novas RPCs).
 */
import { useClientHealthScore } from "./useClientHealthScore";
import { useClientBI } from "./useClientBI";
import { useClientSeasonality } from "./useClientSeasonality";
import { useClientAffinity } from "./useClientAffinity";
import { useClientCategoryAffinity } from "./useClientCategoryAffinity";
import { useIndustryCategoryTrends } from "./useIndustryCategoryTrends";
import { useCrmCompanyStrict } from "@/hooks/useCrmCompanies";
import { getCompanyDisplayName } from "@/types/crm";

export interface ClientComparisonRow {
  clientId: string;
  clientName: string;
  ramoAtividade: string | null;
  isLoading: boolean;
  isUnavailable: boolean;
  error: unknown;
  failedSources: string[];
  refetch: () => Promise<unknown>;
  unavailable: {
    health: boolean;
    history: boolean;
    topCategory: boolean;
    favoriteCategory: boolean;
    opportunityCategory: boolean;
    seasonality: boolean;
  };
  score: number;
  tier: "healthy" | "attention" | "risk" | "unknown";
  ltv: number;
  avgTicket: number;
  ordersCount: number;
  daysSinceLastOrder: number | null;
  topCategory: string | null;
  /** Categoria favorita do eixo CATEGORIA (com share) */
  favoriteCategoryLabel: string | null;
  favoriteCategorySharePct: number;
  /** Categoria de oportunidade GAP (setor compra, cliente não) */
  opportunityCategoryLabel: string | null;
  opportunityCategorySharePct: number;
  nextPeakLabel: string;
  daysToNextPeak: number | null;
  shareOfWalletPct: number;
}

type CategoryAffinity = ReturnType<typeof useClientCategoryAffinity>;
type ClientAffinity = ReturnType<typeof useClientAffinity>;
type ClientBi = ReturnType<typeof useClientBI>;
type IndustryTrends = ReturnType<typeof useIndustryCategoryTrends>;
type ClientHealth = ReturnType<typeof useClientHealthScore>;
type ClientSeasonality = ReturnType<typeof useClientSeasonality>;
type CrmCompanyQuery = ReturnType<typeof useCrmCompanyStrict>;

interface SourceAvailability {
  crm: boolean;
  history: boolean;
  affinity: boolean;
  categoryAffinity: boolean;
  categoryIndustry: boolean;
  seasonality: boolean;
  health: boolean;
}

interface FailedSource {
  name: string;
  error: unknown;
  retry?: () => Promise<unknown>;
}

interface ComparisonSources {
  companyQuery: CrmCompanyQuery;
  health: ClientHealth;
  bi: ClientBi;
  seas: ClientSeasonality;
  affinity: ClientAffinity;
  catAffinity: CategoryAffinity;
  catIndustry: IndustryTrends;
}

function availableValue<T>(unavailable: boolean, value: T | null | undefined): T | null {
  return unavailable ? null : value ?? null;
}

function resolveTopCategory(
  categoryAffinity: CategoryAffinity,
  affinity: ClientAffinity,
  bi: ClientBi,
  unavailable: { categoryAffinity: boolean; affinity: boolean; history: boolean },
): string | null {
  const candidates = [
    availableValue(unavailable.categoryAffinity, categoryAffinity.favorite?.label),
    availableValue(unavailable.affinity, affinity.data?.categories?.[0]?.category),
    availableValue(unavailable.history, bi.topCategories?.[0]?.category),
  ];
  return candidates.find((candidate): candidate is string => candidate !== null) ?? null;
}

function resolveFavoriteCategory(categoryAffinity: CategoryAffinity) {
  return {
    label: categoryAffinity.favorite?.label ?? null,
    sharePct: Math.round(categoryAffinity.favorite?.revenueSharePct ?? 0),
  };
}

function resolveOpportunity(categoryAffinity: CategoryAffinity, industry: IndustryTrends) {
  const clientSlugs = new Set(categoryAffinity.categories.map((category) => category.slug));
  const opportunity = industry.categories.find(
    (category) => !clientSlugs.has(category.slug) && category.revenueSharePct >= 8,
  );
  return {
    label: opportunity?.label ?? null,
    sharePct: Math.round(opportunity?.revenueSharePct ?? 0),
  };
}

function resolveNextPeakLabel(daysToNextPeak: number | null, nextPeakMonth: number | null) {
  if (daysToNextPeak === 0) return "Hoje";
  return daysToNextPeak !== null && nextPeakMonth !== null ? `${daysToNextPeak}d` : "—";
}

function getSourceAvailability(sources: ComparisonSources): SourceAvailability {
  const { companyQuery, health, bi, seas, affinity, catAffinity, catIndustry } = sources;
  const crm = Boolean(companyQuery.isError);
  const history = bi.isUnavailable;
  return {
    crm,
    history,
    affinity: Boolean(affinity.isError),
    categoryAffinity: Boolean(catAffinity.isError),
    categoryIndustry: Boolean(catIndustry.isError),
    seasonality: [Boolean(seas.isError), Boolean(seas.industryError), crm].some(Boolean),
    health: [health.isError, crm, history, Boolean(seas.isError)].some(Boolean),
  };
}

function getFailedSources(
  sources: ComparisonSources,
  unavailable: SourceAvailability,
): FailedSource[] {
  const { companyQuery, health, bi, seas, affinity, catAffinity, catIndustry } = sources;
  const candidates: Array<FailedSource & { failed: boolean }> = [
    { name: "cadastro CRM", failed: companyQuery.isError, error: companyQuery.error, retry: companyQuery.refetch },
    { name: "histórico do cliente", failed: unavailable.history, error: bi.error, retry: bi.refetch },
    { name: "sazonalidade", failed: Boolean(seas.isError || seas.industryError), error: seas.error ?? seas.industryError, retry: seas.refetch },
    { name: "afinidade", failed: affinity.isError, error: affinity.error, retry: affinity.refetch },
    { name: "categorias do cliente", failed: catAffinity.isError, error: catAffinity.error, retry: catAffinity.refetch },
    { name: "categorias do setor", failed: catIndustry.isError, error: catIndustry.error, retry: catIndustry.refetch },
  ];
  const healthHasOwnFailure = Boolean(health.isError) &&
    [unavailable.crm, unavailable.history, Boolean(seas.isError || seas.industryError)]
      .every((failed) => !failed);
  if (healthHasOwnFailure) {
    candidates.push({ name: "Health Score", failed: true, error: health.error, retry: health.refetch });
  }
  return candidates.filter((source) => source.failed);
}

function comparisonIsLoading(sources: Array<{ isLoading: boolean }>) {
  return sources.some((source) => source.isLoading);
}

function reliableCategoryMetrics(
  categoryAffinity: CategoryAffinity,
  industry: IndustryTrends,
  unavailable: SourceAvailability,
) {
  const opportunityUnavailable = [
    unavailable.categoryAffinity,
    unavailable.categoryIndustry,
    unavailable.crm,
  ].some(Boolean);
  return {
    favorite: unavailable.categoryAffinity
      ? { label: null, sharePct: 0 }
      : resolveFavoriteCategory(categoryAffinity),
    opportunity: opportunityUnavailable
      ? { label: null, sharePct: 0 }
      : resolveOpportunity(categoryAffinity, industry),
    opportunityUnavailable,
  };
}

function comparisonRetryFunctions(health: ClientHealth, failedSources: FailedSource[]) {
  const functions = failedSources
    .map((source) => source.retry)
    .filter((retry): retry is () => Promise<unknown> => Boolean(retry));
  if (health.isError && !failedSources.some((source) => source.name === "Health Score")) {
    functions.push(health.refetch);
  }
  return functions;
}

function reliableHealthMetrics(health: ClientHealth, unavailable: boolean) {
  if (unavailable) return { score: 0, tier: "unknown" as const, shareOfWalletPct: 0 };
  return { score: health.score, tier: health.tier, shareOfWalletPct: health.shareOfWalletPct };
}

function reliableSeasonalityMetrics(seasonality: ClientSeasonality, unavailable: boolean) {
  if (unavailable) return { nextPeakLabel: "—", daysToNextPeak: null };
  return {
    nextPeakLabel: resolveNextPeakLabel(seasonality.daysToNextPeak, seasonality.nextPeakMonth),
    daysToNextPeak: seasonality.daysToNextPeak,
  };
}

function buildComparisonRow(
  clientId: string,
  sources: ComparisonSources,
  sourceUnavailable: SourceAvailability,
  failedSources: FailedSource[],
): ClientComparisonRow {
  const { companyQuery, health, bi, seas, affinity, catAffinity, catIndustry } = sources;
  const company = companyQuery.data;
  const topCategory = resolveTopCategory(catAffinity, affinity, bi, {
    categoryAffinity: sourceUnavailable.categoryAffinity,
    affinity: sourceUnavailable.affinity,
    history: sourceUnavailable.history,
  });
  const { favorite, opportunity, opportunityUnavailable } = reliableCategoryMetrics(
    catAffinity,
    catIndustry,
    sourceUnavailable,
  );
  const healthMetrics = reliableHealthMetrics(health, sourceUnavailable.health);
  const seasonalityMetrics = reliableSeasonalityMetrics(seas, sourceUnavailable.seasonality);
  const retryFunctions = comparisonRetryFunctions(health, failedSources);
  return {
    clientId,
    clientName: company ? getCompanyDisplayName(company) : "Cliente",
    ramoAtividade: company?.ramo_atividade ?? null,
    isLoading: comparisonIsLoading(Object.values(sources)),
    isUnavailable: failedSources.length > 0,
    error: failedSources[0]?.error ?? null,
    failedSources: failedSources.map((source) => source.name),
    refetch: async () => Promise.allSettled(retryFunctions.map((retry) => retry())),
    unavailable: {
      health: sourceUnavailable.health,
      history: sourceUnavailable.history,
      topCategory: [sourceUnavailable.categoryAffinity, sourceUnavailable.affinity, sourceUnavailable.history].every(Boolean),
      favoriteCategory: sourceUnavailable.categoryAffinity,
      opportunityCategory: opportunityUnavailable,
      seasonality: sourceUnavailable.seasonality,
    },
    score: healthMetrics.score,
    tier: healthMetrics.tier,
    ltv: bi.ltv, avgTicket: bi.avgTicket, ordersCount: bi.ordersCount,
    daysSinceLastOrder: bi.daysSinceLastOrder, topCategory,
    favoriteCategoryLabel: favorite.label, favoriteCategorySharePct: favorite.sharePct,
    opportunityCategoryLabel: opportunity.label, opportunityCategorySharePct: opportunity.sharePct,
    nextPeakLabel: seasonalityMetrics.nextPeakLabel,
    daysToNextPeak: seasonalityMetrics.daysToNextPeak,
    shareOfWalletPct: healthMetrics.shareOfWalletPct,
  };
}

/** Hook por cliente (precisa ser chamado em ordem fixa). */
export function useSingleClientComparisonRow(clientId: string): ClientComparisonRow {
  const companyQuery = useCrmCompanyStrict(clientId);
  const ramo = companyQuery.data?.ramo_atividade ?? null;
  const health = useClientHealthScore(clientId, ramo);
  const bi = useClientBI(clientId);
  const seas = useClientSeasonality(clientId, ramo);
  const affinity = useClientAffinity(clientId);
  const catAffinity = useClientCategoryAffinity(clientId);
  const catIndustry = useIndustryCategoryTrends(ramo, clientId);

  const sources = { companyQuery, health, bi, seas, affinity, catAffinity, catIndustry };
  const sourceUnavailable = getSourceAvailability(sources);
  return buildComparisonRow(clientId, sources, sourceUnavailable, getFailedSources(sources, sourceUnavailable));
}
