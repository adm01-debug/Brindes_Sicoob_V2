import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { resolveBudgetCompetence } from "@/lib/sicoob/paBudgetState";

export interface PaBudget {
  id: string;
  pa_id: string;
  ano: number;
  mes: number;
  verba_total: number;
  verba_consumida: number;
  limite_alcada: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  /**
   * Ciclo completo da verba. `verba_total` continua sendo o valor planejado
   * para compatibilidade; os tres estados abaixo sao derivados do livro de
   * eventos (pa_budget_entries) e chegam nulos em bases sem a migration.
   */
  verba_planejada?: number | null;
  verba_reservada?: number | null;
  verba_comprometida?: number | null;
  cost_center_id?: string | null;
  fechada_em?: string | null;
  fechada_por?: string | null;
}

export interface PaBudgetCompetence {
  year: number;
  month: number;
}

export function resolvePaBudgetCompetence(referenceDate?: string | Date): PaBudgetCompetence | null {
  return resolveBudgetCompetence(referenceDate);
}

function getPlannedBudget(budget?: PaBudget | null) {
  if (!budget) return 0;
  return budget.verba_planejada ?? budget.verba_total ?? 0;
}

/**
 * Saldo livre = planejado - reservado - comprometido - consumido.
 * Reservado e comprometido nao sao gastos, mas ja estao comprometidos com
 * pedidos: ignora-los liberaria a mesma verba duas vezes para novos pedidos.
 */
function getRemainingBudget(budget?: PaBudget | null) {
  if (!budget) return 0;
  return getPlannedBudget(budget)
    - (budget.verba_reservada || 0)
    - (budget.verba_comprometida || 0)
    - (budget.verba_consumida || 0);
}

/** Percentual da verba ja ocupado (consumido + reservado + comprometido). */
function getConsumptionPercentage(budget?: PaBudget | null) {
  const planned = getPlannedBudget(budget);
  if (!budget || planned <= 0) return 0;
  const occupied = (budget.verba_consumida || 0)
    + (budget.verba_reservada || 0)
    + (budget.verba_comprometida || 0);
  return (occupied / planned) * 100;
}

/** Metricas derivadas da verba, calculadas fora do hook para manter o componente simples. */
function buildBudgetMetrics(budget: PaBudget | null | undefined, remainingBudget: number) {
  return {
    plannedBudget: getPlannedBudget(budget),
    reservedBudget: budget?.verba_reservada || 0,
    committedBudget: budget?.verba_comprometida || 0,
    consumedBudget: budget?.verba_consumida || 0,
    isCompetenceClosed: Boolean(budget?.fechada_em),
    costCenterId: budget?.cost_center_id ?? null,
    remainingBudget,
    consumptionPercentage: getConsumptionPercentage(budget),
  };
}

function buildCompetenceError(
  referenceDate: string | Date | undefined,
  competence: PaBudgetCompetence | null,
) {
  if (referenceDate === undefined || competence) return null;
  return new Error("A data do pedido é inválida; não foi possível determinar a competência da verba.");
}

export const usePaBudget = (paId?: string, referenceDate?: string | Date) => {
  const { profile } = useAuth();
  const targetPaId = paId || profile?.pa_id;
  const competence = resolvePaBudgetCompetence(referenceDate);
  const invalidCompetenceError = buildCompetenceError(referenceDate, competence);

  const { data: budget, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ["pa_budget", targetPaId, competence?.year, competence?.month],
    queryFn: async () => {
      if (!targetPaId || !competence) return null;

      const { data, error } = await supabase
        .from("pa_budgets")
        .select("*")
        .eq("pa_id", targetPaId)
        .eq("ano", competence.year)
        .eq("mes", competence.month)
        .maybeSingle();

      if (error) throw error;
      return data as PaBudget | null;
    },
    enabled: !!targetPaId && !!competence,
  });

  const remainingBudget = getRemainingBudget(budget);
  const metrics = buildBudgetMetrics(budget, remainingBudget);

  return {
    targetPaId,
    competence,
    competenceLabel: competence
      ? `${String(competence.month).padStart(2, "0")}/${competence.year}`
      : null,
    budget,
    ...metrics,
    isLoading,
    error: invalidCompetenceError || queryError,
    refetch,
    isOverBudget: (amount: number) => amount > remainingBudget,
    isOverThreshold: (amount: number) => budget ? amount > budget.limite_alcada : false,
  };
};
