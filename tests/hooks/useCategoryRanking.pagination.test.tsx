import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invokeWithRetry: vi.fn(),
  supabase: { from: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: mocks.supabase }));
vi.mock("@/lib/external-db/invoke", () => ({ invokeWithRetry: mocks.invokeWithRetry }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/hooks/useCurrentOrgId", () => ({ useCurrentOrgId: () => "org-1" }));
vi.mock("@/lib/auth/visibility-scope", () => ({ useSalesScope: () => ({}) }));
vi.mock("@/lib/auth/apply-seller-scope", () => ({ applySellerScope: (query: unknown) => query }));

import { useCategoryRanking } from "@/hooks/useCommercialIntelligence";

const ORDER_ITEMS = [
  { id: "item-1", order_id: "order-1", product_id: "product-1", quantity: 2, unit_price: 10 },
  { id: "item-2", order_id: "order-1", product_id: "product-1", quantity: 3, unit_price: 10 },
];

function catalogPage(offset: number) {
  const size = offset === 0 ? 500 : 1;
  return Array.from({ length: size }, (_, index) => ({
    id: `product-${offset + index}`,
    category_id: "category-1",
    main_category_id: null,
    category_name: "Canecas",
  }));
}

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

function externalCalls() {
  return mocks.invokeWithRetry.mock.calls.map(([body]) => body as {
    table: string;
    offset?: number;
    limit?: number;
    orderBy?: unknown;
  });
}

describe("useCategoryRanking — paginação e contagem de pedidos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const builder = {
      select: () => builder,
      gte: () => builder,
      in: () => builder,
      order: () => builder,
      range: async () => ({ data: ORDER_ITEMS, error: null }),
    };
    mocks.supabase.from.mockReturnValue(builder);
    mocks.invokeWithRetry.mockImplementation(async (body: { table: string; offset?: number }) => ({
      data: {
        success: true,
        data: {
          records: body.table === "products"
            ? catalogPage(body.offset ?? 0)
            : [{ product_id: "product-1", units_depleted: 7 }],
          count: null,
        },
      },
      error: null,
    }));
  });

  it("lê todas as páginas do catálogo respeitando o teto de 500 do bridge", async () => {
    const { result } = renderHook(() => useCategoryRanking(30, null, null, null), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const productsCalls = externalCalls().filter((body) => body.table === "products");
    expect(productsCalls.map((body) => body.offset ?? 0)).toEqual([0, 500]);
    expect(productsCalls.every((body) => body.limit === 500)).toBe(true);

    const marketCall = externalCalls().find((body) => body.table === "stock_daily_summary");
    expect(marketCall?.orderBy).toEqual({ column: "product_id", ascending: true });
  });

  it("conta pedido com vários itens uma única vez e soma mercado e receita", async () => {
    const { result } = renderHook(() => useCategoryRanking(30, null, null, null), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const item = result.current.data?.items[0];
    expect(item?.internalOrders).toBe(1);
    expect(item?.internalQty).toBe(5);
    expect(item?.internalRevenue).toBe(50);
    expect(item?.marketDepleted).toBe(7);
    expect(result.current.data?.marketAvailable).toBe(true);
  });

  it("mantém a receita interna e sinaliza o erro quando o mercado falha", async () => {
    mocks.invokeWithRetry.mockImplementation(async (body: { table: string; offset?: number }) => {
      if (body.table === "products") {
        return {
          data: { success: true, data: { records: catalogPage(body.offset ?? 0), count: null } },
          error: null,
        };
      }
      return { data: null, error: new Error("mercado fora do ar") };
    });

    const { result } = renderHook(() => useCategoryRanking(30, null, null, null), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.marketAvailable).toBe(false);
    expect(result.current.data?.marketError).toBe("mercado fora do ar");
    expect(result.current.data?.items[0]?.internalRevenue).toBe(50);
  });
});
