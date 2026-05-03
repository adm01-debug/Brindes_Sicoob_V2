import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

/**
 * Common service for Quote to Order conversion.
 * Abstracted to avoid component/hook dependency on raw Supabase client.
 */
export const quoteToOrderService = {
  async fetchQuote(quoteId: string) {
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .maybeSingle();
    
    if (error) throw error;
    if (!data) throw new Error("Orçamento não encontrado");
    return data;
  },

  async checkExistingOrder(quoteId: string) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number")
      .eq("quote_id", quoteId)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async createOrder(params: any) {
    const { data, error } = await supabase
      .from("orders")
      .insert(params)
      .select("id, order_number, status, total")
      .single();
    
    if (error) throw error;
    return data;
  },

  async copyItems(orderId: string, quoteId: string, organizationId: string | null) {
    const { data: quoteItems, error: fetchError } = await supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", quoteId);
    
    if (fetchError) throw fetchError;
    if (!quoteItems || quoteItems.length === 0) return;

    const orderItems = quoteItems.map((item) => ({
      order_id: orderId,
      organization_id: organizationId,
      product_id: item.product_id,
      product_sku: item.product_sku,
      product_name: item.product_name,
      product_image_url: item.product_image_url,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));

    const { error: insertError } = await supabase
      .from("order_items")
      .insert(orderItems);
    
    if (insertError) throw insertError;
  },

  async updateQuoteStatus(quoteId: string, status: string) {
    const { error } = await supabase
      .from("quotes")
      .update({ status })
      .eq("id", quoteId);
    
    if (error) throw error;
  }
};
