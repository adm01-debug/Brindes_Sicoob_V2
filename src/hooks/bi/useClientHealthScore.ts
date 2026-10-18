/**
 * useClientHealthScore — score 0-100 de saúde do cliente.
 *
 * Pesos-base (normalizados entre os componentes com fonte confiável):
 *  - Recência       30% (≤30d=100, ≤60d=80, ≤90d=60, ≤180d=30, >180d=0)
 *  - Frequência     25% (vs média do setor)
 *  - Ticket vs setor 20%
 *  - Crescimento trim. 15% (compara últimos 3m vs 3m anteriores via sazonalidade)
 *  - Share-of-wallet 10% (estimativa)
 *
 * Tier: 🟢 Saudável >75 · 🟡 Atenção 50-75 · 🔴 Risco <50
 */
import { useMemo } from "react";
import { useClientBI } from "./useClientBI";
import { useClientVsIndustry } from "./useClientVsIndustry";
import { useClientSeasonality } from "./useClientSeasonality";

export type HealthTier = "healthy" | "attention" | "risk" | "unknown";

export interface HealthScoreBreakdown {
  recency: { score: number; weight: number; label: string };
  frequency: { score: number; weight: number; label: string };
  ticket: { score: number; weight: number; label: string };
  growth: { score: number; weight: number; label: string };
  shareOfWallet: { score: number; weight: number; label: string };
}

export interface ClientHealthScoreResult {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
  unavailableReason: "source-error" | "insufficient-data" | null;
  score: number; // 0-100
  tier: HealthTier;
  breakdown: HealthScoreBreakdown;
  shareOfWalletPct: number; // estimativa
  potentialUntappedBRL: number;
  growthPct: number; // % vs trimestre anterior
  nextActionLabel: string;
  nextActionDetail: string;
  scriptHint: string;
  windowLabel: string;
  crossZoneInsight: string;
  ctaLabel: string;
  ctaUrgent: boolean;
}

/** Retorna null quando o score é apenas o valor sentinela de dados insuficientes. */
export function getAvailableHealthScore(
  health: Pick<ClientHealthScoreResult, "score" | "tier">,
): number | null {
  return health.tier === "unknown" ? null : health.score;
}

function recencyScore(days: number | null): number {
  if (days === null || days === undefined) return 0;
  if (days <= 30) return 100;
  if (days <= 60) return 80;
  if (days <= 90) return 60;
  if (days <= 180) return 30;
  return 0;
}

function ratioScore(client: number, industry: number): number {
  if (!industry || industry <= 0) return client > 0 ? 60 : 0;
  const ratio = client / industry;
  if (ratio >= 1.3) return 100;
  if (ratio >= 1.1) return 90;
  if (ratio >= 0.9) return 75;
  if (ratio >= 0.7) return 55;
  if (ratio >= 0.5) return 35;
  return 15;
}

function tierFromScore(score: number): HealthTier {
  if (score >= 75) return "healthy";
  if (score >= 50) return "attention";
  return "risk";
}

type ClientBiData = ReturnType<typeof useClientBI>;
type IndustryComparison = ReturnType<typeof useClientVsIndustry>;
type ClientSeasonality = ReturnType<typeof useClientSeasonality>;
type ComparisonMetric = IndustryComparison["metrics"][number];

function comparisonScore(metric: ComparisonMetric | undefined) {
  return metric ? ratioScore(metric.clientValue, metric.industryAvg) : 0;
}

function growthMetrics(seasonality: ClientSeasonality) {
  const monthIndex = new Date().getMonth();
  const periodTotal = (offsets: number[]) => offsets.reduce((sum, offset) => {
    const month = ((monthIndex - offset + 12) % 12) + 1;
    return sum + (seasonality.client.find((cell) => cell.month === month)?.quotesCount ?? 0);
  }, 0);
  const recent = periodTotal([0, 1, 2]);
  const previous = periodTotal([3, 4, 5]);
  const growthPct = previous > 0 ? ((recent - previous) / previous) * 100 : recent > 0 ? 50 : 0;
  return { growthPct, score: Math.max(0, Math.min(100, 50 + growthPct)) };
}

