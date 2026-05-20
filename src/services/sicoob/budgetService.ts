import { supabase } from "@/integrations/supabase/client";

export const sicoobBudgetService = {
  async getBudgets(filters?: { pa_id?: string; cooperative_id?: string }) {
    let query = supabase.from("sicoob_budgets").select("*, postos_atendimento(nome)");

    if (filters?.pa_id && filters.pa_id !== "all") {
      query = query.eq("pa_id", filters.pa_id);
    }
    if (filters?.cooperative_id && filters.cooperative_id !== "all") {
      query = query.eq("cooperative_id", filters.cooperative_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getBudgetByPa(paId: string) {
    const { data, error } = await supabase
      .from("sicoob_budgets")
      .select("*")
      .eq("pa_id", paId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateBudget(paId: string, usedAmount: number) {
    const budget = await this.getBudgetByPa(paId);
    if (!budget) return;

    const { error } = await supabase
      .from("sicoob_budgets")
      .update({ used_amount: usedAmount, updated_at: new Date().toISOString() })
      .eq("pa_id", paId);

    if (error) throw error;
  }
};
