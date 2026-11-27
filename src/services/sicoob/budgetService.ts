import { supabase } from "@/integrations/supabase/client";

async function getPaIdsByCooperative(cooperativeId: string) {
  const { data, error } = await supabase
    .from("postos_atendimento")
    .select("id")
    .eq("cooperativa_id", cooperativeId);
  if (error) throw error;
  return (data ?? []).map((pa) => pa.id);
}

export type BudgetPeriod = { year: number; month: number };

export function currentBudgetPeriod(): BudgetPeriod {
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

  /**
   * Conciliação de verba da competência: compara o consumo registrado em
   * `pa_budgets.verba_consumida` com a soma dos pedidos confirmados no mês.
   * A view `sicoob_budget_audit` é `security_invoker`, então a RLS de
   * `pa_budgets` continua valendo por papel.
   */
  async listBudgetAudit(period: BudgetPeriod = currentBudgetPeriod()) {
    const { data, error } = await supabase
      .from("sicoob_budget_audit")
      .select(
        "pa_id, pa_nome, ano, mes, verba_total, verba_registrada, verba_calculada_pedidos, discrepancia",
      )
      .eq("ano", period.year)
      .eq("mes", period.month)
      .order("pa_nome", { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  /** Competência mais recente que possui verba registrada, para abrir a tela com dado real. */
  async getLatestBudgetAuditPeriod(): Promise<BudgetPeriod | null> {
    const { data: latestAno, error: anoError } = await supabase
      .from("sicoob_budget_audit")
      .select("ano")
      .order("ano", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (anoError) throw anoError;
    if (!latestAno?.ano) return null;

    const { data: latestMes, error: mesError } = await supabase
      .from("sicoob_budget_audit")
      .select("mes")
      .eq("ano", latestAno.ano)
      .order("mes", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (mesError) throw mesError;
    if (!latestMes?.mes) return null;

    return { year: latestAno.ano, month: latestMes.mes };
  },
};
