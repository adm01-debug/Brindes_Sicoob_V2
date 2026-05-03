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
    let query = supabase.from("sicoob_orders").select("*");

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
      .update({ status })
      .eq("id", orderId);
    if (error) throw error;
  },

  async updateOrderTotal(orderId: string, total: number): Promise<void> {
    const { error } = await supabase
      .from("sicoob_orders")
      .update({ total_amount: total, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) throw error;
  }
};
