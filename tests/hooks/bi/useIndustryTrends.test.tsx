import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, fetchIndustryPeerIds } = vi.hoisted(() => ({ rpc: vi.fn(), fetchIndustryPeerIds: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
vi.mock("@/lib/crm-db", () => ({ fetchIndustryPeerIds }));

import { useIndustryTrends } from "@/hooks/bi/useIndustryTrends";

function renderTrends() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useIndustryTrends("cooperativa"), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}

describe("useIndustryTrends", () => {
  beforeEach(() => vi.clearAllMocks());

  it("não rotula agregado de 90 dias como tendência temporal nem promove compra isolada", async () => {
    fetchIndustryPeerIds.mockResolvedValue(["a", "b", "c", "d"]);
    rpc.mockResolvedValue({
      data: [
        { product_name: "Caneta", unique_clients: 2, total_quantity: 8, total_revenue: 80 },
        { product_name: "Garrafa", unique_clients: 3, total_quantity: 12, total_revenue: 300 },
      ],
      error: null,
    });

    const { result } = renderTrends();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.dataStatus).toBe("available");
    expect(result.current.data?.companiesInRamo).toBe(4);
    expect(result.current.data?.trends).toHaveLength(1);
    expect(result.current.data?.trends[0]).toMatchObject({ productName: "Garrafa", trend: null });
  });

  it("não perde produto elegível além da 60ª posição por volume (teto de linhas do RPC)", async () => {
    fetchIndustryPeerIds.mockResolvedValue(["a", "b", "c", "d"]);
    const linhas = [
      ...Array.from({ length: 60 }, (_, i) => ({
        product_name: `Isolado ${i}`,
        unique_clients: 1,
        total_quantity: 200 - i,
        total_revenue: 100,
      })),
      { product_name: "Garrafa", unique_clients: 3, total_quantity: 60, total_revenue: 300 },
    ];
    rpc.mockImplementation((_fn: string, args: { _limit: number }) => ({ data: linhas.slice(0, args._limit), error: null }));

    const { result } = renderTrends();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.trends.map((t) => t.productName)).toEqual(["Garrafa"]);
  });

  it("mantém amostra insuficiente quando o ramo tem menos de três empresas", async () => {
    fetchIndustryPeerIds.mockResolvedValue(["a"]);

    const { result } = renderTrends();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.dataStatus).toBe("insufficient");
    expect(result.current.data?.trends).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });
});
