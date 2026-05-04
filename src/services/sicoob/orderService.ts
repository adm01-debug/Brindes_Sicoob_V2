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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

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

    const { data: profile } = await supabase.from("profiles").select("role, pa_id, cooperativa_id").eq("id", user.id).single();

    // RLS will handle most of this, but we filter here for cleaner code/UX
    if (profile?.role === 'gestor_pa' && profile.pa_id) {
      query = query.eq("pa_id", profile.pa_id);
    } else if (profile?.role === 'gestor_singular' && profile.cooperativa_id) {
      query = query.eq("cooperative_id", profile.cooperativa_id);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("sicoob_orders")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as SicoobOrder;
  },


  async getOrderItems(orderId: string): Promise<SicoobOrderItem[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("sicoob_order_items")
      .select("*")
      .eq("order_id", orderId);
    if (error) throw error;
    return data as SicoobOrderItem[];
  },

  async getItemLogs(orderId: string): Promise<SicoobOrderItemLog[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

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

  async updateOrderStatus(orderId: string, status: string, currentStatus?: string, observations?: string): Promise<void> {
    if (currentStatus && !canSicoobTransitionTo(currentStatus as OrderStatus, status as OrderStatus)) {
      throw new Error(`Transição de status inválida: de ${currentStatus} para ${status}`);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { error } = await supabase
      .from("sicoob_orders")
      .update({ 
        status, 
        updated_at: new Date().toISOString(),
        ...(status === 'confirmed' ? { approved_by: user.id, approved_at: new Date().toISOString() } : {})
      })
      .eq("id", orderId);
    if (error) throw error;

    // Registrar evento de auditoria se houver observações ou mudança de status
    try {
      await supabase.from('order_audit_events').insert({
        order_id: orderId,
        event_type: 'status_change',
        old_value: { fulfillment_status: currentStatus },
        new_value: { fulfillment_status: status },
        observations: observations,
        created_by: user.id,
        actor_role: 'system_action' // Isso pode ser dinâmico dependendo do perfil
      });
    } catch (auditErr) {
      console.warn("Falha ao registrar auditoria:", auditErr);
    }

    // Gatilho de notificação e registro
    try {
      const order = await this.getOrderById(orderId);
      
      // Call standard transactional email function if exists
      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            event_type: 'sicoob_order_status_change',
            recipient_email: user?.email, 
            recipient_name: user?.email?.split('@')[0],
            data: {
              order_number: orderId.slice(0, 8),
              new_status: status,
              action_url: `${window.location.origin}/sicoob/pedidos/${orderId}`
            }
          }
        });
      } catch (e) {
        console.warn("Edge function not available yet");
      }

      // In-app notification
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
      console.warn("Falha ao processar notificações:", err);
    }
  },

  async updateOrderTotal(orderId: string, total: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { error } = await supabase
      .from("sicoob_orders")
      .update({ total_amount: total, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) throw error;
  },
  
  async approveOrdersBulk(orderIds: string[]): Promise<{ successes: string[], failures: { id: string, reason: string }[] }> {
    const results = await Promise.allSettled(
      orderIds.map(async (id) => {
        await this.updateOrderStatus(id, 'confirmed');
        return id;
      })
    );

    const successes: string[] = [];
    const failures: { id: string, reason: string }[] = [];

    results.forEach((res, index) => {
      if (res.status === 'fulfilled') {
        successes.push(res.value);
      } else {
        failures.push({ id: orderIds[index], reason: res.reason?.message || "Erro desconhecido" });
      }
    });

    return { successes, failures };
  }
};
