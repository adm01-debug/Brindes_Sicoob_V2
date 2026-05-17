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
  const { profile, isAdmin, isSupervisorOrAbove, isGerentePa } = useAuth();
  const queryClient = useQueryClient();

  const recordHistory = async (orderId: string, prevStatus: string, newStatus: string, comment?: string) => {
    const { error } = await supabase
      .from("sicoob_order_history")
      .insert({
        order_id: orderId,
        user_id: profile?.id,
        previous_status: prevStatus,
        new_status: newStatus,
        comment: comment || null,
      });
    if (error) console.error("Error recording history:", error);
  };

  const { data: requests, isLoading } = useQuery({
    queryKey: ["approval_requests", orderId],
    queryFn: async () => {
      let query = supabase
        .from("sicoob_approval_requests")
        .select(`
          id,
          order_id,
          requester_id,
          approver_id,
          status,
          request_reason,
          rejection_reason,
          amount_at_request,
          threshold_at_request,
          created_at,
          updated_at,
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
      previousStatus: string;
      isEscalated?: boolean;
    }) => {
      const targetStatus = payload.isEscalated ? 'escalated_to_board' : 'waiting_approval';
      
      const { error: requestError } = await supabase
        .from("sicoob_approval_requests")
        .insert({
          order_id: payload.orderId,
          requester_id: profile?.id,
          request_reason: payload.reason,
          amount_at_request: payload.amount,
          threshold_at_request: payload.threshold,
          status: 'pending',
          metadata: payload.isEscalated ? { escalated: true, level: 'board' } : {}
        });

      if (requestError) throw requestError;

      const { error: orderError } = await supabase
        .from("sicoob_orders")
        .update({ status: targetStatus })
        .eq("id", payload.orderId);

      if (orderError) throw orderError;

      await recordHistory(
        payload.orderId, 
        payload.previousStatus, 
        targetStatus, 
        `Solicitação de aprovação ${payload.isEscalated ? '(Diretoria)' : '(Gestor)'}: ${payload.reason}`
      );
    },

      if (requestError) throw requestError;

      const { error: orderError } = await supabase
        .from("sicoob_orders")
        .update({ status: 'waiting_approval' })
        .eq("id", payload.orderId);

      if (orderError) throw orderError;

      await recordHistory(
        payload.orderId, 
        payload.previousStatus, 
        'waiting_approval', 
        `Solicitação de aprovação: ${payload.reason}`
      );
    },
    onSuccess: () => {
      toast.success("Solicitação de aprovação enviada");
      queryClient.invalidateQueries({ queryKey: ["approval_requests"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_orders"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_order_history", orderId] });
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar solicitação: " + error.message);
    }
  });

  const approveRequest = useMutation({
    mutationFn: async (payload: { requestId: string; orderId: string; previousStatus: string }) => {
      if (!isAdmin && !isSupervisorOrAbove && !isGerentePa) {
        throw new Error("Permissão insuficiente para aprovar solicitações.");
      }

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
          status: 'confirmed', 
          approved_by: profile?.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", payload.orderId);

      if (orderError) throw orderError;

      await recordHistory(
        payload.orderId, 
        payload.previousStatus, 
        'confirmed', 
        'Solicitação de alçada aprovada por gestor'
      );
    },
    onSuccess: () => {
      toast.success("Solicitação aprovada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["approval_requests"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_orders"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_order_history", orderId] });
    },
    onError: (error: any) => {
      toast.error("Erro ao aprovar: " + error.message);
    }
  });

  const rejectRequest = useMutation({
    mutationFn: async (payload: { requestId: string; orderId: string; reason: string; previousStatus: string }) => {
      if (!isAdmin && !isSupervisorOrAbove && !isGerentePa) {
        throw new Error("Permissão insuficiente para rejeitar solicitações.");
      }

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

      await recordHistory(
        payload.orderId, 
        payload.previousStatus, 
        'rejected', 
        `Solicitação de alçada rejeitada: ${payload.reason}`
      );
    },
    onSuccess: () => {
      toast.success("Solicitação rejeitada");
      queryClient.invalidateQueries({ queryKey: ["approval_requests"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_orders"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_order_history", orderId] });
    },
    onError: (error: any) => {
      toast.error("Erro ao rejeitar: " + error.message);
    }
  });

  const updateStatus = useMutation({
    mutationFn: async (payload: { orderId: string; newStatus: string; previousStatus: string; comment?: string }) => {
      // 1. Definir transições permitidas (SSOT com o Kanban)
      const ALLOWED_TRANSITIONS: Record<string, string[]> = {
        draft: ["pending", "cancelled"],
        pending: ["waiting_approval", "cancelled"],
        waiting_approval: ["confirmed", "rejected", "escalated_to_board", "cancelled"],
        escalated_to_board: ["confirmed", "rejected", "cancelled"],
        confirmed: ["logistic", "cancelled"],
        logistic: ["completed", "cancelled"],
        rejected: ["draft", "pending"],
        completed: [],
        cancelled: [],
      };

      if (!ALLOWED_TRANSITIONS[payload.previousStatus]?.includes(payload.newStatus)) {
        throw new Error(`Transição de "${payload.previousStatus}" para "${payload.newStatus}" não é permitida.`);
      }

      // 2. Validar permissão por role
      const canManage = isAdmin || isSupervisorOrAbove || isGerentePa;
      const isBoard = isAdmin || isSupervisorOrAbove; // Diretoria/Central
      
      if (payload.newStatus === 'confirmed' && !canManage) {
        throw new Error("Apenas gestores podem confirmar pedidos.");
      }

      if (payload.previousStatus === 'escalated_to_board' && payload.newStatus === 'confirmed' && !isBoard) {
        throw new Error("Apenas a Diretoria/Central pode aprovar pedidos em alçada superior.");
      }

      const { error: orderError } = await supabase
        .from("sicoob_orders")
        .update({ status: payload.newStatus })
        .eq("id", payload.orderId);

      if (orderError) throw orderError;

      await recordHistory(
        payload.orderId,
        payload.previousStatus,
        payload.newStatus,
        payload.comment
      );
    },
    onSuccess: () => {
      toast.success("Status do pedido atualizado");
      queryClient.invalidateQueries({ queryKey: ["sicoob_orders"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_order_history", orderId] });
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar status", {
        description: error.message
      });
    }
  });

  return {
    requests,
    isLoading,
    createRequest,
    approveRequest,
    rejectRequest,
    updateStatus
  };
};
