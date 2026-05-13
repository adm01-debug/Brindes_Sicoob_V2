import { supabase } from "@/integrations/supabase/client";
import { applySellerScope } from "@/lib/auth/apply-seller-scope";
import { Quote, QuoteItem, PersonalizationTechnique } from "@/hooks/quotes/quoteTypes";
import { calculateQuoteTotals, buildInsertPayload, buildUpdatePayload, buildItemsInsertPayload, buildPersonalizationsInsertPayload } from "@/hooks/quotes/quoteHelpers";

export class QuoteService {
  static async list(params: { userId: string, scope: string, orgId: string | null }): Promise<Quote[]> {
    let q = supabase.from("quotes").select("*").order("created_at", { ascending: false }).limit(500);
    q = applySellerScope(q, { scope: params.scope as any, userId: params.userId });
    
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as Quote[];
  }

  static async getById(quoteId: string): Promise<Quote | null> {
    const { data: quoteData, error: qErr } = await supabase.from("quotes").select("*").eq("id", quoteId).single();
    if (qErr) throw qErr;
    if (!quoteData) return null;

    const { data: itemsData } = await supabase.from("quote_items").select("*").eq("quote_id", quoteId).order("sort_order", { ascending: true });
    
    const itemIds = (itemsData || []).map((i) => i.id);
    let allPersonalizations: any[] = [];
    if (itemIds.length > 0) {
      const { data: persData } = await supabase.from("quote_item_personalizations").select("*").in("quote_item_id", itemIds);
      allPersonalizations = persData || [];
    }

    const items: QuoteItem[] = (itemsData || []).map((item) => ({
      ...item,
      personalizations: allPersonalizations.filter(p => p.quote_item_id === item.id),
    }));

    return { ...quoteData, items } as Quote;
  }

  static async create(params: { quote: Partial<Quote>, items: QuoteItem[], userId: string, orgId: string | null }): Promise<Quote> {
    const totals = calculateQuoteTotals(params.quote, params.items);
    const insertPayload = buildInsertPayload(params.quote, params.userId, params.orgId, totals);
    
    const { data: inserted, error: insErr } = await supabase.from("quotes").insert(insertPayload).select("*").single();
    if (insErr) throw insErr;

    if (params.items.length > 0) {
      await this.insertItemsWithPersonalizations(params.items, inserted.id);
    }

    return inserted as unknown as Quote;
  }

  static async update(params: { 
    quoteId: string, 
    quote: Partial<Quote>, 
    items: QuoteItem[],
    userId: string 
  }): Promise<Quote> {
    const oldQuote = await this.getById(params.quoteId);
    if (!oldQuote) throw new Error("Orçamento não encontrado para atualização");

    const totals = calculateQuoteTotals(params.quote, params.items);
    const updatePayload = buildUpdatePayload(params.quote, totals);
    
    const { data: updated, error: updErr } = await supabase
      .from("quotes")
      .update(updatePayload)
      .eq("id", params.quoteId)
      .eq("row_version", oldQuote.row_version || 1)
      .select("*")
      .single();

    if (updErr) {
      if (updErr.code === 'PGRST116') {
        throw new Error("Concorrência detectada: Este orçamento foi modificado por outro usuário. Por favor, recarregue a página.");
      }
      throw updErr;
    }

    // Granular Audit Logging
    const changes: string[] = [];
    
    // 1. Header Changes
    if (params.quote.discount_percent !== undefined && params.quote.discount_percent !== oldQuote.discount_percent) {
      changes.push(`Desconto alterado de ${oldQuote.discount_percent}% para ${params.quote.discount_percent}%`);
    }
    if (params.quote.negotiation_markup_percent !== undefined && params.quote.negotiation_markup_percent !== oldQuote.negotiation_markup_percent) {
      changes.push(`Markup alterado de ${oldQuote.negotiation_markup_percent}% para ${params.quote.negotiation_markup_percent}%`);
    }
    if (params.quote.status !== undefined && params.quote.status !== oldQuote.status) {
      changes.push(`Status alterado de ${oldQuote.status} para ${params.quote.status}`);
    }

    // 2. Item Changes
    const oldItems = oldQuote.items || [];
    const newItems = params.items;

    // Detect deleted items
    oldItems.forEach(oldItem => {
      const stillExists = newItems.some(newItem => newItem.product_id === oldItem.product_id && newItem.color_name === oldItem.color_name);
      if (!stillExists) {
        changes.push(`Item removido: ${oldItem.product_name}`);
      }
    });

    // Detect added/modified items
    newItems.forEach(newItem => {
      const oldItem = oldItems.find(oi => oi.product_id === newItem.product_id && oi.color_name === newItem.color_name);
      if (!oldItem) {
        changes.push(`Item adicionado: ${newItem.product_name} (${newItem.quantity}x)`);
      } else {
        if (newItem.quantity !== oldItem.quantity) {
          changes.push(`Quantidade de ${newItem.product_name} alterada: ${oldItem.quantity} -> ${newItem.quantity}`);
        }
        if (newItem.unit_price !== oldItem.unit_price) {
          changes.push(`Preço unitário de ${newItem.product_name} alterado: R$${oldItem.unit_price} -> R$${newItem.unit_price}`);
        }
      }
    });

    // Log each change to history
    for (const change of changes) {
      await this.logHistory({
        quoteId: params.quoteId,
        userId: params.userId,
        action: "updated",
        description: change
      });
    }

    await supabase.from("quote_items").delete().eq("quote_id", params.quoteId);
    await this.insertItemsWithPersonalizations(params.items, params.quoteId);

    return updated as unknown as Quote;
  }

