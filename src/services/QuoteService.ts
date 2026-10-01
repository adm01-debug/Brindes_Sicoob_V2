import { supabase } from "@/integrations/supabase/client";
import { applySellerScope } from "@/lib/auth/apply-seller-scope";
import type { SalesScope } from "@/lib/auth/visibility-scope";
import type { Json } from "@/integrations/supabase/types";
import type { Quote, QuoteItem, QuoteItemPersonalization } from "@/hooks/quotes/quoteTypes";
import { calculateQuoteTotals, buildInsertPayload, buildUpdatePayload, buildAtomicQuoteItems } from "@/hooks/quotes/quoteHelpers";
import { logger } from "@/lib/logger";
import { beginReorderIntent, completeReorderIntent } from "@/services/sicoob/reorderIdempotency";

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

function describeQuoteHeaderChanges(oldQuote: Quote, newQuote: Partial<Quote>): string[] {
  const changes: string[] = [];
  if (newQuote.discount_percent !== undefined && newQuote.discount_percent !== oldQuote.discount_percent) {
    changes.push(`Desconto alterado de ${oldQuote.discount_percent}% para ${newQuote.discount_percent}%`);
  }
  if (newQuote.negotiation_markup_percent !== undefined
      && newQuote.negotiation_markup_percent !== oldQuote.negotiation_markup_percent) {
    changes.push(`Markup alterado de ${oldQuote.negotiation_markup_percent}% para ${newQuote.negotiation_markup_percent}%`);
  }

  return changes;
}

const sameQuoteItem = (left: QuoteItem, right: QuoteItem): boolean =>
  left.product_id === right.product_id && left.color_name === right.color_name;

function describeQuoteItemChanges(oldItems: QuoteItem[], newItems: QuoteItem[]): string[] {
  const changes: string[] = [];
  for (const oldItem of oldItems) {
    const stillExists = newItems.some((item) => sameQuoteItem(item, oldItem));
    if (!stillExists) changes.push(`Item removido: ${oldItem.product_name}`);
  }
  for (const newItem of newItems) {
    const oldItem = oldItems.find((item) => sameQuoteItem(item, newItem));
    if (!oldItem) {
      changes.push(`Item adicionado: ${newItem.product_name} (${newItem.quantity}x)`);
      continue;
    }
    if (newItem.quantity !== oldItem.quantity) {
      changes.push(`Quantidade de ${newItem.product_name} alterada: ${oldItem.quantity} -> ${newItem.quantity}`);
    }
    if (newItem.unit_price !== oldItem.unit_price) {
      changes.push(`Preço unitário de ${newItem.product_name} alterado: R$${oldItem.unit_price} -> R$${newItem.unit_price}`);
    }
  }
  return changes;
}

function describeQuoteChanges(oldQuote: Quote, newQuote: Partial<Quote>, newItems: QuoteItem[]): string[] {
  return [
    ...describeQuoteHeaderChanges(oldQuote, newQuote),
    ...describeQuoteItemChanges(oldQuote.items || [], newItems),
  ];
}

function calculateDocumentTotals(quote: Partial<Quote>, items: QuoteItem[]) {
  const discountType = quote.discount_percent ? 'percent' : 'amount';
  const discountValue = quote.discount_percent || quote.discount_amount || 0;
  return calculateQuoteTotals(quote, items, quote.negotiation_markup_percent, discountType, discountValue);
}

function quoteHistoryOrDefault(changes: string[]): Json {
  return changes.length > 0 ? changes : ['Orçamento atualizado'];
}

function assertAtomicQuoteResult(data: Json | null, message: string): Quote {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(message);
  return data as unknown as Quote;
}

function throwQuoteSaveError(error: { code?: string; message?: string } | null, context: string): void {
  if (!error) return;
  if (error.code === '40001') {
    throw new Error("Concorrência detectada: Este orçamento foi modificado por outro usuário. Por favor, recarregue a página.");
  }
  logger.error(context, error);
  throw error;
}

