import { supabase } from "@/integrations/supabase/client";

async function getPaIdsByCooperative(cooperativeId: string) {
  const { data, error } = await supabase
    .from("postos_atendimento")
    .select("id")
    .eq("cooperativa_id", cooperativeId);
  if (error) throw error;
  return (data ?? []).map((pa) => pa.id);
}

type BudgetPeriod = { year: number; month: number };

function currentBudgetPeriod(): BudgetPeriod {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export const sicoobBudgetService = {
  async getBudgets(filters?: { pa_id?: string; cooperative_id?: string }) {
    let cooperativePaIds: string[] | null = null;
    if (filters?.cooperative_id && filters.cooperative_id !== "all") {
      cooperativePaIds = await getPaIdsByCooperative(filters.cooperative_id);
      if (cooperativePaIds.length === 0) return [];
    }

    let query = supabase.from("pa_budgets").select("*, postos_atendimento(nome)");

    if (filters?.pa_id && filters.pa_id !== "all") {
      query = query.eq("pa_id", filters.pa_id);
    }
    if (cooperativePaIds) {
      query = query.in("pa_id", cooperativePaIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getBudgetByPa(paId: string, period: BudgetPeriod = currentBudgetPeriod()) {
    const { data, error } = await supabase
      .from("pa_budgets")
      .select("*")
      .eq("pa_id", paId)
      .eq("ano", period.year)
      .eq("mes", period.month)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateBudget(paId: string, usedAmount: number, period: BudgetPeriod = currentBudgetPeriod()) {
    const budget = await this.getBudgetByPa(paId, period);
    if (!budget) return;

    const { error } = await supabase
      .from("pa_budgets")
      .update({ verba_consumida: usedAmount, updated_at: new Date().toISOString() })
      .eq("pa_id", paId)
      .eq("ano", period.year)
      .eq("mes", period.month);

    if (error) throw error;
  }
};
