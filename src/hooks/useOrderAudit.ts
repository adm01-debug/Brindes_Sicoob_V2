import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

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

export function useOrderAudit(orderId: string, options?: { search?: string; type?: string }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const query = useQuery({
    queryKey: ["order_audit_events", orderId, options, page],
    queryFn: async () => {
      let q = supabase
        .from("order_audit_events")
        .select("*", { count: 'exact' })
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (options?.search) {
        q = q.ilike("description", `%${options.search}%`);
      }

      if (options?.type && options.type !== 'all') {
        q = q.eq("event_type", options.type);
      }

      const { data, error, count } = await q.range((page - 1) * pageSize, page * pageSize - 1);
      
      if (error) throw error;
      return {
        events: data as AuditEvent[],
        totalCount: count || 0
      };
    },
    enabled: !!orderId,
  });

  return {
    ...query,
    page,
    setPage,
    pageSize,
    totalCount: query.data?.totalCount,
    events: query.data?.events
  };
}
