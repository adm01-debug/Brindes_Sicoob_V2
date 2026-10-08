/**
 * quoteHelpers — Cálculos e payloads reutilizáveis de orçamentos
 */
import type { Json, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { Quote, QuoteItem } from "./quoteTypes";

const emptyToNull = (value: string | null | undefined): string | null => value || null;
const numberOr = (value: number | null | undefined, fallback: number): number => value ?? fallback;
const nullableNumber = (value: number | null | undefined): number | null => value ?? null;
const arrayOrEmpty = <T>(value: T[] | null | undefined): T[] => value ?? [];
const quoteItemUnitCost = (item: QuoteItem): number => item.unit_cost || item.unit_price * 0.7;

function personalizationTotal(item: QuoteItem): number {
  return arrayOrEmpty(item.personalizations).reduce((sum, personalization) => sum + numberOr(personalization.total_cost, 0), 0);
}

function personalizationCost(item: QuoteItem): number {
  return arrayOrEmpty(item.personalizations).reduce((sum, personalization) => {
    const quantity = numberOr(personalization.personalized_quantity, item.quantity);
    return sum + numberOr(personalization.unit_cost, 0) * quantity + numberOr(personalization.setup_cost, 0);
  }, 0);
}

function clampNegotiationMarkup(quote: Partial<Quote>, requested?: number): number {
  return Math.min(50, Math.max(0, requested ?? quote.negotiation_markup_percent ?? 0));
}

function presentedSubtotal(realSubtotal: number, markup: number): number {
  return markup > 0 ? Math.round(realSubtotal * (1 + markup / 100) * 100) / 100 : realSubtotal;
}

function discountAmountFor(subtotal: number, discountType: 'percent' | 'amount', discountValue: number): number {
  return discountType === 'percent' ? subtotal * (discountValue / 100) : discountValue;
}

function quoteShippingCost(quote: Partial<Quote>): number {
  return quote.shipping_type === "fob" || quote.shipping_type === "fob_pre" ? numberOr(quote.shipping_cost, 0) : 0;
}

export function calculateQuoteTotals(
  quote: Partial<Quote>,
  ...options: [items: QuoteItem[], negotiationMarkup?: number, discountType?: 'percent' | 'amount', discountValue?: number]
) {
  const [items, negotiationMarkup, discountType = 'percent', discountValue = 0] = options;
  // Subtotal real = soma direta dos itens + personalizações (sem markup)
  const realSubtotal = items.reduce((sum, item) => {
    const baseTotal = item.quantity * item.unit_price;
    return sum + baseTotal + personalizationTotal(item);
  }, 0);

  // Custo total = soma do custo dos produtos + custo das personalizações
  const totalCost = items.reduce((sum, item) => {
    const productCost = quoteItemUnitCost(item) * item.quantity;
    return sum + productCost + personalizationCost(item);
  }, 0);

  // Margem de negociação (clamp 0–50)
  const markup = clampNegotiationMarkup(quote, negotiationMarkup);

  // Subtotal apresentado = subtotal real * (1 + markup/100)
  const subtotal = presentedSubtotal(realSubtotal, markup);

  // Custo REAL (usado para calcular margem bruta correta)
  const realTotalCost = totalCost;

  // Desconto APARENTE aplicado sobre subtotal apresentado
  const discountAmount = discountAmountFor(subtotal, discountType, discountValue);
  const shippingCostValue = quoteShippingCost(quote);
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
    client_id: emptyToNull(quote.client_id),
    client_name: emptyToNull(quote.client_name),
    client_email: emptyToNull(quote.client_email),
    client_phone: emptyToNull(quote.client_phone),
    client_company: emptyToNull(quote.client_company),
    seller_id: userId,
    organization_id: orgId,
    status: quote.status ?? "draft",
    subtotal: totals.subtotal,
    discount_percent: numberOr(quote.discount_percent, 0),
    discount_amount: totals.discountAmount,
    total: totals.total,
    total_cost: totals.totalCost,
    negotiation_markup_percent: numberOr(quote.negotiation_markup_percent, 0),
    payment_terms: emptyToNull(quote.payment_terms),
    delivery_time: emptyToNull(quote.delivery_time),
    shipping_type: emptyToNull(quote.shipping_type),
    shipping_cost: numberOr(quote.shipping_cost, 0),
    notes: emptyToNull(quote.notes),
    internal_notes: emptyToNull(quote.internal_notes),
    valid_until: emptyToNull(quote.valid_until),
  };
}

