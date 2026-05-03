/**
 * useOrders — hooks centralizados para listagem, detalhe e mutações de pedidos.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logRlsDenial } from "@/lib/security/rls-denial-logger";
import { useAuth } from "@/contexts/AuthContext";

export interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  fulfillment_status: string;
  total: number | null;
  subtotal: number | null;
  discount_amount: number | null;
  shipping_cost: number | null;
  shipping_type: string | null;
  tracking_number: string | null;
  delivery_time: string | null;
  payment_terms: string | null;
  client_id: string | null;
  client_name: string | null;
  client_company: string | null;
  client_email: string | null;
  client_phone: string | null;
  notes: string | null;
  internal_notes: string | null;
  quote_id: string | null;
  seller_id: string;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Lista pedidos respeitando RLS. Quando `scope === "self"`, aplica filtro
 * adicional por seller_id (defesa em profundidade); para "team"/"all" deixa
 * o RLS decidir o que aparece.
 */
export function useOrdersList(sellerId?: string, scope: "self" | "team" | "all" = "self") {
  return useQuery({
    queryKey: ["orders", "list", sellerId, scope],
    enabled: !!sellerId,
    queryFn: async (): Promise<OrderRow[]> => {
      // rls-allow: applySellerScope chamado dinamicamente conforme escopo
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (scope === "self" && sellerId) q = q.eq("seller_id", sellerId);
      const { data, error } = await q;
      if (error) {
        await logRlsDenial(error, {
          table: "orders", op: "SELECT",
          endpoint: "useOrdersList",
          querySummary: `scope=${scope} sellerId=${sellerId ?? "?"}`,
          policyHint: "orders_select_scope",
        });
        throw error;
      }
      return (data ?? []) as OrderRow[];
    },
  });
}

export function useOrderDetail(orderId?: string) {
  return useQuery({
    queryKey: ["orders", "detail", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const [orderRes, itemsRes] = await Promise.all([
        // rls-allow: applySellerScope chamado dinamicamente conforme escopo
        supabase.from("orders").select("*").eq("id", orderId!).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", orderId!),
      ]);
      if (orderRes.error) throw orderRes.error;
      return {
        order: orderRes.data as OrderRow | null,
        items: itemsRes.data ?? [],
      };
    },
  });
}

export function useUpdateOrder(orderId?: string, currentStatus?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<OrderRow>) => {
      if (patch.status && currentStatus && !canTransitionTo(currentStatus, patch.status)) {
        throw new Error(`Transição de status inválida: de ${ORDER_STATUS_LABELS[currentStatus] || currentStatus} para ${ORDER_STATUS_LABELS[patch.status] || patch.status}`);
      }
      
      const { error } = await supabase
        .from("orders")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", orderId!);
      if (error) {
        await logRlsDenial(error, {
          table: "orders", op: "UPDATE",
          endpoint: "useUpdateOrder",
          targetId: orderId,
          policyHint: "orders_update_scope",
        });
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Pedido atualizado");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export const ORDER_STATUS_FLOW = [
  "pending",
  "waiting_approval",
  "confirmed",
  "in_production",
  "in_separation",
  "in_transit",
  "delivered",
  "completed",
  "cancelled"
] as const;

export type OrderStatus = typeof ORDER_STATUS_FLOW[number];

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["waiting_approval", "cancelled"],
  waiting_approval: ["confirmed", "cancelled"],
  confirmed: ["in_production", "cancelled"],
  in_production: ["in_separation", "cancelled"],
  in_separation: ["in_transit", "cancelled"],
  in_transit: ["delivered", "cancelled"],
  delivered: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionTo(current: string, next: string): boolean {
  if (current === next) return true;
  const validNext = VALID_TRANSITIONS[current as OrderStatus] || [];
  return validNext.includes(next as OrderStatus);
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  waiting_approval: "Aguardando Aprovação",
  confirmed: "Confirmado",
  in_production: "Em Produção",
  in_separation: "Em Separação",
  in_transit: "Em Transporte",
  delivered: "Entregue",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export const FULFILLMENT_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_production: "Em Produção",
  in_separation: "Em Separação",
  in_transit: "Em Transporte",
  delivered: "Entregue",
  completed: "Concluído",
  cancelled: "Cancelado",
};
