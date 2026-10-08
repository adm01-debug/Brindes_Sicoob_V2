/**
 * useChurnRisk — sinal binário de risco de churn baseado em recência + tendência.
 * Critérios: recência > 2× intervalo médio entre pedidos OU recência > 90d combinada com queda recente.
 */
import { useMemo } from "react";
import { useClientBI } from "./useClientBI";

export interface ChurnRiskResult {
  atRisk: boolean;
  severity: "high" | "medium" | "low" | "none";
  daysSinceLastOrder: number | null;
  averageInterval: number | null; // dias
  reason: string | null;
  suggestedAction: string;
}

type RecentOrder = ReturnType<typeof useClientBI>['recentOrders'][number];

function averageOrderInterval(orders: RecentOrder[]): number | null {
  const sorted = [...orders].sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime());
  const intervals: number[] = [];
  for (let index = 0; index < sorted.length - 1; index++) {
    const current = sorted[index];
    const previous = sorted[index + 1];
    if (!current || !previous) continue;
    const interval = (new Date(current.date).getTime() - new Date(previous.date).getTime()) / 86400000;
    if (interval > 0) intervals.push(interval);
  }
  return intervals.length > 0 ? Math.round(intervals.reduce((sum, value) => sum + value, 0) / intervals.length) : null;
}

function isHighRisk(days: number, averageInterval: number | null): boolean {
  return Boolean(averageInterval && days > averageInterval * 2 && days > 60) || days > 120;
}

function highRiskReason(days: number, averageInterval: number | null): string {
  return averageInterval
    ? `Última compra há ${days}d (média histórica: ${averageInterval}d). Cliente dobrou o intervalo — risco alto.`
    : `Sem compra há ${days}d — janela crítica de churn.`;
}

function churnRisk(days: number | null | undefined, averageInterval: number | null): ChurnRiskResult {
  if (days === null || days === undefined) {
    return { atRisk: false, severity: "none", daysSinceLastOrder: null, averageInterval, reason: null, suggestedAction: "Sem histórico para avaliar risco." };
  }
  if (isHighRisk(days, averageInterval)) {
    return { atRisk: true, severity: "high", daysSinceLastOrder: days, averageInterval, reason: highRiskReason(days, averageInterval), suggestedAction: "Ligar hoje · oferta personalizada · agendar visita esta semana." };
  }
  if (averageInterval && days > averageInterval * 1.5 && days > 45) {
    return { atRisk: true, severity: "medium", daysSinceLastOrder: days, averageInterval, reason: `Última compra há ${days}d vs média ${averageInterval}d — atenção.`, suggestedAction: "WhatsApp esta semana · enviar novidades do setor." };
  }
  return { atRisk: false, severity: "low", daysSinceLastOrder: days, averageInterval, reason: null, suggestedAction: "Cliente dentro do padrão — manter cadência normal." };
}

export function useChurnRisk(clientId: string | null | undefined): ChurnRiskResult {
  const bi = useClientBI(clientId ?? undefined);

  return useMemo(() => {
    return churnRisk(bi.daysSinceLastOrder, averageOrderInterval(bi.recentOrders));
  }, [bi]);
}
