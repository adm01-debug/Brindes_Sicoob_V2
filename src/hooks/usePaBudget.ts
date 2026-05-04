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

export const usePaBudget = (paId?: string) => {
  const { profile } = useAuth();
  const targetPaId = paId || profile?.pa_id;

  const { data: budget, isLoading, error, refetch } = useQuery({
    queryKey: ["pa_budget", targetPaId, new Date().getFullYear(), new Date().getMonth() + 1],
    queryFn: async () => {
      if (!targetPaId) return null;

      const { data, error } = await supabase
        .from("pa_budgets")
        .select("*")
        .eq("pa_id", targetPaId)
        .eq("ano", new Date().getFullYear())
        .eq("mes", new Date().getMonth() + 1)
        .maybeSingle();

      if (error) throw error;
      return data as PaBudget | null;
    },
    enabled: !!targetPaId,
  });

  const getRemainingBudget = () => {
    if (!budget) return 0;
    return budget.verba_total - (budget.verba_consumida || 0);
  };

  const getConsumptionPercentage = () => {
    if (!budget || budget.verba_total <= 0) return 0;
    return ((budget.verba_consumida || 0) / budget.verba_total) * 100;
  };

  return {
    budget,
    isLoading,
    error,
    refetch,
    remainingBudget: getRemainingBudget(),
    consumptionPercentage: getConsumptionPercentage(),
    isOverBudget: (amount: number) => amount > getRemainingBudget(),
    isOverThreshold: (amount: number) => budget ? amount > budget.limite_alcada : false,
  };
};
