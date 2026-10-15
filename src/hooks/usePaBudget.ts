import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
}

export interface PaBudgetCompetence {
  year: number;
  month: number;
}

export function resolvePaBudgetCompetence(referenceDate?: string | Date): PaBudgetCompetence | null {
  const date = referenceDate === undefined ? new Date() : new Date(referenceDate);
  if (Number.isNaN(date.getTime())) return null;

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  };
}

function getRemainingBudget(budget?: PaBudget | null) {
  if (!budget) return 0;
  return budget.verba_total - (budget.verba_consumida || 0);
}

function getConsumptionPercentage(budget?: PaBudget | null) {
  if (!budget || budget.verba_total <= 0) return 0;
  return ((budget.verba_consumida || 0) / budget.verba_total) * 100;
}

function requiresBoardApproval(budget: PaBudget | null | undefined, amount: number) {
  if (!budget) return false;
  return amount > (budget.limite_alcada * 1.5) || amount > 50000;
}

export const usePaBudget = (paId?: string, referenceDate?: string | Date) => {
  const { profile } = useAuth();
  const targetPaId = paId || profile?.pa_id;
  const competence = resolvePaBudgetCompetence(referenceDate);
  const invalidCompetenceError = referenceDate !== undefined && !competence
    ? new Error("A data do pedido é inválida; não foi possível determinar a competência da verba.")
    : null;

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

  return {
    targetPaId,
    competence,
    competenceLabel: competence
      ? `${String(competence.month).padStart(2, "0")}/${competence.year}`
      : null,
    budget,
    isLoading,
    error: invalidCompetenceError || queryError,
    refetch,
    remainingBudget,
    consumptionPercentage: getConsumptionPercentage(budget),
    isOverBudget: (amount: number) => amount > remainingBudget,
    isOverThreshold: (amount: number) => budget ? amount > budget.limite_alcada : false,
    isBoardApprovalRequired: (amount: number) => requiresBoardApproval(budget, amount),
  };
};
