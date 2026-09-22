import { supabase } from "@/integrations/supabase/client";
import { applySellerScope } from "@/lib/auth/apply-seller-scope";
import type { SalesScope } from "@/lib/auth/visibility-scope";
import type { Json } from "@/integrations/supabase/types";
import { Quote, QuoteItem, QuoteItemPersonalization, PersonalizationTechnique } from "@/hooks/quotes/quoteTypes";
import { calculateQuoteTotals, buildInsertPayload, buildUpdatePayload, buildItemsInsertPayload, buildPersonalizationsInsertPayload } from "@/hooks/quotes/quoteHelpers";
import { logger } from "@/lib/logger";

/**
 * Normaliza uma linha crua de `quote_items` (colunas nulas no banco) para o
 * tipo de domínio `QuoteItem` (campos opcionais, sem `null`). Extraído de
 * `QuoteService.getById` só para manter a complexidade ciclomática do método
 * sob o limite do lint — a lógica em si é reta, sem ramificação real.
 */
function mapDbQuoteItemRow(
  item: Record<string, unknown> & { id: string; product_id: string | null },
  allPersonalizations: Array<Record<string, unknown>>,
): QuoteItem {
  return {
    ...item,
    product_id: item.product_id ?? "",
    notes: (item.notes as string | null | undefined) ?? undefined,
    sort_order: (item.sort_order as number | null | undefined) ?? undefined,
    color_hex: (item.color_hex as string | null | undefined) ?? undefined,
    color_name: (item.color_name as string | null | undefined) ?? undefined,
    product_image_url: (item.product_image_url as string | null | undefined) ?? undefined,
    product_sku: (item.product_sku as string | null | undefined) ?? undefined,
    subtotal: (item.subtotal as number | null | undefined) ?? undefined,
    unit_cost: (item.unit_cost as number | null | undefined) ?? undefined,
    personalizations: allPersonalizations.filter(
      (p) => p.quote_item_id === item.id,
    ) as unknown as QuoteItemPersonalization[],
  } as QuoteItem;
}

/**
 * Traduz uma linha de `orders` (colunas nulas no banco) pros campos de
 * cliente/entrega de `Partial<Quote>` (opcionais, sem `null`). Extraído de
 * `QuoteService.reorderFromOrder` só para manter a complexidade ciclomática
 * do método sob o limite do lint.
 */
function mapOrderToQuoteFields(order: {
  client_id: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_company: string | null;
  payment_terms: string | null;
  delivery_time: string | null;
  shipping_type: string | null;
  order_number: string;
}): Partial<Quote> {
  return {
    client_id: order.client_id ?? undefined,
    client_name: order.client_name ?? undefined,
    client_email: order.client_email ?? undefined,
    client_phone: order.client_phone ?? undefined,
    client_company: order.client_company ?? undefined,
    payment_terms: order.payment_terms ?? undefined,
    delivery_time: order.delivery_time ?? undefined,
    shipping_type: order.shipping_type ?? undefined,
    notes: `Recompra do pedido #${order.order_number}.`,
    status: 'draft',
  };
}

/** Mesma ideia acima, para uma linha de `order_items` virar `QuoteItem`. */
function mapOrderItemToQuoteItem(item: {
  product_id: string | null;
  product_sku: string | null;
  product_name: string | null;
  product_image_url: string | null;
  quantity: number | null;
  unit_price: number | null;
}): QuoteItem {
  return {
    product_id: item.product_id ?? "",
    product_sku: item.product_sku ?? undefined,
    product_name: item.product_name ?? "",
    product_image_url: item.product_image_url ?? undefined,
    quantity: item.quantity ?? 0,
    unit_price: item.unit_price ?? 0,
    personalizations: [],
  };
}

export class QuoteService {
  static async list(params: { userId: string, scope: SalesScope, orgId: string | null }): Promise<Quote[]> {
    let q = supabase.from("quotes").select("*").order("created_at", { ascending: false }).limit(500);
    q = applySellerScope(q, { scope: params.scope, userId: params.userId });
    
    try {
      const { data, error } = await q;
      if (error) {
        logger.error("Error listing quotes:", error);
        throw error;
      }
      return (data || []) as Quote[];
    } catch (err) {
      logger.error("Unexpected error in QuoteService.list:", err);
      throw err;
    }
  }

  static async getById(quoteId: string): Promise<Quote | null> {
    if (!quoteId) return null;
    try {
      const { data: quoteData, error: qErr } = await supabase.from("quotes").select("*").eq("id", quoteId).maybeSingle();
      if (qErr) {
        logger.error("Error fetching quote:", qErr);
        throw qErr;
      }
      if (!quoteData) return null;

      const { data: itemsData, error: iErr } = await supabase.from("quote_items").select("*").eq("quote_id", quoteId).order("sort_order", { ascending: true });
      if (iErr) {
        logger.error("Error fetching quote items:", iErr);
        throw iErr;
      }
      
      const itemIds = (itemsData || []).map((i) => i.id);
      let allPersonalizations: Array<Record<string, unknown>> = [];
      if (itemIds.length > 0) {
        const { data: persData, error: pErr } = await supabase.from("quote_item_personalizations").select("*").in("quote_item_id", itemIds);
        if (pErr) {
          logger.error("Error fetching quote personalizations:", pErr);
          throw pErr;
        }
        allPersonalizations = (persData || []) as Array<Record<string, unknown>>;
      }

      const items: QuoteItem[] = (itemsData || []).map((item) => mapDbQuoteItemRow(item, allPersonalizations));

      return { ...quoteData, items } as Quote;
    } catch (err) {
      logger.error("Unexpected error in QuoteService.getById:", err);
      throw err;
    }
  }

