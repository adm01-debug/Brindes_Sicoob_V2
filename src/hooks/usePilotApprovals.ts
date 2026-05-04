import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PilotApproval {
  id: string;
  order_id: string;
  order_item_id: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'revision';
  mockup_url: string | null;
  mockup_thumbnail_url: string | null;
  reviewer_name: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  revision_round: number;
  created_at: string;
  updated_at: string;
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
    mutationFn: async (payload: Partial<PilotApproval>) => {
      const { data, error } = await supabase
        .from("order_pilot_approvals")
        .insert({
          ...payload,
          order_id: orderId,
          status: payload.status || 'pending',
          revision_round: payload.revision_round || 1
        })
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
    mutationFn: async ({ id, status, notes }: { id: string, status: string, notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("order_pilot_approvals")
        .update({ 
          status, 
          reviewer_notes: notes, 
          reviewer_name: user?.email || 'Reviewer',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order_pilot_approvals", orderId] });
      toast.success("Status do piloto atualizado");
    },
  });

  return { 
    approvals: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createApproval, 
    updateStatus 
  };
}