function shareMetrics(ticketMetric: ComparisonMetric | undefined, bi: ClientBiData) {
  const industryPotential = ticketMetric ? ticketMetric.industryAvg * 12 : 0;
  const clientActual = bi.ltv > 0 ? bi.ltv : bi.avgTicket * bi.ordersCount;
  const sharePct = industryPotential > 0
    ? Math.min(100, (clientActual / industryPotential) * 100)
    : 0;
  return {
    sharePct,
    score: Math.min(100, sharePct * 1.5),
    potentialUntapped: Math.max(0, industryPotential - clientActual),
  };
}

function healthRefetch(
  bi: ClientBiData,
  vs: IndustryComparison,
  seasonality: ClientSeasonality,
): () => Promise<unknown> {
  return async () => Promise.allSettled([
    bi.refetch?.(),
    vs.refetch?.(),
    seasonality.refetch?.(),
  ]);
}

function unavailableHealthResult(
  isLoading: boolean,
  sources: [ClientBiData, IndustryComparison, ClientSeasonality],
  sourceError: unknown = null,
): ClientHealthScoreResult {
  const unavailable = { score: 0, weight: 0, label: "Dados insuficientes" };
  const isError = sourceError !== null && sourceError !== undefined;
  return {
    isLoading,
    isError,
    error: sourceError,
    refetch: healthRefetch(...sources),
    unavailableReason: isLoading ? null : isError ? "source-error" : "insufficient-data",
    score: 0,
    tier: "unknown",
    breakdown: {
      recency: unavailable,
      frequency: unavailable,
      ticket: unavailable,
      growth: unavailable,
      shareOfWallet: unavailable,
    },
    shareOfWalletPct: 0,
    potentialUntappedBRL: 0,
    growthPct: 0,
    nextActionLabel: "Dados insuficientes",
    nextActionDetail: "Registre histórico real e uma amostra setorial válida antes de gerar recomendações.",
    scriptHint: "",
    windowLabel: "Sem janela sazonal comprovada",
    crossZoneInsight: "Não há dados suficientes para calcular a saúde deste cliente.",
    ctaLabel: "Criar orçamento",
    ctaUrgent: false,
  };
}

function isHealthScoreSourceUnavailable(bi: ClientBiData, vs: IndustryComparison): boolean {
  return bi.isUnavailable || vs.isError || !vs.hasEnoughSample;
}

function healthSourceError(
  bi: ClientBiData,
  vs: IndustryComparison,
  seasonality: ClientSeasonality,
): unknown {
  if (bi.isUnavailable) return bi.error ?? new Error("Histórico do cliente indisponível");
  if (vs.isError) return vs.error ?? new Error("Benchmark do setor indisponível");
  if (seasonality.isError) return seasonality.error ?? new Error("Sazonalidade indisponível");
  return null;
}

function nextAction(
  recency: number,
  ticket: number,
  growthPct: number,
  ...context: [
    sharePct: number,
    potentialUntapped: number,
    bi: ClientBiData,
    seasonality: ClientSeasonality,
  ]
) {
  const [sharePct, potentialUntapped, bi, seasonality] = context;
  if (recency <= 30) return {
    label: "Reativar agora",
    detail: bi.daysSinceLastOrder
      ? `Última compra há ${bi.daysSinceLastOrder}d — janela crítica de retenção.`
      : "Cliente sem histórico recente — abordagem prioritária.",
    script: "Sentimos sua falta! Preparei uma seleção exclusiva baseada nos produtos que você mais gosta.",
    urgent: true,
  };
  if (seasonality.daysToNextPeak !== null && seasonality.daysToNextPeak <= 30) return {
    label: seasonality.daysToNextPeak === 0 ? "Abordar agora · pico" : `Abordar em ${seasonality.daysToNextPeak}d`,
    detail: "Cliente entra em mês de pico em breve — momento ideal para envio de orçamento.",
    script: "Estamos na sua janela histórica de compra — separei os destaques do setor para você avaliar.",
    urgent: true,
  };
  if (sharePct < 20 && potentialUntapped > 30000) return {
    label: "Cross-sell agressivo",
    detail: `Share-of-wallet estimado em ${Math.round(sharePct)}% — há R$ ${Math.round(potentialUntapped).toLocaleString("pt-BR")} em potencial não capturado.`,
    script: "Notei que ainda não trabalhamos algumas linhas que são padrão no seu setor — posso te mostrar?",
    urgent: false,
  };
  if (ticket >= 75 && growthPct > 0) return {
    label: "Upsell premium",
    detail: "Ticket alto + crescendo — perfil ideal para ofertar linha premium.",
    script: "Acabou de chegar uma linha premium que combina com o perfil de compra que você costuma escolher.",
    urgent: false,
  };
  return {
    label: "Manter cadência",
    detail: "Cliente saudável — acompanhar no próximo ciclo de campanha.",
    script: "Olá! Passando para alinhar próximas demandas — vi que estamos no seu mês de pico histórico.",
    urgent: false,
  };
}

