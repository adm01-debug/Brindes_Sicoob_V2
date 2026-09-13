import { supabase } from "@/integrations/supabase/client";

function assertQuery(error: { message?: string } | null, label: string): void {
  if (error) throw new Error(`Não foi possível carregar ${label}: ${error.message || 'erro de consulta'}`);
}

export const sicoobStatsService = {
  async getPaDashboardStats(paId: string) {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [budgetResult, activeResult, approvalResult, deliveredResult, recentResult] = await Promise.all([
      supabase.from("pa_budgets").select("*").eq("pa_id", paId)
        .order("ano", { ascending: false }).order("mes", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("sicoob_orders").select("*", { count: "exact", head: true }).eq("pa_id", paId)
        .in("status", ["pending", "waiting_approval", "confirmed", "logistic"]),
      supabase.from("sicoob_orders").select("*", { count: "exact", head: true }).eq("pa_id", paId)
        .in("status", ["waiting_approval", "escalated_to_board"]),
      supabase.from("sicoob_orders").select("*", { count: "exact", head: true }).eq("pa_id", paId)
        .eq("status", "completed").gte("updated_at", firstDay),
      supabase.from("sicoob_orders").select("*").eq("pa_id", paId)
        .order("created_at", { ascending: false }).limit(5),
    ]);

    assertQuery(budgetResult.error, 'a verba do PA');
    assertQuery(activeResult.error, 'os pedidos ativos do PA');
    assertQuery(approvalResult.error, 'as aprovações pendentes do PA');
    assertQuery(deliveredResult.error, 'as entregas do mês do PA');
    assertQuery(recentResult.error, 'os pedidos recentes do PA');

    const budget = budgetResult.data;
    return {
      availableBudget: budget ? Number(budget.verba_total) - Number(budget.verba_consumida) : 0,
      monthlyLimit: Number(budget?.verba_total || 0),
      activeOrders: activeResult.count || 0,
      pendingApproval: approvalResult.count || 0,
      deliveredThisMonth: deliveredResult.count || 0,
      recentOrders: recentResult.data || [],
      hasConfiguredBudget: Boolean(budget),
    };
  },

  async getSellerDashboardStats(sellerUserId: string) {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [portfolioResult, activeResult, salesResult, historyResult] = await Promise.all([
      supabase.from("sicoob_orders").select("pa_id").eq("created_by", sellerUserId),
      supabase.from("sicoob_orders").select("*", { count: "exact", head: true })
        .eq("created_by", sellerUserId).in("status", ["pending", "waiting_approval", "confirmed", "logistic"]),
      supabase.from("sicoob_orders")
        .select("total_amount, pa_id, pa:postos_atendimento(nome)")
        .eq("created_by", sellerUserId).eq("status", "completed").gte("updated_at", firstDay),
      supabase.from("sicoob_order_history").select(`
        created_at,
        new_status,
        order:sicoob_orders!inner(order_number, created_by, pa:postos_atendimento(nome))
      `).eq("order.created_by", sellerUserId).order("created_at", { ascending: false }).limit(5),
    ]);

    assertQuery(portfolioResult.error, 'a carteira do vendedor');
    assertQuery(activeResult.error, 'os pedidos ativos do vendedor');
    assertQuery(salesResult.error, 'as vendas do mês');
    assertQuery(historyResult.error, 'a atividade recente do vendedor');

    const salesData = salesResult.data || [];
    const monthlySales = salesData.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const clientMap: Record<string, number> = {};
    for (const order of salesData as Array<{ total_amount: number | null; pa?: { nome?: string } | null }>) {
      const name = order.pa?.nome || "PA não identificado";
      clientMap[name] = (clientMap[name] || 0) + Number(order.total_amount || 0);
    }

    return {
      totalClients: new Set((portfolioResult.data || []).map(order => order.pa_id).filter(Boolean)).size,
      activeOrders: activeResult.count || 0,
      monthlySales,
      salesGoal: null as number | null,
      topClients: Object.entries(clientMap)
        .map(([name, value]) => ({ name, value, grow: null as string | null }))
        .sort((a, b) => b.value - a.value).slice(0, 3),
      recentActivity: (historyResult.data || []).map((history: any) => ({
        action: `Status: ${history.new_status}`,
        client: history.order?.pa?.nome || `Pedido #${history.order?.order_number || 'sem número'}`,
        time: new Date(history.created_at).toLocaleDateString('pt-BR'),
      })),
    };
  },
};