  static async delete(quoteId: string) {
    const { error } = await supabase.from("quotes").delete().eq("id", quoteId);
    if (error) throw error;
  }

  static async reorder(quoteId: string, userId: string, orgId: string | null): Promise<Quote> {
    const original = await this.getById(quoteId);
    if (!original) throw new Error("Orçamento original não encontrado");

    // Clean sensitive/metadata for the new quote
    const { 
      id, created_at, updated_at, quote_number, status, 
      total, subtotal, discount_amount, converted_at,
      ...cleanQuote 
    } = original as any;
    
    const newQuote: Partial<Quote> = {
      ...cleanQuote,
      status: 'draft',
      notes: `Recompra do orçamento #${original.quote_number}. ${original.notes || ''}`,
    };

    return this.create({
      quote: newQuote,
      items: original.items || [],
      userId,
      orgId
    });
  }

  static async reorderFromOrder(orderId: string, userId: string, orgId: string | null): Promise<Quote> {
    const { data: order, error: orderErr } = await supabase.from("orders").select("*").eq("id", orderId).single();
    if (orderErr) throw orderErr;
    
    const { data: items, error: itemsErr } = await supabase.from("order_items").select("*").eq("order_id", orderId);
    if (itemsErr) throw itemsErr;

    const newQuote: Partial<Quote> = {
      client_id: order.client_id,
      client_name: order.client_name,
      client_email: order.client_email,
      client_phone: order.client_phone,
      client_company: order.client_company,
      payment_terms: order.payment_terms,
      delivery_time: order.delivery_time,
      shipping_type: order.shipping_type,
      notes: `Recompra do pedido #${order.order_number}.`,
      status: 'draft'
    };

    const quoteItems: QuoteItem[] = (items || []).map(item => ({
      product_id: item.product_id,
      product_sku: item.product_sku,
      product_name: item.product_name,
      product_image_url: item.product_image_url,
      quantity: item.quantity,
      unit_price: item.unit_price,
      personalizations: []
    }));

    return this.create({
      quote: newQuote,
      items: quoteItems,
      userId,
      orgId
    });
  }

  private static async insertItemsWithPersonalizations(items: QuoteItem[], quoteId: string) {
    const itemsPayload = buildItemsInsertPayload(items, quoteId);
    const { data: insertedItems, error: itemsErr } = await supabase.from("quote_items").insert(itemsPayload).select("*");
    if (itemsErr) throw itemsErr;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const insertedItem = insertedItems?.[i];
      if (item.personalizations?.length && insertedItem) {
        const persPayload = buildPersonalizationsInsertPayload(item.personalizations, insertedItem.id);
        await supabase.from("quote_item_personalizations").insert(persPayload);
      }
    }
  }

  static async logHistory(params: {
    quoteId: string;
    userId: string;
    action: string;
    description: string;
    fieldChanged?: string;
    oldValue?: string;
    newValue?: string;
    metadata?: any;
  }) {
    // Captura IP e UA do lado do cliente se não for fornecido
    const clientMetadata = {
      ip: params.metadata?.ip || 'client',
      user_agent: params.metadata?.user_agent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'),
      timestamp: new Date().toISOString(),
      ...(params.metadata || {})
    };

    await supabase.from("quote_history").insert({
      quote_id: params.quoteId,
      user_id: params.userId,
      action: params.action,
      description: params.description,
      field_changed: params.fieldChanged || null,
      old_value: params.oldValue || null,
      new_value: params.newValue || null,
      metadata: clientMetadata,
    });
  }
}
