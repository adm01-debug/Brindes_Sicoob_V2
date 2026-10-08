import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { logRlsDenial } from "@/lib/security/rls-denial-logger";
import { useAuth } from "@/contexts/AuthContext";
import { OrderService } from "@/services/OrderService";
import { type OrderRow, type OrderFilters, type OrderStatus } from "@/types/orders";
import { ORDER_STATUS_LABELS, VALID_TRANSITIONS } from "@/constants/orders";
import type { PostgrestError } from "@supabase/supabase-js";

function asPostgrestError(error: unknown): PostgrestError | undefined {
  if (typeof error !== "object" || error === null || !("code" in error) || !("message" in error)) return undefined;
  const candidate = error as Partial<PostgrestError>;
  return typeof candidate.code === "string" && typeof candidate.message === "string"
    ? candidate as PostgrestError
    : undefined;
}

export * from "@/types/orders";
export * from "@/constants/orders";

function validateStatusTransition(patch: Partial<OrderRow>, currentStatus?: string) {
  if (!patch.status || !currentStatus || canTransitionTo(currentStatus, patch.status)) return;
  const oldLabel = ORDER_STATUS_LABELS[currentStatus as OrderStatus] || currentStatus;
  const newLabel = ORDER_STATUS_LABELS[patch.status as OrderStatus] || patch.status;
  throw new Error(`Transição de status inválida: de ${oldLabel} para ${newLabel}`);
}

async function recordStatusChange(
  orderId: string,
  currentStatus: string | undefined,
  patch: Partial<OrderRow>,
  user: { id: string; email?: string | null },
) {
  if (!patch.status || patch.status === currentStatus) return;
  const oldLabel = ORDER_STATUS_LABELS[currentStatus as OrderStatus] || currentStatus;
  const newLabel = ORDER_STATUS_LABELS[patch.status as OrderStatus] || patch.status;
  await OrderService.logAudit({
    orderId,
    eventType: "status_change",
    description: `Status alterado de ${oldLabel} para ${newLabel}`,
    metadata: { old_status: currentStatus, new_status: patch.status },
    createdByName: user.email ?? undefined,
  });
  await OrderService.notifyStatusChange({
    orderId,
    userId: user.id,
    userEmail: user.email || "",
    newStatus: patch.status as OrderStatus,
    oldStatus: currentStatus || "",
    notes: patch.notes || undefined,
  });
}

export function useOrdersList(
  sellerId?: string, 
  scope: "self" | "team" | "all" = "self",
  filters?: OrderFilters & { page?: number; pageSize?: number }
) {
  return useQuery({
    queryKey: ["orders", "list", sellerId, scope, filters],
    enabled: !!sellerId,
    queryFn: async () => {
      if (!sellerId) throw new Error("ID do vendedor é obrigatório");
      try {
        return await OrderService.list(sellerId, scope, filters);
      } catch (error: unknown) {
        await logRlsDenial(asPostgrestError(error), {
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

export function useOrderDetail(orderId?: string) {
  return useQuery({
    queryKey: ["orders", "detail", orderId],
    enabled: !!orderId,
    queryFn: () => {
      if (!orderId) throw new Error("ID do pedido é obrigatório");
      return OrderService.getById(orderId);
    },
  });
}

export function useUpdateOrder(orderId?: string, currentStatus?: string) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (patch: Partial<OrderRow>) => {
      if (!orderId) throw new Error("ID do pedido é obrigatório");

      validateStatusTransition(patch, currentStatus);
      
      try {
        await OrderService.update(orderId, patch);
      } catch (error: unknown) {
        await logRlsDenial(asPostgrestError(error), {
          table: "orders", op: "UPDATE",
          endpoint: "useUpdateOrder",
          targetId: orderId,
          policyHint: "orders_update_scope",
        });
        throw error;
      }

      if (user) await recordStatusChange(orderId, currentStatus, patch, user);
    },
    onSuccess: () => {
      toast.success("Pedido atualizado");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => {
      console.error("Update order failed:", e);
      toast.error(e.message);
    },
  });
}

export function useConvertQuoteToOrder() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { quoteId: string; organizationId?: string | null }) => {
      if (!user) throw new Error("Usuário não autenticado");
      return await OrderService.convertQuoteToOrder({
        quoteId: params.quoteId,
        sellerId: user.id,
        organizationId: params.organizationId,
      });
    },
    onSuccess: (order) => {
      toast.success(`Pedido #${order.order_number} criado com sucesso!`);
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (e: Error) => {
      console.error("Conversion failed:", e);
      toast.error(e.message || "Erro ao converter orçamento");
    },
  });
}

export function canTransitionTo(current: string, next: string): boolean {
  if (current === next) return true;
  const validNext = VALID_TRANSITIONS[current as OrderStatus] || [];
  return validNext.includes(next as OrderStatus);
}

export function useOrderActions() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const pendingDuplicateKeys = useRef(new Map<string, string>());

  const duplicateOrder = async (orderId: string): Promise<OrderRow | null> => {
    if (!user) return null;
    const idempotencyKey = pendingDuplicateKeys.current.get(orderId) ?? crypto.randomUUID();
    pendingDuplicateKeys.current.set(orderId, idempotencyKey);
    try {
      const newOrder = await OrderService.duplicate(orderId, idempotencyKey);
      pendingDuplicateKeys.current.delete(orderId);
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

export function useOrders() {
  return useOrderActions();
}