  static async create(params: { quote: Partial<Quote>, items: QuoteItem[], userId: string, orgId: string | null }): Promise<Quote> {
    try {
      const totals = calculateQuoteTotals(params.quote, params.items, params.quote.negotiation_markup_percent, params.quote.discount_percent ? 'percent' : 'amount', params.quote.discount_percent || params.quote.discount_amount || 0);
      const insertPayload = buildInsertPayload(params.quote, params.userId, params.orgId, totals);
      
      const { data: inserted, error: insErr } = await supabase.from("quotes").insert(insertPayload).select("*").single();
      if (insErr) {
        logger.error("Error creating quote:", insErr);
        throw insErr;
      }

      if (params.items.length > 0) {
        await this.insertItemsWithPersonalizations(params.items, inserted.id);
      }

      return inserted as Quote;
    } catch (err) {
      logger.error("Unexpected error in QuoteService.create:", err);
      throw err;
    }
  }

  static async update(params: { 
    quoteId: string, 
    quote: Partial<Quote>, 
    items: QuoteItem[],
    userId: string 
  }): Promise<Quote> {
    try {
      const oldQuote = await this.getById(params.quoteId);
      if (!oldQuote) throw new Error("Orçamento não encontrado para atualização");

      const totals = calculateQuoteTotals(params.quote, params.items, params.quote.negotiation_markup_percent, params.quote.discount_percent ? 'percent' : 'amount', params.quote.discount_percent || params.quote.discount_amount || 0);
      const updatePayload = buildUpdatePayload({ ...params.quote, row_version: oldQuote.row_version }, totals);
      
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
        logger.error("Error updating quote:", updErr);
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

      return updated as Quote;
    } catch (err) {
      logger.error("Unexpected error in QuoteService.update:", err);
      throw err;
    }
  }

  static async delete(quoteId: string) {
    const { error } = await supabase.from("quotes").delete().eq("id", quoteId);
    if (error) throw error;
  }

  static async reorder(quoteId: string, userId: string, orgId: string | null): Promise<Quote> {
    const original = await this.getById(quoteId);
    if (!original) throw new Error("Orçamento original não encontrado");

    // Clean sensitive/metadata for the new quote
    // (converted_at nunca existiu na tabela quotes nem no tipo Quote —
    //  removido daqui; ver docs/correcoes-validacao-2026-09-13.md)
    const {
      id, created_at, updated_at, quote_number, status,
      total, subtotal, discount_amount,
      ...cleanQuote
    } = original;
    
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

    const newQuote = mapOrderToQuoteFields(order);
    const quoteItems: QuoteItem[] = (items || []).map(mapOrderItemToQuoteItem);

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
    if (itemsErr) {
      logger.error("Error inserting quote items:", itemsErr);
      throw itemsErr;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const insertedItem = insertedItems?.[i];
      if (item && item.personalizations?.length && insertedItem) {
        const persPayload = buildPersonalizationsInsertPayload(item.personalizations, insertedItem.id);
        const { error: pErr } = await supabase.from("quote_item_personalizations").insert(persPayload);
        if (pErr) {
          logger.error("Error inserting personalizations for item:", insertedItem.id, pErr);
          throw pErr;
        }
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
    metadata?: Record<string, unknown>;
  }) {
    // Captura IP e UA do lado do cliente se não for fornecido. Anotação
    // explícita de tipo evita que o spread de Record<string, unknown> logo
    // abaixo confunda a inferência dos campos ip/user_agent (o TS chega a
    // inferir `{}` pra eles sem a anotação — quirk de spread + index
    // signature).
    const clientMetadata: Record<string, unknown> = {
      ip: params.metadata?.ip ?? 'client',
      user_agent: params.metadata?.user_agent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'),
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
      metadata: clientMetadata as Json,
    });
  }

  static async listToConsolidate(singularId: string) {
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("singular_id", singularId)
      .eq("status", "approved_singular")
      .is("consolidation_id", null);
    if (error) throw error;
    return data;
  }

  static async consolidate(params: { singularId: string | null, quoteIds: string[], notes: string }) {
    if (!params.singularId) throw new Error("Singular não identificada para a consolidação.");
    const { data, error } = await supabase.rpc("consolidate_sicoob_quotes", {
      p_singular_id: params.singularId,
      p_quote_ids: params.quoteIds,
      p_notes: params.notes || null,
    });
    if (error) throw error;
    return data;
  }
}
