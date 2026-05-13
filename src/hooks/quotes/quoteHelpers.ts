/**
 * quoteHelpers — Cálculos e payloads reutilizáveis de orçamentos
 */
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { Quote, QuoteItem } from "./quoteTypes";

export function calculateQuoteTotals(quote: Partial<Quote>, items: QuoteItem[], negotiationMarkup?: number, discountType: 'percent' | 'amount' = 'percent', discountValue: number = 0) {
  // Subtotal real = soma direta dos itens + personalizações (sem markup)
  const realSubtotal = items.reduce((sum, item) => {
    const baseTotal = item.quantity * item.unit_price;
    const persTotal = (item.personalizations || []).reduce((pSum, p) => pSum + (p.total_cost || 0), 0);
    return sum + baseTotal + persTotal;
  }, 0);

  // Custo total = soma do custo dos produtos + custo das personalizações
  const totalCost = items.reduce((sum, item) => {
    const productCost = (item.unit_cost || item.unit_price * 0.7) * item.quantity;
    const persCost = (item.personalizations || []).reduce((pSum, p) => {
      const uCost = p.unit_cost || 0;
      const sCost = p.setup_cost || 0;
      const qty = p.personalized_quantity || item.quantity;
      return pSum + (uCost * qty) + sCost;
    }, 0);
    return sum + productCost + persCost;
  }, 0);

  // Margem de negociação (clamp 0–50)
  const markup = Math.min(50, Math.max(0, (negotiationMarkup ?? quote.negotiation_markup_percent) || 0));

  // Subtotal apresentado = subtotal real * (1 + markup/100)
  const subtotal = markup > 0
    ? Math.round(realSubtotal * (1 + markup / 100) * 100) / 100
    : realSubtotal;

  // Custo REAL (usado para calcular margem bruta correta)
  const realTotalCost = totalCost;

  // Desconto APARENTE aplicado sobre subtotal apresentado
  const discountAmount = (discountType === 'percent' || (discountValue > 0 && !discountType))
    ? subtotal * (discountValue / 100)
    : discountValue;
  const shippingCostValue = (quote.shipping_type === "fob" || quote.shipping_type === "fob_pre")
    ? (quote.shipping_cost || 0) : 0;
  const total = subtotal - discountAmount + shippingCostValue;

  // Desconto REAL: comparado ao subtotal real (usado para alçada)
  const finalBeforeShipping = subtotal - discountAmount;
  const realDiscountPercent = realSubtotal > 0
    ? Math.round(((realSubtotal - finalBeforeShipping) / realSubtotal) * 10000) / 100
    : 0;

  return { subtotal, realSubtotal, discountAmount, total, realDiscountPercent, markup, totalCost: realTotalCost };
}

export function buildInsertPayload(
  quote: Partial<Quote>,
  userId: string,
  orgId: string | null,
  totals: { subtotal: number; discountAmount: number; total: number; totalCost: number }
): TablesInsert<"quotes"> {
  return {
    client_id: quote.client_id || null,
    client_name: quote.client_name || null,
    client_email: quote.client_email || null,
    client_phone: quote.client_phone || null,
    client_company: quote.client_company || null,
    seller_id: userId,
    organization_id: orgId,
    status: quote.status || "draft",
    subtotal: totals.subtotal,
    discount_percent: quote.discount_percent || 0,
    discount_amount: totals.discountAmount,
    total: totals.total,
    total_cost: totals.totalCost,
    negotiation_markup_percent: quote.negotiation_markup_percent || 0,
    payment_terms: quote.payment_terms || null,
    delivery_time: quote.delivery_time || null,
    shipping_type: quote.shipping_type || null,
    shipping_cost: quote.shipping_cost || 0,
    notes: quote.notes || null,
    internal_notes: quote.internal_notes || null,
    valid_until: quote.valid_until || null,
  };
}

export function buildUpdatePayload(
  quote: Partial<Quote>,
  totals: { subtotal: number; discountAmount: number; total: number; totalCost: number }
): TablesUpdate<"quotes"> {
  const payload: TablesUpdate<"quotes"> = {
    client_id: quote.client_id || null,
    client_name: quote.client_name || null,
    client_email: quote.client_email || null,
    client_phone: quote.client_phone || null,
    client_company: quote.client_company || null,
    status: quote.status,
    subtotal: totals.subtotal,
    discount_percent: quote.discount_percent || 0,
    discount_amount: totals.discountAmount,
    total: totals.total,
    total_cost: totals.totalCost,
    negotiation_markup_percent: quote.negotiation_markup_percent || 0,
    payment_terms: quote.payment_terms || null,
    delivery_time: quote.delivery_time || null,
    shipping_type: quote.shipping_type || null,
    shipping_cost: quote.shipping_cost || 0,
    notes: quote.notes || null,
    internal_notes: quote.internal_notes || null,
    valid_until: quote.valid_until || null,
    updated_at: new Date().toISOString(),
  };

  if (quote.row_version !== undefined) {
    payload.row_version = quote.row_version + 1;
  }

  return payload;
}

export function buildItemsInsertPayload(
  items: QuoteItem[],
  quoteId: string
): TablesInsert<"quote_items">[] {
  return items.map((item, index) => {
    const itemSubtotal = item.quantity * item.unit_price + (item.personalizations || []).reduce((sum, p) => sum + (p.total_cost || 0), 0);
    return {
      quote_id: quoteId,
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: item.product_sku || null,
      product_image_url: item.product_image_url || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      unit_cost: item.unit_cost || 0,
      color_name: item.color_name || null,
      color_hex: item.color_hex || null,
      size_code: item.size_code || null,
      gender: item.gender || null,
      notes: item.notes || null,
      sort_order: index,
      kit_group_id: item.kit_group_id || null,
      kit_name: item.kit_name || null,
      price_confirmed_at: item.price_confirmed_at ?? null,
      subtotal: itemSubtotal,
      total_price: itemSubtotal,
    };
  });
}

export function buildPersonalizationsInsertPayload(
  personalizations: NonNullable<QuoteItem["personalizations"]>,
  quoteItemId: string
): TablesInsert<"quote_item_personalizations">[] {
  return personalizations.map(p => ({
    quote_item_id: quoteItemId,
    technique_id: p.technique_id || null,
    technique_name: p.technique_name || null,
    colors_count: p.colors_count || 1,
    positions_count: p.positions_count || 1,
    area_cm2: p.area_cm2,
    setup_cost: p.setup_cost || 0,
    unit_cost: p.unit_cost || 0,
    total_cost: p.total_cost || 0,
    notes: p.notes,
  }));
}

export const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho", 
  pending: "Enviado", 
  sent: "Em análise",
  approved: "Aprovado", 
  rejected: "Recusado", 
  expired: "Expirado",
  pending_approval: "Alçada Admin",
  pending_singular_approval: "Pendente Singular",
  approved_singular: "Aprovado Singular",
  rejected_singular: "Reprovado Singular"
};
