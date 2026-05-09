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
    to?: string,
    page?: number,
    pageSize?: number
  }): Promise<{ orders: SicoobOrder[], total: number }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    let query = supabase.from("sicoob_orders")
      .select("*, pa:postos_atendimento(nome), cooperativa:cooperativas(nome)", { count: "exact" });

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

    if (filters?.search) {
      const term = filters.search.toLowerCase().trim();
      // Em uma implementação enterprise real, usaríamos busca full-text ou um operador or complexo.
      // Aqui, aplicamos o filtro na query principal para campos suportados.
      query = query.or(`order_number.ilike.%${term}%,notes.ilike.%${term}%,tracking_code.ilike.%${term}%`);
    }

    const { data: profile } = await supabase.from("profiles").select("role, pa_id, cooperativa_id").eq("id", user.id).single();

    if (profile?.role === 'gestor_pa' && profile.pa_id) {
      query = query.eq("pa_id", profile.pa_id);
    } else if (profile?.role === 'gestor_singular' && profile.cooperativa_id) {
      query = query.eq("cooperative_id", profile.cooperativa_id);
    }

    // Paginação no servidor para performance máxima
    if (filters?.page && filters?.pageSize) {
      const from = (filters.page - 1) * filters.pageSize;
      const to = from + filters.pageSize - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    
    return {
      orders: data as SicoobOrder[],
      total: count || 0
    };
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
        message: `Seu pedido #${order.order_number || orderId.slice(0, 8)} mudou para ${status}`,
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
  },

  async reorderOrder(orderId: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const order = await this.getOrderById(orderId);
    const items = await this.getOrderItems(orderId);

    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();

    // Create a new quote from this sicoob order
    const { data: newQuote, error: qErr } = await supabase.from("quotes").insert({
      client_id: order.pa_id,
      client_name: (order as any).pa?.nome || order.pa_id,
      status: 'draft',
      notes: `Recompra do pedido Sicoob #${order.order_number || order.id.slice(0, 8)}`,
      singular_id: order.cooperative_id,
      organization_id: profile?.organization_id || order.pa_id,
      total: order.total_amount,
      subtotal: order.total_amount,
    }).select("id").single();

    if (qErr) throw qErr;

    if (items.length > 0) {
      const quoteItems = items.map(it => ({
        quote_id: newQuote.id,
        product_id: it.product_id,
        product_sku: it.product_sku,
        product_name: it.product_name,
        product_image_url: it.product_image_url,
        quantity: it.quantity,
        unit_price: it.unit_price,
      }));
      const { error: iErr } = await supabase.from("quote_items").insert(quoteItems);
      if (iErr) throw iErr;
    }

    return newQuote.id;
  },

  async duplicateSicoobOrder(orderId: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const order = await this.getOrderById(orderId);
    const items = await this.getOrderItems(orderId);

    const { data: newOrder, error: oErr } = await supabase.from("sicoob_orders").insert({
      pa_id: order.pa_id,
      cooperative_id: order.cooperative_id,
      status: 'draft',
      notes: `Duplicado do pedido #${order.order_number || order.id.slice(0, 8)}`,
      total_amount: order.total_amount,
      created_by: user.id
    }).select("id").single();

    if (oErr) throw oErr;

    if (items.length > 0) {
      const orderItems = items.map(it => ({
        order_id: newOrder.id,
        product_id: it.product_id,
        product_sku: it.product_sku,
        product_name: it.product_name,
        product_image_url: it.product_image_url,
        quantity: it.quantity,
        unit_price: it.unit_price,
      }));
      const { error: iErr } = await supabase.from("sicoob_order_items").insert(orderItems);
      if (iErr) throw iErr;
    }

    return newOrder.id;
  }
};
