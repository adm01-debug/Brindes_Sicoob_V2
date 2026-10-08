/**
 * webhook-events-payload-samples — Onda 13 #9
 * Payloads de exemplo para o playground de webhook outbound.
 * Reflete a forma do `data` enviado pelo dispatcher para cada evento do catálogo.
 */
import { ALL_KNOWN_EVENTS } from "./webhook-events-catalog";

type SamplePayload = Record<string, unknown>;

const isoNow = () => new Date().toISOString();
const QUOTE_ID = "9b0f3e4a-1c2d-4e5f-9a8b-1234567890ab";
const QUOTE_NUMBER = "ORC-25-0001";
const SELLER_ID = "11111111-1111-1111-1111-111111111111";
const CLIENT_EMAIL = "compras@exemplo.com.br";
const ORDER_ID = "22222222-2222-2222-2222-222222222222";
const ORDER_NUMBER = "PED-25-0001";
const APPROVER_ID = "33333333-3333-3333-3333-333333333333";
const DISCOUNT_REQUEST_ID = "44444444-4444-4444-4444-444444444444";
const KIT_ID = "55555555-5555-5555-5555-555555555555";

const SAMPLES: Record<string, SamplePayload> = {
  // Quotes
  "quote.created": {
    quote_id: QUOTE_ID,
    quote_number: QUOTE_NUMBER,
    seller_id: SELLER_ID,
    client: { name: "Empresa Exemplo Ltda", email: CLIENT_EMAIL, company: "Exemplo SA" },
    subtotal: 12500.0,
    discount: 500.0,
    total: 12000.0,
    items_count: 3,
    created_at: isoNow(),
  },
  "quote.updated": {
    quote_id: QUOTE_ID,
    quote_number: QUOTE_NUMBER,
    changed_fields: ["items", "total"],
    new_total: 13200.0,
    updated_at: isoNow(),
  },
  "quote.sent": {
    quote_id: QUOTE_ID,
    quote_number: QUOTE_NUMBER,
    public_url: "https://promogifts.com.br/orcamento/abc123",
    sent_to: CLIENT_EMAIL,
    sent_at: isoNow(),
  },
  "quote.approved": {
    quote_id: QUOTE_ID,
    quote_number: QUOTE_NUMBER,
    approved_by: CLIENT_EMAIL,
    signature: { cpf_cnpj: "12.345.678/0001-99", ip: "200.100.50.25", user_agent: "Mozilla/5.0", hash: "sha256:abcdef…" },
    approved_at: isoNow(),
  },
  "quote.rejected": {
    quote_id: QUOTE_ID,
    quote_number: QUOTE_NUMBER,
    reason: "Preço acima do orçamento",
    rejected_at: isoNow(),
  },
  "quote.expired": {
    quote_id: QUOTE_ID,
    quote_number: QUOTE_NUMBER,
    expired_at: isoNow(),
  },
  // Orders
  "order.created": {
    order_id: ORDER_ID,
    order_number: ORDER_NUMBER,
    quote_id: QUOTE_ID,
    total: 12000.0,
    seller_id: SELLER_ID,
    created_at: isoNow(),
  },
  "order.approved": {
    order_id: ORDER_ID,
    order_number: ORDER_NUMBER,
    approved_by: APPROVER_ID,
    approved_at: isoNow(),
  },
  "order.fulfilled": {
    order_id: ORDER_ID,
    order_number: ORDER_NUMBER,
    tracking_number: "BR123456789",
    fulfilled_at: isoNow(),
  },
  "order.cancelled": {
    order_id: ORDER_ID,
    order_number: ORDER_NUMBER,
    reason: "Solicitação do cliente",
    cancelled_at: isoNow(),
  },
  // Discounts
  "discount.requested": {
    request_id: DISCOUNT_REQUEST_ID,
    quote_id: QUOTE_ID,
    seller_id: SELLER_ID,
    requested_percent: 18.5,
    max_allowed_percent: 12.0,
    requested_at: isoNow(),
  },
  "discount.approved": {
    request_id: DISCOUNT_REQUEST_ID,
    quote_id: QUOTE_ID,
    admin_id: APPROVER_ID,
    approved_percent: 18.5,
    notes: "Cliente recorrente",
    approved_at: isoNow(),
  },
  "discount.rejected": {
    request_id: DISCOUNT_REQUEST_ID,
    quote_id: QUOTE_ID,
    admin_id: APPROVER_ID,
    notes: "Margem insuficiente",
    rejected_at: isoNow(),
  },
  // Kits
  "kit.created": {
    kit_id: KIT_ID,
    name: "Kit Boas-Vindas Premium",
    items_count: 4,
    total_price: 350.0,
    created_at: isoNow(),
  },
  "kit.shared": {
    kit_id: KIT_ID,
    share_token: "abc123def456",
    public_url: "https://promogifts.com.br/kit/abc123def456",
    client_email: "rh@exemplo.com.br",
    shared_at: isoNow(),
  },
  "kit.viewed": {
    kit_id: KIT_ID,
    share_token: "abc123def456",
    viewed_at: isoNow(),
    viewer_ip: "200.100.50.25",
  },
};

export function getEventSamplePayload(eventKey: string): SamplePayload {
  return (
    SAMPLES[eventKey] ?? {
      _note: "Evento sem payload de exemplo. O dispatcher entregará o `data` fornecido pelo trigger original.",
      event: eventKey,
      timestamp: isoNow(),
    }
  );
}

export function listSampledEvents(): string[] {
  return ALL_KNOWN_EVENTS.filter((e) => e in SAMPLES);
}
