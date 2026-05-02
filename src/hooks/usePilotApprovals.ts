import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PilotApproval {
  id: string;
  order_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision';
  photo_url: string | null;
  comments: string | null;
  created_at: string;
}

export function usePilotApprovals(orderId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["order_pilot_approvals", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_pilot_approvals")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as PilotApproval[];
    },
    enabled: !!orderId,
  });

  const createApproval = useMutation({
    mutationFn: async (payload: Omit<PilotApproval, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("order_pilot_approvals")
        .insert(payload)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order_pilot_approvals", orderId] });
      toast.success("Solicitação de piloto criada");
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, comments }: { id: string, status: string, comments?: string }) => {
      const { error } = await supabase
        .from("order_pilot_approvals")
        .update({ status, comments, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order_pilot_approvals", orderId] });
      toast.success("Status do piloto atualizado");
    },
  });

  return { ...query, createApproval, updateStatus };
}
