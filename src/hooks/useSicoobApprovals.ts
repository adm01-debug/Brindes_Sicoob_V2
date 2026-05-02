import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ApprovalRequest {
  id: string;
  order_id: string;
  requester_id: string;
  approver_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  request_reason: string | null;
  rejection_reason: string | null;
  amount_at_request: number;
  threshold_at_request: number;
  created_at: string;
  updated_at: string;
  requester?: {
    display_name: string;
  };
}

export const useApprovalRequests = (orderId?: string) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["approval_requests", orderId],
    queryFn: async () => {
      let query = supabase
        .from("sicoob_approval_requests")
        .select(`
          *,
          requester:profiles!requester_id(display_name)
        `)
        .order("created_at", { ascending: false });

      if (orderId) {
        query = query.eq("order_id", orderId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ApprovalRequest[];
    },
  });

  const createRequest = useMutation({
    mutationFn: async (payload: { 
      orderId: string; 
      reason: string; 
      amount: number; 
      threshold: number;
    }) => {
      const { error: requestError } = await supabase
        .from("sicoob_approval_requests")
        .insert({
          order_id: payload.orderId,
          requester_id: profile?.id,
          request_reason: payload.reason,
          amount_at_request: payload.amount,
          threshold_at_request: payload.threshold,
          status: 'pending'
        });

      if (requestError) throw requestError;

      const { error: orderError } = await supabase
        .from("sicoob_orders")
        .update({ status: 'waiting_approval' })
        .eq("id", payload.orderId);

      if (orderError) throw orderError;
    },
    onSuccess: () => {
      toast.success("Solicitação de aprovação enviada");
      queryClient.invalidateQueries({ queryKey: ["approval_requests"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_orders"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar solicitação: " + error.message);
    }
  });

  const approveRequest = useMutation({
    mutationFn: async (payload: { requestId: string; orderId: string }) => {
      const { error: requestError } = await supabase
        .from("sicoob_approval_requests")
        .update({
          status: 'approved',
          approver_id: profile?.id,
        })
        .eq("id", payload.requestId);

      if (requestError) throw requestError;

      const { error: orderError } = await supabase
        .from("sicoob_orders")
        .update({ 
          status: 'pending', // Volta para pendente mas aprovado pela alçada
          approved_by: profile?.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", payload.orderId);

      if (orderError) throw orderError;
    },
    onSuccess: () => {
      toast.success("Solicitação aprovada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["approval_requests"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_orders"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao aprovar: " + error.message);
    }
  });

  const rejectRequest = useMutation({
    mutationFn: async (payload: { requestId: string; orderId: string; reason: string }) => {
      const { error: requestError } = await supabase
        .from("sicoob_approval_requests")
        .update({
          status: 'rejected',
          approver_id: profile?.id,
          rejection_reason: payload.reason
        })
        .eq("id", payload.requestId);

      if (requestError) throw requestError;

      const { error: orderError } = await supabase
        .from("sicoob_orders")
        .update({ status: 'rejected' })
        .eq("id", payload.orderId);

      if (orderError) throw orderError;
    },
    onSuccess: () => {
      toast.success("Solicitação rejeitada");
      queryClient.invalidateQueries({ queryKey: ["approval_requests"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_orders"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao rejeitar: " + error.message);
    }
  });

  return {
    requests,
    isLoading,
    createRequest,
    approveRequest,
    rejectRequest
  };
};
