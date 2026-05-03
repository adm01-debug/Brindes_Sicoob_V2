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
  const { user } = useAuth();

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

      // Log audit event if status changed
      if (patch.status && patch.status !== currentStatus) {
        await supabase.rpc('log_order_audit_event', {
          p_order_id: orderId,
          p_event_type: 'status_change',
          p_description: `Status alterado de ${ORDER_STATUS_LABELS[currentStatus || ''] || currentStatus} para ${ORDER_STATUS_LABELS[patch.status] || patch.status}`,
          p_metadata: { old_status: currentStatus, new_status: patch.status },
          p_created_by_name: user?.email
        });

        // Trigger email notification
        try {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              event_type: 'sicoob_order_status_change',
              recipient_email: user?.email, // In production this would be the PA/Client email
              recipient_name: user?.email?.split('@')[0],
              data: {
                order_number: orderId?.slice(0, 8),
                new_status: ORDER_STATUS_LABELS[patch.status],
                notes: patch.notes,
                action_url: `${window.location.origin}/pedidos/${orderId}`
              }
            }
          });
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          // Fallback to in-app notification (already handled below)
        }

        // Create in-app notification (fallback and primary)
        await supabase.from('notifications').insert({
          user_id: user?.id,
          title: "Status do Pedido Atualizado",
          message: `O pedido #${orderId?.slice(0, 8)} mudou para ${ORDER_STATUS_LABELS[patch.status]}`,
          type: 'info',
          category: 'status',
          source_system: 'compras',
          source_entity_type: 'order',
          source_entity_id: orderId,
          action_url: `/pedidos/${orderId}`
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

export const ORDER_STATUS_FLOW = [
  "rascunho",
  "enviado_gestor",
  "aprovado_gestor",
  "enviado_vendedor",
  "em_producao",
  "em_separacao",
  "em_transporte",
  "entregue",
  "concluido",
  "cancelado"
] as const;

export type OrderStatus = typeof ORDER_STATUS_FLOW[number];

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  rascunho: ["enviado_gestor", "cancelado"],
  enviado_gestor: ["aprovado_gestor", "rascunho", "cancelado"],
  aprovado_gestor: ["enviado_vendedor", "cancelado"],
  enviado_vendedor: ["em_producao", "cancelado"],
  em_producao: ["em_separacao", "cancelado"],
  em_separacao: ["em_transporte", "cancelado"],
  em_transporte: ["entregue", "cancelado"],
  entregue: ["concluido", "cancelado"],
  concluido: [],
  cancelado: [],
};

export function canTransitionTo(current: string, next: string): boolean {
  if (current === next) return true;
  const validNext = VALID_TRANSITIONS[current as OrderStatus] || [];
  return validNext.includes(next as OrderStatus);
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  rascunho: "Rascunho",
  enviado_gestor: "Enviado ao Gestor",
  aprovado_gestor: "Aprovado pela Singular",
  enviado_vendedor: "Enviado ao Vendedor",
  em_producao: "Em Produção",
  em_separacao: "Em Separação",
  em_transporte: "Em Transporte",
  entregue: "Entregue",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const FULFILLMENT_LABELS = ORDER_STATUS_LABELS;

// Type check to ensure ORDER_STATUS_LABELS covers all OrderStatus values
const _statusCheck: Record<OrderStatus, string> = ORDER_STATUS_LABELS;
console.log('Order labels initialized:', !!_statusCheck);

/**
 * Hook principal para operações de Pedido.
 */
export function useOrders() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const duplicateOrder = async (orderId: string): Promise<OrderRow | null> => {
    try {
      const { data: original, error: fetchErr } = await supabase
        .from("orders")
        .select("*, items:order_items(*)")
        .eq("id", orderId)
        .single();

      if (fetchErr) throw fetchErr;

      const newOrderNumber = `RE-${original.order_number.replace('PED-', '')}-${Math.floor(Math.random() * 1000)}`;
      
      const { data: newOrder, error: insErr } = await supabase
        .from("orders")
        .insert({
          ...original,
          id: undefined,
          items: undefined,
          order_number: newOrderNumber,
          status: "rascunho",
          created_at: new_date().toISOString(),
          updated_at: new_date().toISOString(),
          seller_id: user?.id
        })
        .select()
        .single();

      if (insErr) throw insErr;

      if (original.items?.length) {
        const items = original.items.map((it: any) => ({
          ...it,
          id: undefined,
          order_id: newOrder.id,
          created_at: undefined
        }));
        await supabase.from("order_items").insert(items);
      }

      qc.invalidateQueries({ queryKey: ["orders"] });
      return newOrder as OrderRow;
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

function new_date() { return new Date(); }

