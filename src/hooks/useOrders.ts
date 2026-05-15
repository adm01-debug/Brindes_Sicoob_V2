/**
 * useOrders — hooks centralizados para listagem, detalhe e mutações de pedidos.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { logRlsDenial } from "@/lib/security/rls-denial-logger";
import { useAuth } from "@/contexts/AuthContext";
import { OrderService } from "@/services/OrderService";
import { OrderRow, OrderFilters, OrderStatus } from "@/types/orders";
import { ORDER_STATUS_LABELS, VALID_TRANSITIONS } from "@/constants/orders";

export * from "@/types/orders";
export * from "@/constants/orders";


/**
 * Lista pedidos respeitando RLS e filtros avançados.
 */
export function useOrdersList(
  sellerId?: string, 
  scope: "self" | "team" | "all" = "self",
  filters?: OrderFilters
) {
  return useQuery({
    queryKey: ["orders", "list", sellerId, scope, filters],
    enabled: !!sellerId,
    queryFn: async () => {
      try {
        return await OrderService.list(sellerId!, scope, filters);
      } catch (error: any) {
        await logRlsDenial(error, {
          table: "orders", op: "SELECT",
          endpoint: "useOrdersList",
          querySummary: `scope=${scope} filters=${JSON.stringify(filters)}`,
          policyHint: "orders_select_scope",
        });
        throw error;
      }
    },
  });
}

/**
 * Hook para detalhes de um pedido.
 */
export function useOrderDetail(orderId?: string) {
  return useQuery({
    queryKey: ["orders", "detail", orderId],
    enabled: !!orderId,
    queryFn: () => OrderService.getById(orderId!),
  });
}

/**
 * Hook para atualização de pedidos com auditoria e notificações.
 */
export function useUpdateOrder(orderId?: string, currentStatus?: string) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (patch: Partial<OrderRow>) => {
      if (!orderId) throw new Error("ID do pedido é obrigatório");

      // Validar transição
      if (patch.status && currentStatus && !canTransitionTo(currentStatus, patch.status)) {
        throw new Error(`Transição de status inválida: de ${ORDER_STATUS_LABELS[currentStatus as OrderStatus] || currentStatus} para ${ORDER_STATUS_LABELS[patch.status as OrderStatus] || patch.status}`);
      }
      
      try {
        await OrderService.update(orderId, patch);
      } catch (error: any) {
        await logRlsDenial(error, {
          table: "orders", op: "UPDATE",
          endpoint: "useUpdateOrder",
          targetId: orderId,
          policyHint: "orders_update_scope",
        });
        throw error;
      }

      // Se o status mudou, registrar auditoria e notificar
      if (patch.status && patch.status !== currentStatus && user) {
        const oldLabel = ORDER_STATUS_LABELS[currentStatus as OrderStatus] || currentStatus;
        const newLabel = ORDER_STATUS_LABELS[patch.status as OrderStatus] || patch.status;
        
        await OrderService.logAudit({
          orderId,
          eventType: 'status_change',
          description: `Status alterado de ${oldLabel} para ${newLabel}`,
          metadata: { old_status: currentStatus, new_status: patch.status },
          createdByName: user.email
        });

        await OrderService.notifyStatusChange({
          orderId,
          userId: user.id,
          userEmail: user.email || "",
          newStatus: patch.status as OrderStatus,
          oldStatus: currentStatus || "",
          notes: patch.notes || undefined
        });
      }
    },
    onSuccess: () => {
      toast.success("Pedido atualizado");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/**
 * Funções utilitárias de transição expostas para compatibilidade
 */
export function canTransitionTo(current: string, next: string): boolean {
  if (current === next) return true;
  const validNext = VALID_TRANSITIONS[current as OrderStatus] || [];
  return validNext.includes(next as OrderStatus);
}

/**
 * Hook para ações diversas em pedidos (duplicação, etc).
 */
export function useOrderActions() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const duplicateOrder = async (orderId: string): Promise<OrderRow | null> => {
    if (!user) return null;
    try {
      const newOrder = await OrderService.duplicate(orderId, user.id);
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Pedido duplicado com sucesso");
      return newOrder;
    } catch (err) {
      console.error("Error duplicating order:", err);
      toast.error("Erro ao duplicar pedido");
      return null;
    }
  };

  return {
    duplicateOrder,
  };
}

// Para manter compatibilidade com import { useOrders }
export function useOrders() {
  return useOrderActions();
}
