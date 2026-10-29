import { supabase } from '@/integrations/supabase/client';

export interface GestorOrderSummary {
  id: string;
  pa: string;
  val: number;
  status: string;
}

export interface GestorStats {
  totalPAs: number;
  pendingApprovals: number;
  totalSpentMonth: number;
  monthlyBudget: number;
  hasConfiguredBudget: boolean;
  recentOrders: GestorOrderSummary[];
}

async function loadBudgetTotals(paIds: string[]) {
  if (paIds.length === 0) {
    return {
      totalSpentMonth: 0,
      monthlyBudget: 0,
      hasConfiguredBudget: false,
    };
  }

  const now = new Date();
  const { data, error } = await supabase
    .from('pa_budgets')
    .select('verba_total, verba_consumida')
    .in('pa_id', paIds)
    .eq('ano', now.getFullYear())
    .eq('mes', now.getMonth() + 1);

  if (error) throw error;
  const budgets = data ?? [];

  return {
    monthlyBudget: budgets.reduce((total, budget) => total + Number(budget.verba_total || 0), 0),
    totalSpentMonth: budgets.reduce(
      (total, budget) => total + Number(budget.verba_consumida || 0),
      0,
    ),
    hasConfiguredBudget: budgets.length > 0,
  };
}

async function loadRecentOrders(cooperativeId: string): Promise<GestorOrderSummary[]> {
  const { data, error } = await supabase
    .from('sicoob_orders')
    .select('id, total_amount, status, postos_atendimento(nome)')
    .eq('cooperative_id', cooperativeId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) throw error;

  return (data ?? []).map((order) => ({
    id: order.id,
    pa: order.postos_atendimento?.nome || 'Desconhecido',
    val: Number(order.total_amount),
    status: order.status,
  }));
}

export const managerStatsService = {
  async getCooperativeDashboardStats(cooperativeId?: string | null): Promise<GestorStats | null> {
    if (!cooperativeId) return null;

    const [pasResult, approvalsResult] = await Promise.all([
      supabase
        .from('postos_atendimento')
        .select('id', { count: 'exact' })
        .eq('cooperativa_id', cooperativeId),
      supabase
        .from('sicoob_approval_requests')
        .select('id, sicoob_orders!inner(cooperative_id)', {
          count: 'exact',
          head: true,
        })
        .eq('status', 'pending')
        .eq('sicoob_orders.cooperative_id', cooperativeId),
    ]);

    if (pasResult.error) throw pasResult.error;
    if (approvalsResult.error) throw approvalsResult.error;

    const paIds = (pasResult.data ?? []).map((pa) => pa.id);
    const [budget, recentOrders] = await Promise.all([
      loadBudgetTotals(paIds),
      loadRecentOrders(cooperativeId),
    ]);

    return {
      totalPAs: pasResult.count ?? 0,
      pendingApprovals: approvalsResult.count ?? 0,
      ...budget,
      recentOrders,
    };
  },
};