function windowLabel(seasonality: ClientSeasonality) {
  if (seasonality.daysToNextPeak === 0) return "Hoje · pico ativo";
  if (seasonality.daysToNextPeak !== null && seasonality.nextPeakMonth !== null) {
    return `${seasonality.daysToNextPeak}d → mês de pico histórico`;
  }
  return "Sem janela sazonal definida";
}

function peakNote(seasonality: ClientSeasonality) {
  if (seasonality.daysToNextPeak === 0) {
    return `está em mês de pico histórico (+${Math.round(seasonality.topClientMonths[0]?.sharePercent ?? 0)}% do volume anual)`;
  }
  if (seasonality.daysToNextPeak !== null && seasonality.daysToNextPeak <= 30) {
    return `entra em pico em ${seasonality.daysToNextPeak} dias`;
  }
  return seasonality.hasEnoughData ? "tem padrão sazonal definido" : "não tem janela sazonal comprovada";
}

interface ScoreComponent {
  score: number;
  weight: number;
}

type NormalizedWeights = [number, number, number, number, number];

function reliableMetric(vs: IndustryComparison, label: string): ComparisonMetric | undefined {
  return vs.hasEnoughSample ? vs.metrics.find((metric) => metric.label === label) : undefined;
}

function getScoreComponents(
  bi: ClientBiData,
  vs: IndustryComparison,
  seasonality: ClientSeasonality,
) {
  const frequencyMetric = reliableMetric(vs, "Frequência (pedidos)");
  const ticketMetric = reliableMetric(vs, "Ticket médio");
  const hasClientOrders = bi.hasData && !bi.isUnavailable;
  const hasSeasonality = seasonality.hasEnoughData;
  const recency = recencyScore(bi.daysSinceLastOrder);
  const frequency = comparisonScore(frequencyMetric);
  const ticket = comparisonScore(ticketMetric);
  const growth = growthMetrics(seasonality);
  const share = ticketMetric
    ? shareMetrics(ticketMetric, bi)
    : { sharePct: 0, score: 0, potentialUntapped: 0 };
  const components: ScoreComponent[] = [
    { score: recency, weight: hasClientOrders ? 30 : 0 },
    { score: frequency, weight: frequencyMetric ? 25 : 0 },
    { score: ticket, weight: ticketMetric ? 20 : 0 },
    { score: growth.score, weight: hasSeasonality ? 15 : 0 },
    { score: share.score, weight: ticketMetric ? 10 : 0 },
  ];
  return { components, recency, frequency, ticket, growth, share, ticketMetric, availableWeight: components.reduce((sum, item) => sum + item.weight, 0) };
}

function normalizedWeights(components: ScoreComponent[], totalWeight: number): NormalizedWeights {
  const weights = components.map(({ weight }) => weight === 0 ? 0 : Math.round((weight / totalWeight) * 100));
  return weights as NormalizedWeights;
}

function weightedScore(components: ScoreComponent[], totalWeight: number): number {
  return Math.round(components.reduce((sum, component) => sum + component.score * component.weight, 0) / totalWeight);
}

