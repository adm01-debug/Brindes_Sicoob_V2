import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, selectCrm } = vi.hoisted(() => ({ rpc: vi.fn(), selectCrm: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
vi.mock("@/lib/crm-db", () => ({ selectCrm }));

import { useIndustryTrends } from "@/hooks/bi/useIndustryTrends";

function renderTrends() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useIndustryTrends("cooperativa"), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}

describe("useIndustryTrends", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exige ao menos três compradores efetivos e não rotula agregado como tendência temporal", async () => {
    selectCrm.mockResolvedValue([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]);
    rpc.mockResolvedValue({ data: [
      { product_name: "Caneta", unique_clients: 2, total_quantity: 8, total_revenue: 80 },
      { product_name: "Garrafa", unique_clients: 3, total_quantity: 12, total_revenue: 300 },
    ], error: null });
    const { result } = renderTrends();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.trends).toHaveLength(1);
    expect(result.current.data?.trends[0]).toMatchObject({ productName: "Garrafa", trend: null });
    expect(result.current.data?.companiesInRamo).toBe(3);
  });

  it("mantém status insuficiente se só houver um comprador", async () => {
    selectCrm.mockResolvedValue([{ id: "a" }]);
    rpc.mockResolvedValue({ data: [{ product_name: "Caneta", unique_clients: 1, total_quantity: 8, total_revenue: 80 }], error: null });
    const { result } = renderTrends();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.dataStatus).toBe("insufficient");
    expect(result.current.data?.trends).toEqual([]);
  });
});
