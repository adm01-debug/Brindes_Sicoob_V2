import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const usePaDashboardStats = () => {
  const { profile } = useAuth();
  const paId = profile?.pa_id;

  return useQuery({
    queryKey: ["pa-dashboard-stats", paId],
    queryFn: async () => {
      if (!paId) return null;

      // 1. Get current budget
      const now = new Date();
      const { data: budget } = await supabase
        .from("pa_budgets")
        .select("*")
        .eq("pa_id", paId)
        .order("ano", { ascending: false })
        .order("mes", { ascending: false })
        .limit(1)
        .maybeSingle();

      // 2. Get active orders count (anything not completed/cancelled/draft)
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
    enabled: !!paId,
  });
};
