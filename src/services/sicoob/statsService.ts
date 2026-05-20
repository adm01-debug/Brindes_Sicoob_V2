import { supabase } from "@/integrations/supabase/client";

export const sicoobStatsService = {
  async getPaDashboardStats(paId: string) {
    const now = new Date();
    
    // 1. Get current budget
    const { data: budget } = await supabase
      .from("pa_budgets")
      .select("*")
      .eq("pa_id", paId)
      .order("ano", { ascending: false })
      .order("mes", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Get active orders count
    const { count: activeOrders } = await supabase
      .from("sicoob_orders")
      .select("*", { count: "exact", head: true })
      .eq("pa_id", paId)
      .in("status", ["pending", "waiting_approval", "confirmed", "logistic"]);

    // 3. Get pending approval count
    const { count: pendingApproval } = await supabase
      .from("sicoob_orders")
      .select("*", { count: "exact", head: true })
      .eq("pa_id", paId)
      .eq("status", "waiting_approval");

    // 4. Get delivered this month count
    const { count: deliveredThisMonth } = await supabase
      .from("sicoob_orders")
      .select("*", { count: "exact", head: true })
      .eq("pa_id", paId)
      .eq("status", "completed")
      .gte("updated_at", new Date(now.getFullYear(), now.getMonth(), 1).toISOString());

    // 5. Get recent orders
    const { data: recentOrders } = await supabase
      .from("sicoob_orders")
      .select("*")
      .eq("pa_id", paId)
      .order("created_at", { ascending: false })
      .limit(5);

    return {
      availableBudget: budget ? budget.verba_total - budget.verba_consumida : 0,
      monthlyLimit: budget?.verba_total || 0,
      activeOrders: activeOrders || 0,
      pendingApproval: pendingApproval || 0,
      deliveredThisMonth: deliveredThisMonth || 0,
      recentOrders: recentOrders || []
    };
  },

  async getSellerDashboardStats(sellerId: string) {
    const { count: clientCount } = await supabase
      .from("postos_atendimento")
      .select("*", { count: "exact", head: true });

    const { count: activeOrders } = await supabase
      .from("sicoob_orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "waiting_approval", "confirmed", "logistic"]);

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: salesData } = await supabase
      .from("sicoob_orders")
      .select("total_amount")
      .eq("status", "completed")
      .gte("updated_at", firstDay);
    
    const monthlySales = salesData?.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0) || 0;

    const { data: topClientsRaw } = await supabase
      .from("sicoob_orders")
      .select("total_amount, pa:postos_atendimento(nome)")
      .eq("status", "completed")
      .order("total_amount", { ascending: false })
      .limit(10);

    const clientMap: Record<string, number> = {};
    topClientsRaw?.forEach((order: any) => {
      const name = order.pa?.nome || "PA Desconhecido";
      clientMap[name] = (clientMap[name] || 0) + Number(order.total_amount);
    });

    const topClients = Object.entries(clientMap)
      .map(([name, value]) => ({ name, value, grow: "+0%" }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    const { data: recentHistory } = await supabase
      .from("sicoob_order_history")
      .select(`
        created_at,
        new_status,
        order:sicoob_orders(order_number, pa:postos_atendimento(nome))
      `)
      .order("created_at", { ascending: false })
      .limit(5);

    const recentActivity = recentHistory?.map((h: any) => ({
      action: `Status: ${h.new_status}`,
      client: h.order?.pa?.nome || `Pedido #${h.order?.order_number}`,
      time: new Date(h.created_at).toLocaleDateString('pt-BR')
    })) || [];

    return {
      totalClients: clientCount || 0,
      activeOrders: activeOrders || 0,
      monthlySales,
      salesGoal: 500000,
      topClients,
      recentActivity
    };
  }
};
