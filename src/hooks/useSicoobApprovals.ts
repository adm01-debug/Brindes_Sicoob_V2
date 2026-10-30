import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { sicoobApprovalService } from "@/services/sicoob/approvalService";
import { sicoobOrderService } from "@/services/sicoob/orderService";
import { canSicoobTransitionTo, type OrderStatus } from "@/types/sicoob/orders";

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
  const { isAdmin, isSupervisorOrAbove, isGerentePa } = useAuth();
  const queryClient = useQueryClient();

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
          updated_at
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
      threshold: number;
      previousStatus: string;
      isEscalated?: boolean;
    }) => {
      await sicoobApprovalService.requestOrderApproval({
        orderId: payload.orderId,
        expectedStatus: payload.previousStatus,
        reason: payload.reason,
        threshold: payload.threshold,
        isEscalated: payload.isEscalated,
      });
    },

    onSuccess: () => {
      toast.success("Solicitação de aprovação enviada");
      queryClient.invalidateQueries({ queryKey: ["approval_requests"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_orders"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_order_history", orderId] });
    },
    onError: (error: unknown) => {
      toast.error("Erro ao enviar solicitação: " + (error instanceof Error ? error.message : String(error)));
    }
  });

  const approveRequest = useMutation({
    mutationFn: async (payload: { requestId: string; orderId: string; previousStatus: string }) => {
      if (!isAdmin && !isSupervisorOrAbove && !isGerentePa) {
        throw new Error("Permissão insuficiente para aprovar solicitações.");
      }

      await sicoobApprovalService.approveOrder(payload.requestId, payload.orderId);
    },
    onSuccess: () => {
      toast.success("Solicitação aprovada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["approval_requests"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_orders"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_order_history", orderId] });
    },
    onError: (error: unknown) => {
      toast.error("Erro ao aprovar: " + (error instanceof Error ? error.message : String(error)));
    }
  });

  const rejectRequest = useMutation({
    mutationFn: async (payload: { requestId: string; orderId: string; reason: string; previousStatus: string }) => {
      if (!isAdmin && !isSupervisorOrAbove && !isGerentePa) {
        throw new Error("Permissão insuficiente para rejeitar solicitações.");
      }

      await sicoobApprovalService.rejectOrder(payload.requestId, payload.orderId, payload.reason);
    },
    onSuccess: () => {
      toast.success("Solicitação rejeitada");
      queryClient.invalidateQueries({ queryKey: ["approval_requests"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_orders"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_order_history", orderId] });
    },
    onError: (error: unknown) => {
      toast.error("Erro ao rejeitar: " + (error instanceof Error ? error.message : String(error)));
    }
  });

  const updateStatus = useMutation({
    mutationFn: async (payload: { orderId: string; newStatus: OrderStatus; previousStatus: OrderStatus; comment?: string }) => {
      if (!canSicoobTransitionTo(payload.previousStatus, payload.newStatus)) {
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

      await sicoobOrderService.updateOrderStatus(
        payload.orderId,
        payload.newStatus,
        payload.previousStatus,
        payload.comment,
      );
    },
    onSuccess: () => {
      toast.success("Status do pedido atualizado");
      queryClient.invalidateQueries({ queryKey: ["sicoob_orders"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_order_history", orderId] });
    },
    onError: (error: unknown) => {
      toast.error("Erro ao atualizar status", {
        description: error instanceof Error ? error.message : String(error)
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
