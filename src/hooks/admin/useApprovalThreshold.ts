import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatBudgetCompetence, isCarryOverCompetence, pickBudgetForCompetence, readBudgetCompetence, resolveBudgetCompetence, type BudgetCompetence } from "@/lib/sicoob/paBudgetState";

interface ApprovalItem {
  category_id?: string | null;
  unit_price: number;
  quantity: number;
}

interface CategoryThreshold {
  category_id: number | null;
  limite_alcada: number;
}

function globalApprovalThreshold(profileThreshold?: number | null, budgetThreshold?: number | null): number {
  return profileThreshold || budgetThreshold || 0;
}

function exceedsCategoryThreshold(items: ApprovalItem[], thresholds?: CategoryThreshold[] | null): boolean {
  return items.some(item => {
    const threshold = thresholds?.find(candidate => candidate.category_id !== null && String(candidate.category_id) === item.category_id);
    return Boolean(threshold && item.unit_price * item.quantity > threshold.limite_alcada);
  });
}

function approvalRequired(input: {
  amount: number;
  items: ApprovalItem[];
  isDev: boolean;
  isSupervisor: boolean;
  isGestorCompras: boolean;
  paId?: string | null;
  globalThreshold: number;
  categoryThresholds?: CategoryThreshold[] | null;
}): boolean {
  if (input.isDev || input.isSupervisor) return false;
  if (input.isGestorCompras && !input.paId) return false;
  if (input.amount > input.globalThreshold) return true;
  return exceedsCategoryThreshold(input.items, input.categoryThresholds);
}

export interface ApprovalThresholdBudgetRow {
  ano?: number | null;
  mes?: number | null;
  limite_alcada?: number | null;
}

export interface ApprovalThresholdOptions {
  /**
   * PA dono do pedido. Sem ele vale o PA de quem esta logado; num pedido de
   * outro PA isso compararia o valor com a alcada errada.
   */
  paId?: string | null;
  /**
   * Data do pedido. A alcada vale a competencia dessa data; sem ela, a do mes
   * corrente (fluxo de carrinho, que ainda nao tem pedido).
   */
  referenceDate?: string | Date;
}

async function loadApprovalThresholdBudget(
  paId: string,
  competence: BudgetCompetence,
): Promise<ApprovalThresholdBudgetRow | null> {
  const { data, error } = await supabase
    .from("pa_budgets")
    .select("ano, mes, limite_alcada")
    .eq("pa_id", paId);

  if (error) throw error;
  return pickBudgetForCompetence(data as ApprovalThresholdBudgetRow[] | null, competence);
}

function thresholdQueryKey(paId?: string | null, competence?: BudgetCompetence | null) {
  return ["pa_approval_threshold", paId, competence?.year, competence?.month];
}

export const useApprovalThreshold = (items?: ApprovalItem[], options?: ApprovalThresholdOptions) => {
  const { profile, isGestorCompras, isDev, isSupervisor } = useAuth();
  const paId = options?.paId || profile?.pa_id;
  const competence = resolveBudgetCompetence(options?.referenceDate);
  const canLoadThreshold = Boolean(paId && competence);

  const { data: budget } = useQuery({
    queryKey: thresholdQueryKey(paId, competence),
    queryFn: () => (paId && competence ? loadApprovalThresholdBudget(paId, competence) : Promise.resolve(null)),
    enabled: canLoadThreshold,
  });

  const { data: categoryThresholds } = useQuery({
    queryKey: ["pa_category_thresholds", paId],
    queryFn: async () => {
      if (!paId) return [];
      const { data, error } = await supabase
        .from("pa_category_thresholds")
        .select("*")
        .eq("pa_id", paId);
      if (error) throw error;
      return data;
    },
    enabled: !!paId,
  });

  const budgetThreshold = budget?.limite_alcada ?? null;
  const usedCompetence = readBudgetCompetence(budget);
  const isCarryOver = isCarryOverCompetence(usedCompetence, competence);

  const needsApproval = (amount: number, currentItems?: ApprovalItem[]) => {
    return approvalRequired({
      amount,
      items: currentItems || items || [],
      isDev,
      isSupervisor,
      isGestorCompras,
      paId,
      globalThreshold: globalApprovalThreshold(profile?.approval_threshold, budgetThreshold),
      categoryThresholds,
    });
  };

  return {
    threshold: globalApprovalThreshold(undefined, budgetThreshold),
    /** Competencia da linha que realmente define a alcada (pode ser herdada). */
    competenceLabel: formatBudgetCompetence(usedCompetence),
    /** Competencia do pedido; igual a anterior quando nao ha heranca. */
    requestedCompetenceLabel: formatBudgetCompetence(competence),
    isCarryOver,
    categoryThresholds,
    needsApproval,
  };
};
