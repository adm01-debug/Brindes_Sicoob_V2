import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatBudgetCompetence, isCarryOverCompetence, nextFutureCompetence, pickBudgetForCompetence, readBudgetCompetence, resolveBudgetCompetence, type BudgetCompetence } from "@/lib/sicoob/paBudgetState";

interface ApprovalItem {
  category_id?: string | null;
  unit_price: number;
  quantity: number;
}

interface CategoryThreshold {
  category_id: number | null;
  limite_alcada: number;
}

/**
 * A alcada que decide a aprovacao do pedido e a do PA (limite aprovado para a
 * cooperativa); o limite pessoal do perfil so vale quando o PA nao tem limite
 * configurado, senao a tela mostra um limite e decide por outro.
 */
function globalApprovalThreshold(profileThreshold?: number | null, budgetThreshold?: number | null): number {
  return budgetThreshold ?? profileThreshold ?? 0;
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

/**
 * Alcada numerica da linha de verba. Zero e um limite real — o servidor recusa a
 * confirmacao direta de qualquer pedido positivo —, entao nao pode cair no
 * fallback do perfil como se a coluna estivesse vazia.
 */
function readPaAlcada(budget?: ApprovalThresholdBudgetRow | null): number | null {
  const limit = budget?.limite_alcada;
  return typeof limit === "number" && Number.isFinite(limit) ? limit : null;
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

interface ApprovalThresholdBudget {
  row: ApprovalThresholdBudgetRow | null;
  /** Existe alguma linha de verba visivel do PA, mesmo fora da competencia. */
  hasAnyRow: boolean;
  /** Competencia com verba depois da pedida; a tela avisa em vez de se calar. */
  futureCompetence: BudgetCompetence | null;
}

async function loadApprovalThresholdBudget(
  paId: string,
  competence: BudgetCompetence,
): Promise<ApprovalThresholdBudget> {
  const { data, error } = await supabase
    .from("pa_budgets")
    .select("ano, mes, limite_alcada")
    .eq("pa_id", paId);

  if (error) throw error;
  const rows = (data ?? []) as ApprovalThresholdBudgetRow[];
  return {
    row: pickBudgetForCompetence(rows, competence),
    hasAnyRow: rows.length > 0,
    futureCompetence: nextFutureCompetence(rows, competence),
  };
}

/**
 * Tudo que a tela precisa saber sobre a verba visivel do PA na competencia
 * pedida: a linha que decide a alcada, se ha alguma linha visivel, a
 * competencia futura (quando a pedida nao tem verba) e se a alcada usada veio
 * de um mes anterior.
 */
function readBudgetView(
  budgetData: ApprovalThresholdBudget | null | undefined,
  competence: BudgetCompetence | null,
) {
  const row = budgetData?.row ?? null;
  const usedCompetence = readBudgetCompetence(row);
  return {
    paThreshold: readPaAlcada(row),
    hasVisiblePaBudget: Boolean(budgetData?.hasAnyRow),
    futurePaBudgetLabel: formatBudgetCompetence(budgetData?.futureCompetence ?? null),
    usedCompetence,
    isCarryOver: isCarryOverCompetence(usedCompetence, competence),
  };
}

function thresholdQueryKey(paId?: string | null, competence?: BudgetCompetence | null) {
  return ["pa_approval_threshold", paId, competence?.year, competence?.month];
}

export const useApprovalThreshold = (items?: ApprovalItem[], options?: ApprovalThresholdOptions) => {
  const { profile, isGestorCompras, isDev, isSupervisor } = useAuth();
  const paId = options?.paId || profile?.pa_id;
  const competence = resolveBudgetCompetence(options?.referenceDate);
  const canLoadThreshold = Boolean(paId && competence);
  const hasCategorizedItems = Boolean(paId && items?.some((item) => item.category_id));

  const { data: budgetData } = useQuery({
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
    enabled: hasCategorizedItems,
  });

  const { paThreshold, hasVisiblePaBudget, futurePaBudgetLabel, usedCompetence, isCarryOver } =
    readBudgetView(budgetData, competence);

  const globalThreshold = globalApprovalThreshold(profile?.approval_threshold, paThreshold);

  const needsApproval = (amount: number) => {
    return approvalRequired({
      amount,
      items: items ?? [],
      isDev,
      isSupervisor,
      isGestorCompras,
      paId,
      globalThreshold,
      categoryThresholds,
    });
  };

  return {
    threshold: globalThreshold,
    /**
     * Alcada numerica aprovada do PA para a competencia pedida (0 e limite real).
     * `null` = a linha do mes nao tem limite preenchido.
     */
    paThreshold,
    /**
     * Existe linha de verba visivel para o PA. Sem nenhuma linha nao da para
     * afirmar que o PA esta sem alcada: a policy de SELECT esconde pa_budgets de
     * quem nao tem escopo (vendedor), entao a tela se cala em vez de acusar.
     */
    hasVisiblePaBudget,
    /**
     * Competencia com verba cadastrada depois da pedida. Sem ela a tela nao
     * distingue "PA sem verba" de "verba so para o mes seguinte" e fica em
     * silencio nos dois casos, embora o servidor recuse o mes do pedido.
     */
    futurePaBudgetLabel,
    /** Competencia da linha que realmente define a alcada (pode ser herdada). */
    competenceLabel: formatBudgetCompetence(usedCompetence),
    /** Competencia do pedido; igual a anterior quando nao ha heranca. */
    requestedCompetenceLabel: formatBudgetCompetence(competence),
    isCarryOver,
    categoryThresholds,
    needsApproval,
  };
};
