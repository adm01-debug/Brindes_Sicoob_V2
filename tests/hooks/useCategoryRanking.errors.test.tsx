import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  fetchPromobrindProducts: vi.fn(),
  invokeExternalDb: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "seller-1" } }) }));
vi.mock("@/hooks/useCurrentOrgId", () => ({ useCurrentOrgId: () => null }));
vi.mock("@/lib/auth/visibility-scope", () => ({ useSalesScope: () => "all" }));
vi.mock("@/lib/auth/apply-seller-scope", () => ({ applySellerScope: (query: unknown) => query }));
vi.mock("@/lib/external-db", () => ({
  fetchPromobrindProducts: mocks.fetchPromobrindProducts,
  invokeExternalDb: mocks.invokeExternalDb,
}));

import { useCategoryRanking } from "@/hooks/useCommercialIntelligence";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function orderItemsQuery(result: unknown) {
  const query = {
    select: vi.fn(() => query),
    gte: vi.fn(() => query),
    in: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

describe("useCategoryRanking — integridade do score combinado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue(orderItemsQuery({ data: [], error: null }));
    mocks.fetchPromobrindProducts.mockResolvedValue([
      { id: "product-1", category_id: "category-1", category_name: "Canecas" },
    ]);
    mocks.invokeExternalDb.mockResolvedValue({ records: [], count: 0 });
  });

  it("propaga falha de order_items em vez de produzir ranking vazio", async () => {
    mocks.from.mockReturnValue(orderItemsQuery({ data: null, error: { message: "orders indisponível" } }));
    const { result } = renderHook(() => useCategoryRanking(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(mocks.invokeExternalDb).not.toHaveBeenCalled();
  });

  it("bloqueia o score combinado quando a consulta externa de mercado informa erro", async () => {
    mocks.invokeExternalDb.mockResolvedValue({ records: [], success: false, error: "market indisponível" });
    const { result } = renderHook(() => useCategoryRanking(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(mocks.invokeExternalDb).toHaveBeenCalledWith(expect.objectContaining({ table: "stock_daily_summary" }));
  });

  it("mantém lista vazia apenas quando as consultas essenciais concluem sem erro", async () => {
    const { result } = renderHook(() => useCategoryRanking(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
