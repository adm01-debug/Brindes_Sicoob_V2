/**
 * useClientOrdersHistory — agrega pedidos + LTV + ticket médio para visão 360° do cliente.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OrderRow } from "@/types/orders";

export interface ClientOrdersHistory {
  orders: OrderRow[];
  ordersCount: number;
  totalLtv: number;
  avgTicket: number;
  lastOrderAt: string | null;
}

export function useClientOrdersHistory(clientId?: string) {
  return useQuery<ClientOrdersHistory>({
    queryKey: ["client-orders-history", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      if (!clientId) throw new Error("Cliente não identificado");
      const { data, error } = await supabase
        // rls-allow: filtrado por client_id; RLS aplica seller scope
        .from("orders")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const orders = (data ?? []) as OrderRow[];
      const valid = orders.filter((o) => o.status !== "cancelado");
      const totalLtv = valid.reduce((sum, o) => sum + (o.total ?? 0), 0);
      const ordersCount = valid.length;
      const avgTicket = ordersCount > 0 ? totalLtv / ordersCount : 0;
      const lastOrderAt = orders[0]?.created_at ?? null;

      return { orders, ordersCount, totalLtv, avgTicket, lastOrderAt };
    },
    staleTime: 5 * 60 * 1000,
  });
}
