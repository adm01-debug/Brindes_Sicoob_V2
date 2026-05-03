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

  static async update(params: { quoteId: string, quote: Partial<Quote>, items: QuoteItem[] }): Promise<Quote> {
    const totals = calculateQuoteTotals(params.quote, params.items);
    const updatePayload = buildUpdatePayload(params.quote, totals);
    
    const { data: updated, error: updErr } = await supabase.from("quotes").update(updatePayload).eq("id", params.quoteId).select("*").single();
    if (updErr) throw updErr;

    await supabase.from("quote_items").delete().eq("quote_id", params.quoteId);
    await this.insertItemsWithPersonalizations(params.items, params.quoteId);

    return updated as unknown as Quote;
  }

  static async delete(quoteId: string) {
    const { error } = await supabase.from("quotes").delete().eq("id", quoteId);
    if (error) throw error;
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
    await supabase.from("quote_history").insert({
      quote_id: params.quoteId,
      user_id: params.userId,
      action: params.action,
      description: params.description,
      field_changed: params.fieldChanged || null,
      old_value: params.oldValue || null,
      new_value: params.newValue || null,
      metadata: params.metadata || {},
    });
  }
}
