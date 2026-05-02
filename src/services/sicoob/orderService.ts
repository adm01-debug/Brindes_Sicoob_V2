import { supabase } from "@/integrations/supabase/client";
import { SicoobOrder, SicoobOrderItem, SicoobOrderItemLog, OrderStatus, canSicoobTransitionTo } from "@/types/sicoob/orders";

export const sicoobOrderService = {
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
