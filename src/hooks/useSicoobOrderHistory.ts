import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OrderHistory {
  id: string;
  order_id: string;
  user_id: string;
  previous_status: string;
  new_status: string;
  comment: string | null;
  created_at: string;
  user?: {
    display_name: string;
  };
}

export const useSicoobOrderHistory = (orderId?: string) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: history, isLoading } = useQuery({
    queryKey: ["sicoob_order_history", orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      const { data, error } = await supabase
        .from("sicoob_order_history")
        .select(`
          *,
          user:profiles!user_id(display_name)
        `)
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OrderHistory[];
    },
    enabled: !!orderId,
  });

  const addHistoryEntry = useMutation({
    mutationFn: async (payload: {
      orderId: string;
      previousStatus: string;
      newStatus: string;
      comment?: string;
    }) => {
      const { error } = await supabase
        .from("sicoob_order_history")
        .insert({
          order_id: payload.orderId,
          user_id: profile?.id,
          previous_status: payload.previousStatus,
          new_status: payload.newStatus,
          comment: payload.comment || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sicoob_order_history", orderId] });
    },
  });

  return {
    history,
    isLoading,
    addHistoryEntry,
  };
};
