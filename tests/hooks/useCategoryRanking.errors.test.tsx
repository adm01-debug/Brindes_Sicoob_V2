import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  invokeExternalDb: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "seller-1" } }) }));
vi.mock("@/hooks/useCurrentOrgId", () => ({ useCurrentOrgId: () => null }));
vi.mock("@/lib/auth/visibility-scope", () => ({ useSalesScope: () => "all" }));
vi.mock("@/lib/auth/apply-seller-scope", () => ({ applySellerScope: (query: unknown) => query }));
vi.mock("@/lib/external-db", () => ({
  invokeExternalDb: mocks.invokeExternalDb,
}));
vi.mock("@/lib/external-db/bridge", () => ({
  invokeExternalDb: mocks.invokeExternalDb,
}));

import { useCategoryRanking } from "@/hooks/useCommercialIntelligence";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function orderItemsQuery(result: { data: unknown[] | null; error: unknown }) {
  let rangeStart = 0;
  let rangeEnd = Number.MAX_SAFE_INTEGER;
  const query = {
    select: vi.fn(() => query),
    gte: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn((start: number, end: number) => {
      rangeStart = start;
      rangeEnd = end;
      return query;
    }),
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve({
        data: result.data?.slice(rangeStart, rangeEnd + 1) ?? null,
        error: result.error,
      }).then(resolve, reject),
  };
  return query;
}

describe("useCategoryRanking — integridade do score combinado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockImplementation(() => orderItemsQuery({ data: [], error: null }));
    mocks.invokeExternalDb.mockImplementation(({ table }: { table: string }) => Promise.resolve({
      records: table === "products"
        ? [{ id: "product-1", category_id: "category-1", category_name: "Canecas" }]
        : [],
      count: 0,
    }));
  });

  it("propaga falha de order_items em vez de produzir ranking vazio", async () => {
    mocks.from.mockImplementation(() => orderItemsQuery({ data: null, error: { message: "orders indisponível" } }));
    const { result } = renderHook(() => useCategoryRanking(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(mocks.invokeExternalDb).not.toHaveBeenCalled();
  });

  it("preserva o ranking interno quando a consulta externa de mercado informa erro", async () => {
    mocks.from.mockImplementation(() => orderItemsQuery({
      data: [{ id: "item-1", order_id: "order-1", product_id: "product-1", quantity: 4, unit_price: 25 }],
      error: null,
    }));
    mocks.invokeExternalDb.mockImplementation(({ table }: { table: string }) => Promise.resolve(
      table === "products"
        ? { records: [{ id: "product-1", category_id: "category-1", category_name: "Canecas" }] }
        : { records: [], success: false, error: "market indisponível" },
    ));
    const { result } = renderHook(() => useCategoryRanking(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      marketAvailable: false,
      marketError: "market indisponível",
      items: [{ categoryId: "category-1", internalRevenue: 100, internalQty: 4, marketDepleted: 0 }],
    });
    expect(mocks.invokeExternalDb).toHaveBeenCalledWith(expect.objectContaining({ table: "stock_daily_summary" }));
  });

  it("mantém lista vazia apenas quando as consultas essenciais concluem sem erro", async () => {
    const { result } = renderHook(() => useCategoryRanking(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ items: [], marketAvailable: true, marketError: null });
  });

  it("pagina todos os itens e conta pedidos distintos por categoria", async () => {
    const rows = Array.from({ length: 1001 }, (_, index) => ({
      id: `item-${String(index).padStart(4, "0")}`,
      order_id: `order-${Math.floor(index / 2)}`,
      product_id: "product-1",
      quantity: 1,
      unit_price: 10,
    }));
    mocks.from.mockImplementation(() => orderItemsQuery({ data: rows, error: null }));

    const { result } = renderHook(() => useCategoryRanking(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0]).toMatchObject({
      internalRevenue: 10010,
      internalQty: 1001,
      internalOrders: 501,
    });
    expect(mocks.from).toHaveBeenCalledTimes(2);
  });

  it("pagina catálogo e mercado além do limite de mil linhas", async () => {
    const products = Array.from({ length: 1001 }, (_, index) => ({
      id: `product-${index}`,
      category_id: index === 1000 ? "category-last" : "category-other",
      category_name: index === 1000 ? "Última" : "Outras",
    }));
    const market = Array.from({ length: 1001 }, (_, index) => ({
      product_id: `product-${index}`,
      units_depleted: index === 1000 ? 20 : 0,
    }));
    mocks.invokeExternalDb.mockImplementation(({ table, offset = 0, limit = 1000 }: { table: string; offset?: number; limit?: number }) => {
      const source = table === "products" ? products : market;
      return Promise.resolve({ records: source.slice(offset, offset + limit) });
    });

    const { result } = renderHook(() => useCategoryRanking(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ categoryId: "category-last", marketDepleted: 20 }),
    ]));
    expect(mocks.invokeExternalDb).toHaveBeenCalledWith(expect.objectContaining({ table: "products", offset: 1000 }));
    expect(mocks.invokeExternalDb).toHaveBeenCalledWith(expect.objectContaining({ table: "stock_daily_summary", offset: 1000 }));
  });
});
