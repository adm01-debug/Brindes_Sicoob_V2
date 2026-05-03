import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOrderHistory(orderId?: string) {
  return useQuery({
    queryKey: ["order-history", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_audit_events")
        .select("*")
        .eq("order_id", orderId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
}
