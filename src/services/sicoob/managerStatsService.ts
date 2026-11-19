/**
 * Indicadores da Singular (gestor): PAs vinculados, aprovações pendentes,
 * verba da competência corrente e os últimos pedidos.
 *
 * Nasceu inline em `src/pages/sicoob/GestorDashboardPage.tsx`, onde só o painel
 * de indicadores conseguia usá-lo. A tela de compras precisa dos mesmos números
 * e não tinha como lê-los sem duplicar as quatro consultas — por isso o cálculo
 * vive aqui. Recupera a extração da PR #157, fechada sem merge.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  mapApprovalDecisions,
  type ApprovalDecision,
  type OrderListResult,
  type PurchasingOrder,
  type SicoobOrderHistoryStatusEvent,
} from '@/lib/orders/purchasing-sla';

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

async function loadRecentOrders(cooperativeId: string) {
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

export async function getCooperativeDashboardStats(cooperativeId?: string | null): Promise<GestorStats | null> {
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
}

/**
 * Pedidos para as métricas de compras: fila de pendências e o mês corrente.
 *
 * Pede `count: 'exact'` junto com as linhas de propósito — é o que permite
 * saber, em `calculatePurchasingMetrics`, se a consulta trouxe o universo
 * inteiro ou se truncou em 1.000 linhas / foi cortada pela RLS.
 */
export async function loadPurchasingOrders(
  query: 'pending' | 'monthly',
  monthStart: string,
  cooperativeId: string,
): Promise<OrderListResult> {
  let request = supabase
    .from('sicoob_orders')
    .select('id, status, total_amount, created_at', { count: 'exact' })
    // Mesmo recorte dos outros indicadores da tela: sem isto o painel
    // misturaria valor global com valor da Singular para quem enxerga mais de
    // uma cooperativa (dev, supervisor), afirmando os dois como da mesma.
    .eq('cooperative_id', cooperativeId);
  request =
    query === 'pending'
      ? request.eq('status', 'waiting_approval')
      : request.gte('created_at', monthStart);
  const { data, error, count } = await request
    .order('created_at', { ascending: false })
    .range(0, 999);
  if (error) throw error;
  return { data: (data ?? []) as unknown as PurchasingOrder[], count };
}

/**
 * Pares (entrou na fila, foi aprovado) dos pedidos, fonte canônica do SLA.
 *
 * Traz o histórico inteiro de cada pedido, não só as entradas na fila: o SLA
 * mede o intervalo até a aprovação, e para isso o carimbo da decisão é tão
 * necessário quanto o do envio.
 */
export async function loadManagerApprovalHistory(
  orderIds: string[],
): Promise<ReadonlyMap<string, ApprovalDecision>> {
  if (orderIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('sicoob_order_history')
    .select('order_id, new_status, created_at')
    .in('order_id', orderIds)
    .order('created_at', { ascending: true })
    .limit(10_000);
  if (error) throw error;
  return mapApprovalDecisions((data ?? []) as unknown as SicoobOrderHistoryStatusEvent[]);
}
