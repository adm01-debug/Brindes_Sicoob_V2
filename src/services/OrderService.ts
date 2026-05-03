import { supabase } from "@/integrations/supabase/client";
import { OrderRow, OrderFilters, OrderItem, OrderStatus } from "@/types/orders";
import { ORDER_STATUS_LABELS } from "@/constants/orders";

export class OrderService {
  static async list(sellerId: string, scope: string, filters?: OrderFilters): Promise<OrderRow[]> {
    let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
    
    if (scope === "self" && sellerId) q = q.eq("seller_id", sellerId);
    
    if (filters?.status && filters.status !== "all") {
      q = q.eq("status", filters.status);
    }
    
    if (filters?.clientCompany) {
      q = q.ilike("client_company", `%${filters.clientCompany}%`);
    }
    
    if (filters?.startDate) q = q.gte("created_at", filters.startDate);
    if (filters?.endDate) q = q.lte("created_at", filters.endDate);
    
    if (filters?.search) {
      q = q.or(`order_number.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%,client_company.ilike.%${filters.search}%`);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as OrderRow[];
  }

  static async getById(orderId: string) {
    const [orderRes, itemsRes] = await Promise.all([
      supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
      supabase.from("order_items").select("*").eq("order_id", orderId),
    ]);
    
    if (orderRes.error) throw orderRes.error;
    if (itemsRes.error) throw itemsRes.error;
    
    return {
      order: orderRes.data as OrderRow | null,
      items: itemsRes.data as OrderItem[],
    };
  }

  static async update(orderId: string, patch: Partial<OrderRow>) {
    const { error } = await supabase
      .from("orders")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", orderId);
      
    if (error) throw error;
  }

  static async logAudit(params: {
    orderId: string;
    eventType: string;
    description: string;
    metadata: any;
    createdByName?: string;
  }) {
    await supabase.rpc('log_order_audit_event', {
      p_order_id: params.orderId,
      p_event_type: params.eventType,
      p_description: params.description,
      p_metadata: params.metadata,
      p_created_by_name: params.createdByName
    });
  }

  static async notifyStatusChange(params: {
    orderId: string;
    userId: string;
    userEmail: string;
    newStatus: OrderStatus;
    oldStatus: string;
    notes?: string;
  }) {
    const statusLabel = ORDER_STATUS_LABELS[params.newStatus];
    
    // In-app notification
    await supabase.from('notifications').insert({
      user_id: params.userId,
      title: "Status do Pedido Atualizado",
      message: `O pedido #${params.orderId.slice(0, 8)} mudou para ${statusLabel}`,
      type: 'info',
      category: 'status',
      source_system: 'compras',
      source_entity_type: 'order',
      source_entity_id: params.orderId,
      action_url: `/pedidos/${params.orderId}`
    });

    // Edge Function Email
    try {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          event_type: 'sicoob_order_status_change',
          recipient_email: params.userEmail,
          recipient_name: params.userEmail.split('@')[0],
          data: {
            order_number: params.orderId.slice(0, 8),
            new_status: statusLabel,
            notes: params.notes,
            action_url: `${window.location.origin}/pedidos/${params.orderId}`
          }
        }
      });
    } catch (e) {
      console.error('Email notification failed:', e);
    }
  }

  static async duplicate(orderId: string, sellerId: string): Promise<OrderRow> {
    const { order: original, items } = await this.getById(orderId);
    if (!original) throw new Error("Order not found");

    const newOrderNumber = `RE-${original.order_number.replace('PED-', '')}-${Math.floor(Math.random() * 1000)}`;
    
    const { data: newOrder, error: insErr } = await supabase
      .from("orders")
      .insert({
        ...original,
        id: undefined,
        order_number: newOrderNumber,
        status: "rascunho",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        seller_id: sellerId
      })
      .select()
      .single();

    if (insErr) throw insErr;

    if (items?.length) {
      const newItems = items.map(it => ({
        ...it,
        id: undefined,
        order_id: newOrder.id,
        created_at: undefined
      }));
      await supabase.from("order_items").insert(newItems);
    }

    return newOrder as OrderRow;
  }
}
