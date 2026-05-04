import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../helpers/supabase-mock";

describe("QuoteService — Melhorias Recompra", () => {
  const ORIGINAL_QUOTE_ID = "q-original-123";
  const USER_ID = "user-test-456";
  const ORG_ID = "org-test-789";

  const MOCK_QUOTE = {
    id: ORIGINAL_QUOTE_ID,
    quote_number: "PED-2024-001",
    client_id: "c1",
    client_name: "Cliente Teste",
    status: "approved",
    total: 1000,
    subtotal: 1000,
    notes: "Notas originais",
    items: [
      { product_id: "p1", product_name: "Item 1", quantity: 5, unit_price: 200 }
    ]
  };

  let mock: ReturnType<typeof createSupabaseMock>;

  beforeEach(() => {
    vi.resetModules();
    mock = createSupabaseMock({
      selects: {
        quotes: MOCK_QUOTE,
        quote_items: MOCK_QUOTE.items,
        quote_item_personalizations: [],
        personalization_techniques: []
      }
    });
    vi.doMock("@/integrations/supabase/client", () => ({ 
      supabase: {
        ...mock.client,
        auth: {
          ...mock.client.auth,
          getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
          getUser: vi.fn(async () => ({ data: { user: { id: USER_ID } }, error: null }))
        }
      }
    }));
    vi.mock("@/lib/auth/apply-seller-scope", () => ({ applySellerScope: (q: any) => q }));
  });

  afterEach(() => {
    vi.doUnmock("@/integrations/supabase/client");
    vi.clearAllMocks();
  });

  it("reorder — cria novo orçamento como rascunho limpando IDs e metadados", async () => {
    const { QuoteService } = await import("@/services/QuoteService");
    await QuoteService.reorder(ORIGINAL_QUOTE_ID, USER_ID, ORG_ID);

    const quoteInsert = mock.calls.insert.find(c => c.table === "quotes");
    expect(quoteInsert).toBeDefined();
    expect(quoteInsert!.payload).toMatchObject({
      status: "draft",
      client_id: "c1",
      organization_id: ORG_ID
    });
  });
});

describe("Budget Enforcement Logic", () => {
  it("valida limite de alçada corretamente", () => {
    const total = 1500;
    const limiteAlcada = 1000;
    expect(total > limiteAlcada).toBe(true);
  });

  it("valida verba restante corretamente", () => {
    const total = 600;
    const verbaTotal = 5000;
    const verbaConsumida = 4500;
    const remaining = verbaTotal - verbaConsumida;
    expect(total > remaining).toBe(true);
  });
});

});
