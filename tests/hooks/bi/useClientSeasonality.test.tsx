import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, selectCrm } = vi.hoisted(() => ({ rpc: vi.fn(), selectCrm: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
vi.mock("@/lib/crm-db", () => ({ selectCrm }));

import { useClientSeasonality } from "@/hooks/bi/useClientSeasonality";

function renderSeasonality() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useClientSeasonality("cliente", "cooperativa"), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}

describe("useClientSeasonality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockImplementation(async (name: string) => {
      if (name === "get_client_seasonality") return { data: [
        { year: 2025, month: 1, quotes_count: 2, total_revenue: 200, avg_ticket: 100 },
        { year: 2025, month: 2, quotes_count: 3, total_revenue: 300, avg_ticket: 100 },
        { year: 2025, month: 3, quotes_count: 4, total_revenue: 400, avg_ticket: 100 },
      ], error: null };
      return { data: [{ year: 2025, month: 1, avg_quotes_per_company: 0, avg_revenue_per_company: 0, companies_active: 0 }], error: null };
    });
  });

  it("não classifica setor sem atividade e sem três compradores como amostra real", async () => {
    selectCrm.mockResolvedValue([{ id: "a" }, { id: "b" }, { id: "c" }]);
    const { result } = renderSeasonality();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasClientData).toBe(true);
    expect(result.current.hasIndustryData).toBe(false);
    expect(result.current.dataStatus).toBe("insufficient");
    expect(result.current.topIndustryMonths).toEqual([]);
  });
});
