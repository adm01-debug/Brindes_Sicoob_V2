import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOrderHistory(orderId?: string) {
  return useQuery({
    queryKey: ["order-history", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_audit_events")
        .select("*, created_at:occurred_at")
        .eq("order_id", orderId!)
        .order("occurred_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
}
