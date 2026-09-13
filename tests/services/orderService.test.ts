/**
 * Testes — orderService.convertQuoteToOrder
 *
 * Garantem que a mutação INSERT em `orders` carrega o `seller_id` recebido
 * (não derivado do JWT do banco — defesa em profundidade) e que `order_items`
 * são criados ligados ao pedido recém-criado. Também valida que UPDATE em
 * `quotes` aplica filtro `id = quoteId` (não amplia escopo).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../helpers/supabase-mock";

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

describe("orderService.convertQuoteToOrder — payloads de mutação", () => {
  const QUOTE_ID = "quote-aprovado-1";
  const SELLER_ID = "seller-uuid-42";
  const ORG_ID = "org-uuid-9";

  const APPROVED_QUOTE = {
    id: QUOTE_ID,
    status: "approved",
    organization_id: ORG_ID,
    client_id: "c1",
    client_name: "Acme",
    client_email: "a@a.com",
    client_phone: "11",
    client_company: "Acme SA",
    subtotal: 100,
    discount_amount: 0,
    shipping_cost: 10,
    shipping_type: "express",
    total: 110,
    payment_terms: "30d",
    delivery_time: "5d",
    notes: "n",
    internal_notes: "i",
    items: [
      { product_id: "p1", product_sku: "SKU1", product_name: "Prod 1", product_image_url: null, quantity: 2, unit_price: 50 },
    ],
  };

  let mock: ReturnType<typeof createSupabaseMock>;

  beforeEach(() => {
    vi.resetModules();
    mock = createSupabaseMock({
      selects: {
        quotes: APPROVED_QUOTE,
        orders: null, // nenhum pedido pré-existente para este quote
      },
      insertReturn: (table) =>
        table === "orders"
          ? { id: "new-order-id", order_number: "PED-001", status: "confirmed", total: 110 }
          : { id: `mock-${table}-id` },
    });
    vi.doMock("@/integrations/supabase/client", () => ({ supabase: mock.client }));
  });

  afterEach(() => {
    vi.doUnmock("@/integrations/supabase/client");
    vi.clearAllMocks();
  });

  it("inclui seller_id correto no INSERT em orders", async () => {
    const { OrderService } = await import("@/services/OrderService");
    await OrderService.convertQuoteToOrder({ quoteId: QUOTE_ID, sellerId: SELLER_ID, organizationId: ORG_ID });

    const ordersInsert = mock.calls.insert.find((c) => c.table === "orders");
    expect(ordersInsert).toBeDefined();
    expect(ordersInsert!.payload).toMatchObject({
      seller_id: SELLER_ID,
      organization_id: ORG_ID,
      quote_id: QUOTE_ID,
      status: "confirmed",
    });
    // seller_id NUNCA pode ser undefined/null/string vazia
    const sid = (ordersInsert!.payload as { seller_id: unknown }).seller_id;
    expect(sid).toBe(SELLER_ID);
    expect(typeof sid).toBe("string");
    expect((sid as string).length).toBeGreaterThan(0);
  });

  it("não vaza seller_id alheio quando chamado com sellerId diferente", async () => {
    const OTHER = "seller-outro-99";
    const { OrderService } = await import("@/services/OrderService");
    await OrderService.convertQuoteToOrder({ quoteId: QUOTE_ID, sellerId: OTHER });

    const ordersInsert = mock.calls.insert.find((c) => c.table === "orders");
    expect((ordersInsert!.payload as { seller_id: string }).seller_id).toBe(OTHER);
    expect((ordersInsert!.payload as { seller_id: string }).seller_id).not.toBe(SELLER_ID);
  });

  it("UPDATE em quotes filtra por id (não amplia escopo)", async () => {
    const { OrderService } = await import("@/services/OrderService");
    await OrderService.convertQuoteToOrder({ quoteId: QUOTE_ID, sellerId: SELLER_ID });

    const upd = mock.calls.update.find((c) => c.table === "quotes");
    expect(upd).toBeDefined();
    expect(upd!.payload).toEqual({ status: "converted" });
    expect(upd!.filters).toContainEqual({ column: "id", value: QUOTE_ID });
  });

  it("propaga organization_id do quote para order_items quando override não é passado", async () => {
    const { OrderService } = await import("@/services/OrderService");
    await OrderService.convertQuoteToOrder({ quoteId: QUOTE_ID, sellerId: SELLER_ID });

    const itemsInsert = mock.calls.insert.find((c) => c.table === "order_items");
    expect(itemsInsert).toBeDefined();
    const arr = itemsInsert!.payload as Array<Record<string, unknown>>;
    expect(arr).toHaveLength(1);
    expect(arr[0]).toMatchObject({
      order_id: "new-order-id",
      organization_id: ORG_ID,
      product_id: "p1",
    });
  });

  it("rejeita conversão de quote não aprovado (não dispara INSERT)", async () => {
    mock = createSupabaseMock({
      selects: { quotes: { ...APPROVED_QUOTE, status: "draft" } },
    });
    vi.doUnmock("@/integrations/supabase/client");
    vi.doMock("@/integrations/supabase/client", () => ({ supabase: mock.client }));
    vi.resetModules();

    const { OrderService } = await import("@/services/OrderService");
    await expect(
      OrderService.convertQuoteToOrder({ quoteId: QUOTE_ID, sellerId: SELLER_ID }),
    ).rejects.toThrow(/aprovados/i);

    expect(mock.calls.insert.find((c) => c.table === "orders")).toBeUndefined();
  });
});
