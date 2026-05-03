import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useSellerDashboardStats = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["seller-dashboard-stats", profile?.id],
    queryFn: async () => {
      // 1. Get client count (PAs related to the seller's cooperatives or directly assigned)
      // For now, let's count all PAs as a simplification or PAs where there are orders from this seller
      const { count: clientCount } = await supabase
        .from("postos_atendimento")
        .select("*", { count: "exact", head: true });

      // 2. Get active orders count assigned to/created by this seller
      const { count: activeOrders } = await supabase
        .from("sicoob_orders")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "waiting_approval", "confirmed", "logistic"]);

      // 3. Get monthly sales (completed orders this month)
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: salesData } = await supabase
        .from("sicoob_orders")
        .select("total_amount")
        .eq("status", "completed")
        .gte("updated_at", firstDay);
      
      const monthlySales = salesData?.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0) || 0;

      // 4. Top Clients (PAs with most sales)
      const { data: topClientsRaw } = await supabase
        .from("sicoob_orders")
        .select("total_amount, pa:postos_atendimento(nome)")
        .eq("status", "completed")
        .order("total_amount", { ascending: false })
        .limit(10);

      // Simple aggregation for top clients
      const clientMap: Record<string, number> = {};
      topClientsRaw?.forEach((order: any) => {
        const name = order.pa?.nome || "PA Desconhecido";
        clientMap[name] = (clientMap[name] || 0) + Number(order.total_amount);
      });

      const topClients = Object.entries(clientMap)
        .map(([name, value]) => ({ name, value, grow: "+0%" }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);

      // 5. Recent Activity (Latest status changes)
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
        salesGoal: 500000, // Still static goal
        topClients,
        recentActivity
      };
    },
    enabled: !!profile?.id
  });
};
