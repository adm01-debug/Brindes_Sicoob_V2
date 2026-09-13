import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrderHistory {
  id: string;
  order_id: string;
  user_id: string | null;
  previous_status: string;
  new_status: string;
  comment: string | null;
  created_at: string;
}

export const useSicoobOrderHistory = (orderId?: string) => {
  const { data: history, isLoading } = useQuery({
    queryKey: ["sicoob_order_history", orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      const { data, error } = await supabase
        .from("sicoob_order_history")
        .select(`
          id,
          order_id,
          user_id,
          previous_status,
          new_status,
          comment,
          created_at
        `)
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OrderHistory[];
    },
    enabled: !!orderId,
  });

  return {
    history,
    isLoading,
  };
};
