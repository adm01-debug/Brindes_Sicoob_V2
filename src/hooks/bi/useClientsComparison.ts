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
import { useCrmCompany } from "@/hooks/useCrmCompanies";
import { getCompanyDisplayName } from "@/types/crm";

export interface ClientComparisonRow {
  clientId: string;
  clientName: string;
  ramoAtividade: string | null;
  isLoading: boolean;
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

function resolveTopCategory(
  categoryAffinity: CategoryAffinity,
  affinity: ClientAffinity,
  bi: ClientBi,
): string | null {
  return (
    categoryAffinity.favorite?.label ??
    affinity.data?.categories?.[0]?.category ??
    bi.topCategories?.[0]?.category ??
    null
  );
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

/** Hook por cliente (precisa ser chamado em ordem fixa). */
export function useSingleClientComparisonRow(clientId: string): ClientComparisonRow {
  const { data: company } = useCrmCompany(clientId);
  const ramo = company?.ramo_atividade ?? null;
  const health = useClientHealthScore(clientId, ramo);
  const bi = useClientBI(clientId);
  const seas = useClientSeasonality(clientId, ramo);
  const affinity = useClientAffinity(clientId);
  const catAffinity = useClientCategoryAffinity(clientId);
  const catIndustry = useIndustryCategoryTrends(ramo, clientId);

  const topCategory = resolveTopCategory(catAffinity, affinity, bi);
  const favorite = resolveFavoriteCategory(catAffinity);
  const opportunity = resolveOpportunity(catAffinity, catIndustry);
  const nextPeakLabel = resolveNextPeakLabel(seas.daysToNextPeak, seas.nextPeakMonth);

  return {
    clientId,
    clientName: company ? getCompanyDisplayName(company) : "Cliente",
    ramoAtividade: ramo,
    isLoading: health.isLoading || bi.isLoading || seas.isLoading || catAffinity.isLoading || catIndustry.isLoading,
    score: health.score,
    tier: health.tier,
    ltv: bi.ltv,
    avgTicket: bi.avgTicket,
    ordersCount: bi.ordersCount,
    daysSinceLastOrder: bi.daysSinceLastOrder,
    topCategory,
    favoriteCategoryLabel: favorite.label,
    favoriteCategorySharePct: favorite.sharePct,
    opportunityCategoryLabel: opportunity.label,
    opportunityCategorySharePct: opportunity.sharePct,
    nextPeakLabel,
    daysToNextPeak: seas.daysToNextPeak,
    shareOfWalletPct: health.shareOfWalletPct,
  };
}
