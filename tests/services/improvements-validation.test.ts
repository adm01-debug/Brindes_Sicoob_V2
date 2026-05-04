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
        quote_item_personalizations: []
      }
    });
    vi.doMock("@/integrations/supabase/client", () => ({ supabase: mock.client }));
    vi.mock("@/lib/auth/apply-seller-scope", () => ({ applySellerScope: (q: any) => q }));
  });

  afterEach(() => {
    vi.doUnmock("@/integrations/supabase/client");
    vi.clearAllMocks();
  });

  it("reorder — cria novo orçamento como rascunho limpando IDs e metadados", async () => {
    const { QuoteService } = await import("@/services/QuoteService");
    const newQuote = await QuoteService.reorder(ORIGINAL_QUOTE_ID, USER_ID, ORG_ID);

    const quoteInsert = mock.calls.insert.find(c => c.table === "quotes");
    expect(quoteInsert).toBeDefined();
    expect(quoteInsert!.payload).toMatchObject({
      status: "draft",
      client_id: "c1",
      user_id: USER_ID,
      organization_id: ORG_ID
    });
    // Não deve conter IDs originais ou campos calculados
    expect(quoteInsert!.payload).not.toHaveProperty("id");
    expect(quoteInsert!.payload).not.toHaveProperty("quote_number");
    expect(quoteInsert!.payload).not.toHaveProperty("total");

    // Deve clonar itens
    const itemsInsert = mock.calls.insert.find(c => c.table === "quote_items");
    expect(itemsInsert).toBeDefined();
    expect(itemsInsert!.payload).toHaveLength(1);
    expect((itemsInsert!.payload as any[])[0]).toMatchObject({
      product_id: "p1",
      quantity: 5
    });
  });
});

describe("useQuoteBuilderState — Validação de Verba (PAC)", () => {
  let mock: ReturnType<typeof createSupabaseMock>;

  beforeEach(() => {
    vi.resetModules();
    mock = createSupabaseMock({
      selects: {
        pa_budgets: {
          pa_id: "pa-1",
          verba_total: 5000,
          verba_consumida: 4500,
          limite_alcada: 1000,
          ano: 2026,
          mes: 5
        }
      }
    });
    vi.doMock("@/integrations/supabase/client", () => ({ supabase: mock.client }));
    // Mock Auth for Gerente PA
    vi.mock("@/contexts/AuthContext", () => ({
      useAuth: () => ({ 
        user: { id: "u1", isGerentePa: true }, 
        isGerentePa: true,
        roles: ["gerente_pa"] 
      })
    }));
    vi.mock("@/contexts/OrganizationContext", () => ({ useOrganization: () => ({ currentOrg: { id: "org1" } }) }));
    vi.mock("@/lib/auth/visibility-scope", () => ({ useSalesScope: () => "self" }));
    vi.mock("@/hooks/useSellerDiscountLimits", () => ({ useSellerDiscountLimits: () => ({ myLimit: 10 }) }));
    vi.mock("@/hooks/useDiscountApproval", () => ({ useDiscountApproval: () => ({ requestApproval: vi.fn() }) }));
    vi.mock("@/hooks/quote/useQuoteProductSearch", () => ({ useQuoteProductSearch: () => ({}) }));
    vi.mock("@/hooks/quote/useQuoteInitialization", () => ({ useQuoteInitialization: () => {} }));
    vi.mock("react-router-dom", () => ({
        useNavigate: () => vi.fn(),
        useParams: () => ({}),
        useSearchParams: () => [new URLSearchParams()],
        useLocation: () => ({ pathname: "/" })
    }));
  });

  it("bloqueia salvamento se o pedido exceder o limite de alçada", async () => {
    const { useQuoteBuilderState } = await import("@/hooks/useQuoteBuilderState");
    const { renderHook } = await import("@testing-library/react");
    const { toast } = await import("sonner");
    const toastSpy = vi.spyOn(toast, "error");

    // Manually mocking calculateQuoteTotals for this specific test
    vi.mock("@/utils/quote-calculations", () => ({
      calculateQuoteTotals: () => ({ total: 1500, subtotal: 1500, markup: 0 }),
      formatCurrency: (v: number) => `R$ ${v}`,
      calculateItemTotal: () => 0,
      calculateItemPersonalizationTotal: () => 0
    }));

    const { result } = renderHook(() => useQuoteBuilderState());
    
    // Set PA and try to save
    result.current.setClientId("pa-1");
    await result.current.handleSaveQuote("pending");

    expect(toastSpy).toHaveBeenCalledWith(expect.stringContaining("Limite de alçada excedido"), expect.anything());
  });

  it("bloqueia salvamento se o pedido exceder a verba mensal restante", async () => {
    const { useQuoteBuilderState } = await import("@/hooks/useQuoteBuilderState");
    const { renderHook } = await import("@testing-library/react");
    const { toast } = await import("sonner");
    const toastSpy = vi.spyOn(toast, "error");

    // total 600 fits alçada (1000) but exceeds remaining budget (5000 - 4500 = 500)
    vi.mock("@/utils/quote-calculations", () => ({
      calculateQuoteTotals: () => ({ total: 600, subtotal: 600, markup: 0 }),
      formatCurrency: (v: number) => `R$ ${v}`,
      calculateItemTotal: () => 0,
      calculateItemPersonalizationTotal: () => 0
    }));

    const { result } = renderHook(() => useQuoteBuilderState());
    
    result.current.setClientId("pa-1");
    await result.current.handleSaveQuote("pending");

    expect(toastSpy).toHaveBeenCalledWith(expect.stringContaining("Verba insuficiente"), expect.anything());
  });
});
