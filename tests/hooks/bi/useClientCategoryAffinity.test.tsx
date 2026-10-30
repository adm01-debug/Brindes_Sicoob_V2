import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));

import { useClientCategoryAffinity } from "@/hooks/bi/useClientCategoryAffinity";

function renderAffinity() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useClientCategoryAffinity("cliente-teste"), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}

describe("useClientCategoryAffinity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not promote rows with zero activity to favorite categories", async () => {
    rpc.mockResolvedValue({ data: [{ product_name: "Garrafa", occurrences: 0, total_quantity: 0, total_revenue: 0 }], error: null });
    const { result } = renderAffinity();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.dataStatus).toBe("insufficient");
    expect(result.current.favorite).toBeNull();
  });

  it("does not infer temporal trends from an aggregate RPC response", async () => {
    rpc.mockResolvedValue({ data: [{ product_name: "Garrafa", occurrences: 2, total_quantity: 4, total_revenue: 100, avg_unit_price: 25 }], error: null });
    const { result } = renderAffinity();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.dataStatus).toBe("available");
    expect(result.current.favorite).toMatchObject({ deltaPct: null, trend: null });
  });

  it("expõe indisponibilidade quando a RPC falha", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("falha RPC") });
    const { result } = renderAffinity();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.dataStatus).toBe("unavailable");
    expect(result.current.categories).toEqual([]);
  });
});
