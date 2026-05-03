import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditEvent {
  id: string;
  order_id: string;
  event_type: string;
  description: string;
  metadata: any;
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
  category: string | null;
  observations: string | null;
}

export function useOrderAudit(orderId: string) {
  return useQuery({
    queryKey: ["order_audit_events", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_audit_events")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as AuditEvent[];
    },
    enabled: !!orderId,
  });
}
