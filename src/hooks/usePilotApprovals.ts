import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OrderService } from "@/services/OrderService";

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
    queryFn: () => OrderService.listPilotApprovals(orderId),
    enabled: !!orderId,
  });

  const createApproval = useMutation({
    mutationFn: async (payload: Partial<PilotApproval>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!payload.mockup_url) {
        throw new Error("A URL do piloto é obrigatória.");
      }
      
      const data = await OrderService.createPilotApproval({
        ...payload,
        mockup_url: payload.mockup_url,
        order_id: orderId,
        status: payload.status || 'pending',
        revision_round: payload.revision_round || 1
      });
      
      // Log audit
      await OrderService.logAudit({
        orderId,
        eventType: 'pilot_created',
        description: `Novo piloto enviado para aprovação`,
        metadata: { photo_url: payload.mockup_url },
        createdByName: user?.email
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order_pilot_approvals", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-audit", orderId] });
      toast.success("Solicitação de piloto criada");
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string, status: string, notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      await OrderService.updatePilotApprovalStatus(id, { 
        status, 
        reviewer_notes: notes, 
        reviewer_name: user?.email || 'Reviewer',
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      });
      
      // Log audit
      await OrderService.logAudit({
        orderId,
        eventType: 'pilot_update',
        description: `Piloto ${status === 'approved' ? 'Aprovado' : status === 'rejected' ? 'Rejeitado' : 'com Ajuste Solicitado'}`,
        metadata: { status, notes },
        createdByName: user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order_pilot_approvals", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-audit", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Status do piloto atualizado");
    },
  });

  return { 
    approvals: (query.data || []) as PilotApproval[],
    isLoading: query.isLoading,
    error: query.error,
    createApproval, 
    updateStatus 
  };
}
