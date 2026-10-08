/**
 * useClientHealthScore — score 0-100 de saúde do cliente.
 *
 * Pesos:
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

function comparisonScore(metric: ComparisonMetric | undefined, fallbackClient: number, fallbackIndustry: number) {
  if (metric) return ratioScore(metric.clientValue, metric.industryAvg);
  return ratioScore(fallbackClient, fallbackIndustry);
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
  const industryPotential = ticketMetric ? ticketMetric.industryAvg * 12 : bi.avgTicket * 12 || 30000;
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
  return "tem padrão sazonal definido";
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

function buildHealthResult(
  bi: ClientBiData,
  vs: IndustryComparison,
  seasonality: ClientSeasonality,
): ClientHealthScoreResult {
  const isLoading = bi.isLoading || vs.isLoading || seasonality.isLoading;
  const recency = recencyScore(bi.daysSinceLastOrder);
  const frequencyMetric = vs.metrics.find((metric) => metric.label === "Frequência (pedidos)");
  const ticketMetric = vs.metrics.find((metric) => metric.label === "Ticket médio");
  const frequency = comparisonScore(frequencyMetric, bi.ordersCount, 10);
  const ticket = comparisonScore(ticketMetric, bi.avgTicket, 2500);
  const growth = growthMetrics(seasonality);
  const share = shareMetrics(ticketMetric, bi);
  const score = Math.round(recency * 0.30 + frequency * 0.25 + ticket * 0.20 + growth.score * 0.15 + share.score * 0.10);
  const action = nextAction(recency, ticket, growth.growthPct, share.sharePct, share.potentialUntapped, bi, seasonality);
  const hasUpcomingPeak = seasonality.daysToNextPeak !== null && seasonality.daysToNextPeak <= 30;
  return {
    isLoading,
    score: isLoading ? 0 : score,
    tier: isLoading ? "unknown" : tierFromScore(score),
    breakdown: {
      recency: { score: recency, weight: 30, label: "Recência" },
      frequency: { score: frequency, weight: 25, label: "Frequência" },
      ticket: { score: ticket, weight: 20, label: "Ticket vs setor" },
      growth: { score: growth.score, weight: 15, label: "Crescimento" },
      shareOfWallet: { score: share.score, weight: 10, label: "Share-of-wallet" },
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