export function buildUpdatePayload(
  quote: Partial<Quote>,
  totals: { subtotal: number; discountAmount: number; total: number; totalCost: number }
): TablesUpdate<"quotes"> {
  const payload: TablesUpdate<"quotes"> = {
    client_id: emptyToNull(quote.client_id),
    client_name: emptyToNull(quote.client_name),
    client_email: emptyToNull(quote.client_email),
    client_phone: emptyToNull(quote.client_phone),
    client_company: emptyToNull(quote.client_company),
    status: quote.status,
    subtotal: totals.subtotal,
    discount_percent: numberOr(quote.discount_percent, 0),
    discount_amount: totals.discountAmount,
    total: totals.total,
    total_cost: totals.totalCost,
    negotiation_markup_percent: numberOr(quote.negotiation_markup_percent, 0),
    payment_terms: emptyToNull(quote.payment_terms),
    delivery_time: emptyToNull(quote.delivery_time),
    shipping_type: emptyToNull(quote.shipping_type),
    shipping_cost: numberOr(quote.shipping_cost, 0),
    notes: emptyToNull(quote.notes),
    internal_notes: emptyToNull(quote.internal_notes),
    valid_until: emptyToNull(quote.valid_until),
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
    const itemSubtotal = item.quantity * item.unit_price + personalizationTotal(item);
    return {
      quote_id: quoteId,
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: emptyToNull(item.product_sku),
      product_image_url: emptyToNull(item.product_image_url),
      quantity: item.quantity,
      unit_price: item.unit_price,
      unit_cost: numberOr(item.unit_cost, 0),
      color_name: emptyToNull(item.color_name),
      color_hex: emptyToNull(item.color_hex),
      size_code: emptyToNull(item.size_code),
      gender: emptyToNull(item.gender),
      notes: emptyToNull(item.notes),
      sort_order: index,
      kit_group_id: emptyToNull(item.kit_group_id),
      kit_name: emptyToNull(item.kit_name),
      source_variant_id: emptyToNull(item.source_variant_id),
      source_variant_sku: emptyToNull(item.source_variant_sku),
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

// Ids locais de UI (ex.: "item-2" do drag-and-drop) não são uuids do banco;
// só um uuid real pode identificar a linha a preservar na RPC.
const ITEM_ID_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Monta o documento recebido pela RPC transacional. Itens carregados do banco
 * enviam `id` para preservar a linha; itens novos vão sem `id` e nascem no banco.
 * Vínculo ao orçamento, ordem e totais derivados são definidos novamente lá.
 */
export function buildAtomicQuoteItems(items: QuoteItem[]): Json[] {
  return items.map((item) => ({
    ...(item.id && ITEM_ID_UUID_RE.test(item.id) ? { id: item.id } : {}),
    product_id: emptyToNull(item.product_id),
    product_name: item.product_name,
    product_sku: emptyToNull(item.product_sku),
    product_image_url: emptyToNull(item.product_image_url),
    quantity: item.quantity,
    unit_price: item.unit_price,
    unit_cost: quoteItemUnitCost(item),
    color_name: emptyToNull(item.color_name),
    color_hex: emptyToNull(item.color_hex),
    size_code: emptyToNull(item.size_code),
    gender: emptyToNull(item.gender),
    notes: emptyToNull(item.notes),
    kit_group_id: emptyToNull(item.kit_group_id),
    kit_name: emptyToNull(item.kit_name),
    source_variant_id: emptyToNull(item.source_variant_id),
    source_variant_sku: emptyToNull(item.source_variant_sku),
    price_confirmed_at: emptyToNull(item.price_confirmed_at),
    personalizations: arrayOrEmpty(item.personalizations).map((personalization) => ({
      technique_id: emptyToNull(personalization.technique_id),
      technique_name: emptyToNull(personalization.technique_name),
      colors_count: numberOr(personalization.colors_count, 1),
      positions_count: numberOr(personalization.positions_count, 1),
      area_cm2: nullableNumber(personalization.area_cm2),
      width_cm: nullableNumber(personalization.width_cm),
      height_cm: nullableNumber(personalization.height_cm),
      personalized_quantity: nullableNumber(personalization.personalized_quantity),
      setup_cost: numberOr(personalization.setup_cost, 0),
      unit_cost: numberOr(personalization.unit_cost, 0),
      total_cost: numberOr(personalization.total_cost, 0),
      notes: emptyToNull(personalization.notes),
    })),
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
