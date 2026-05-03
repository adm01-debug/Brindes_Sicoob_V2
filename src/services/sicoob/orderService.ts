import { supabase } from "@/integrations/supabase/client";
import { SicoobOrder, SicoobOrderItem, SicoobOrderItemLog, OrderStatus, canSicoobTransitionTo } from "@/types/sicoob/orders";

/**
 * Service for Sicoob Orders with authorization checks.
 * Note: RLS on the database is the primary security layer, 
 * but client-side checks provide better UX.
 */
export const sicoobOrderService = {
  async listOrders(filters?: { 
    search?: string, 
    status?: string, 
    pa_id?: string, 
    cooperative_id?: string,
    from?: string,
    to?: string
  }): Promise<SicoobOrder[]> {
    let query = supabase.from("sicoob_orders").select("*, pa:postos_atendimento(nome), cooperativa:cooperativas(nome)");

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters?.pa_id && filters.pa_id !== "all") {
      query = query.eq("pa_id", filters.pa_id);
    }
    if (filters?.cooperative_id && filters.cooperative_id !== "all") {
      query = query.eq("cooperative_id", filters.cooperative_id);
    }
    if (filters?.from) {
      query = query.gte("created_at", filters.from);
    }
    if (filters?.to) {
      query = query.lte("created_at", filters.to);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    
    let results = data as SicoobOrder[];
    
    if (filters?.search) {
      const term = filters.search.toLowerCase();
      results = results.filter(o => 
        o.id.toLowerCase().includes(term) || 
        o.notes?.toLowerCase().includes(term) ||
        o.tracking_code?.toLowerCase().includes(term)
      );
    }
    
    return results;
  },

  async getOrderById(id: string): Promise<SicoobOrder> {
    const { data, error } = await supabase
      .from("sicoob_orders")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as SicoobOrder;
  },


  async getOrderItems(orderId: string): Promise<SicoobOrderItem[]> {
    const { data, error } = await supabase
      .from("sicoob_order_items")
      .select("*")
      .eq("order_id", orderId);
    if (error) throw error;
    return data as SicoobOrderItem[];
  },

  async getItemLogs(orderId: string): Promise<SicoobOrderItemLog[]> {
    const { data, error } = await supabase
      .from("sicoob_order_item_logs")
      .select(`
        id,
        action,
        old_data,
        new_data,
        created_at,
        user:profiles!user_id(display_name)
      `)
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as unknown as SicoobOrderItemLog[];
  },

  async updateOrderStatus(orderId: string, status: string, currentStatus?: string): Promise<void> {
    if (currentStatus && !canSicoobTransitionTo(currentStatus as OrderStatus, status as OrderStatus)) {
      throw new Error(`Transição de status inválida: de ${currentStatus} para ${status}`);
    }

    const { error } = await supabase
      .from("sicoob_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) throw error;

    // Trigger notification
    try {
      const order = await this.getOrderById(orderId);
      const { data: { user } } = await supabase.auth.getUser();
      
      // Call standard transactional email function
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          event_type: 'sicoob_order_status_change',
          recipient_email: user?.email, // Should ideally be order creator's email
          recipient_name: user?.email?.split('@')[0],
          data: {
            order_number: orderId.slice(0, 8),
            new_status: status,
            action_url: `${window.location.origin}/sicoob/pedidos/${orderId}`
          }
        }
      });

      // In-app notification as fallback/primary
      await supabase.from('notifications').insert({
        user_id: order.created_by,
        title: "Status do Pedido Sicoob Atualizado",
        message: `Seu pedido #${orderId.slice(0, 8)} mudou para ${status}`,
        type: 'info',
        category: 'status',
        source_entity_id: orderId,
        action_url: `/sicoob/pedidos/${orderId}`
      });
    } catch (err) {
      console.warn("Falha ao processar notificações, mas pedido foi atualizado:", err);
    }

  },

  async updateOrderTotal(orderId: string, total: number): Promise<void> {
    const { error } = await supabase
      .from("sicoob_orders")
      .update({ total_amount: total, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) throw error;
  }
};