function ticketNote(metric: ComparisonMetric | undefined) {
  if (!metric || Math.abs(metric.deltaPercent) <= 15) return "";
  if (metric.deltaPercent > 0) return `, com ticket ${Math.round(metric.deltaPercent)}% acima do setor`;
  return `, com ticket ${Math.abs(Math.round(metric.deltaPercent))}% abaixo do setor`;
}

function growthNote(growthPct: number) {
  if (growthPct < -15) return ` mas frequência caiu ${Math.abs(Math.round(growthPct))}% no último trimestre — momento de reativação.`;
  if (growthPct > 15) return ` e cresce ${Math.round(growthPct)}% no trimestre — acelerar oportunidades.`;
  return ".";
}

export function buildHealthResult(
  bi: ClientBiData,
  vs: IndustryComparison,
  seasonality: ClientSeasonality,
): ClientHealthScoreResult {
  const sources: [ClientBiData, IndustryComparison, ClientSeasonality] = [bi, vs, seasonality];
  const isLoading = bi.isLoading || vs.isLoading || seasonality.isLoading;
  if (isLoading) return unavailableHealthResult(true, sources);
  const sourceError = healthSourceError(bi, vs, seasonality);
  if (sourceError) return unavailableHealthResult(false, sources, sourceError);
  // A falha do histórico não pode ser interpretada como zero compras/risco.
  // Sem benchmark não é possível validar o score global: recência e sazonalidade
  // podem ser reais, mas não substituem a comparação setorial que o score promete.
  if (isHealthScoreSourceUnavailable(bi, vs)) return unavailableHealthResult(false, sources);
  const { components, recency, frequency, ticket, growth, share, ticketMetric, availableWeight } = getScoreComponents(bi, vs, seasonality);
  if (availableWeight === 0) return unavailableHealthResult(false, sources);
  const score = weightedScore(components, availableWeight);
  const [recencyWeight, frequencyWeight, ticketWeight, growthWeight, shareWeight] = normalizedWeights(components, availableWeight);
  const action = nextAction(recency, ticket, growth.growthPct, share.sharePct, share.potentialUntapped, bi, seasonality);
  const hasUpcomingPeak = seasonality.daysToNextPeak !== null && seasonality.daysToNextPeak <= 30;
  return {
    isLoading,
    isError: false,
    error: null,
    refetch: healthRefetch(...sources),
    unavailableReason: null,
    score,
    tier: tierFromScore(score),
    breakdown: {
      recency: { score: recency, weight: recencyWeight, label: "Recência" },
      frequency: { score: frequency, weight: frequencyWeight, label: "Frequência" },
      ticket: { score: ticket, weight: ticketWeight, label: "Ticket vs setor" },
      growth: { score: growth.score, weight: growthWeight, label: "Crescimento" },
      shareOfWallet: { score: share.score, weight: shareWeight, label: "Share-of-wallet" },
    },
    shareOfWalletPct: Math.round(share.sharePct * 10) / 10,
    potentialUntappedBRL: Math.round(share.potentialUntapped),
    growthPct: Math.round(growth.growthPct),
    nextActionLabel: action.label,
    nextActionDetail: action.detail,
    scriptHint: action.script,
    windowLabel: windowLabel(seasonality),
    crossZoneInsight: `Cliente ${peakNote(seasonality)}${ticketNote(ticketMetric)}${growthNote(growth.growthPct)}`,
    ctaLabel: action.urgent && hasUpcomingPeak ? "Criar orçamento de oportunidade" : "Criar orçamento com sugestões",
    ctaUrgent: action.urgent,
  };
}

export function useClientHealthScore(
  clientId: string | null | undefined,
  ramoAtividade: string | null | undefined,
): ClientHealthScoreResult {
  const bi = useClientBI(clientId ?? undefined);
  const vs = useClientVsIndustry(clientId, ramoAtividade);
  const seas = useClientSeasonality(clientId, ramoAtividade);

  return useMemo(() => buildHealthResult(bi, vs, seas), [bi, vs, seas]);
}