export class QuoteService {
  static async list(params: { userId: string, scope: SalesScope, orgId: string | null }): Promise<Quote[]> {
    // rls-allow: scope self aplicado no builder seguinte; demais papéis dependem de RLS
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
      // rls-allow: lookup por id; RLS valida ownership e organização
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

  static async create(params: { quote: Partial<Quote>, items: QuoteItem[], userId: string, orgId: string | null, idempotencyKey: string }): Promise<Quote> {
    try {
      const totals = calculateDocumentTotals(params.quote, params.items);
      const insertPayload = buildInsertPayload(params.quote, params.userId, params.orgId, totals);
      const { data: inserted, error: insErr } = await supabase.rpc('save_quote_atomic_idempotent', {
        p_quote: insertPayload as Json,
        p_items: buildAtomicQuoteItems(params.items),
        p_history: ['Orçamento criado'] as Json,
        p_idempotency_key: params.idempotencyKey,
      });
      throwQuoteSaveError(insErr, "Error creating quote:");
      return assertAtomicQuoteResult(inserted, 'O banco não retornou o orçamento criado.');
    } catch (err) {
      logger.error("Unexpected error in QuoteService.create:", err);
      throw err;
    }
  }

  static async update(params: { 
    quoteId: string, 
    quote: Partial<Quote>, 
    items: QuoteItem[],
    userId: string,
    expectedRowVersion: number,
  }): Promise<Quote> {
    try {
      const oldQuote = await this.getById(params.quoteId);
      if (!oldQuote) throw new Error("Orçamento não encontrado para atualização");

      if (!Number.isInteger(params.expectedRowVersion) || params.expectedRowVersion < 1) {
        throw new Error("A versão do orçamento não está disponível. Recarregue a página antes de salvar.");
      }

      const totals = calculateDocumentTotals(params.quote, params.items);
      const updatePayload = buildUpdatePayload({ ...params.quote, row_version: params.expectedRowVersion }, totals);
      const changes = describeQuoteChanges(oldQuote, params.quote, params.items);
      const { data: updated, error: updErr } = await supabase.rpc('save_quote_atomic', {
        p_quote: updatePayload as Json,
        p_items: buildAtomicQuoteItems(params.items),
        p_quote_id: params.quoteId,
        // A versão precisa ser aquela carregada pelo editor, nunca a de uma
        // leitura feita no instante do salvamento. Caso outro usuário tenha
        // gravado antes, a RPC recusa a atualização em vez de sobrescrever.
        p_expected_row_version: params.expectedRowVersion,
        p_history: quoteHistoryOrDefault(changes),
      });

      throwQuoteSaveError(updErr, "Error updating quote:");
      return assertAtomicQuoteResult(updated, 'O banco não retornou o orçamento atualizado.');
    } catch (err) {
      logger.error("Unexpected error in QuoteService.update:", err);
      throw err;
    }
  }

  static async delete(quoteId: string) {
    // rls-allow: exclusão por id; RLS valida ownership e organização
    const { error } = await supabase.from("quotes").delete().eq("id", quoteId);
    if (error) throw error;
  }

  static async reorder(quoteId: string, userId: string, orgId: string | null): Promise<Quote> {
    void userId;
    void orgId;
    const intent = `quote:${quoteId}`;
    const { idempotencyKey, managed } = beginReorderIntent(intent);
    const { data, error } = await supabase.functions.invoke('sicoob-reorder', {
      body: { sourceQuoteId: quoteId, idempotencyKey },
    });
    if (error) {
      if (typeof data?.error === 'string') throw new Error(data.error);
      throw error;
    }
    if (typeof data?.quoteId !== 'string') {
      throw new Error('A recompra não retornou o novo orçamento.');
    }
    const reordered = await this.getById(data.quoteId);
    if (!reordered) throw new Error('O orçamento de recompra não ficou acessível após a criação.');
    completeReorderIntent(intent, idempotencyKey, managed);
    return reordered;
  }

  static async reorderFromOrder(orderId: string, userId: string, orgId: string | null): Promise<Quote> {
    void userId;
    void orgId;
    const intent = `order:${orderId}`;
    const { idempotencyKey, managed } = beginReorderIntent(intent);
    const { data, error } = await supabase.functions.invoke('sicoob-reorder', {
      body: { orderId, idempotencyKey },
    });
    if (error) {
      if (typeof data?.error === 'string') throw new Error(data.error);
      throw error;
    }
    if (typeof data?.quoteId !== 'string') {
      throw new Error('A recompra não retornou o novo orçamento.');
    }
    const reordered = await this.getById(data.quoteId);
    if (!reordered) throw new Error('O orçamento de recompra não ficou acessível após a criação.');
    completeReorderIntent(intent, idempotencyKey, managed);
    return reordered;
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

    const { error } = await supabase.rpc("append_quote_history_note", {
      p_quote_id: params.quoteId,
      p_action: params.action,
      p_description: params.description,
      p_field_changed: params.fieldChanged || null,
      p_old_value: params.oldValue || null,
      p_new_value: params.newValue || null,
      p_metadata: clientMetadata as Json,
    });
    if (error) {
      logger.error("Erro ao registrar histórico do orçamento:", error);
      throw error;
    }
  }

  static async listToConsolidate(singularId: string) {
    const { data, error } = await supabase
      // rls-allow: consolidação filtra singular; RLS valida a hierarquia do ator
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
