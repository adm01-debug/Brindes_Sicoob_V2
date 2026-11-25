import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, fetchIndustryPeerIds } = vi.hoisted(() => ({ rpc: vi.fn(), fetchIndustryPeerIds: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
vi.mock("@/lib/crm-db", () => ({ fetchIndustryPeerIds }));

import { useClientSeasonality } from "@/hooks/bi/useClientSeasonality";

const CLIENTE = [
  { year: 2025, month: 1, quotes_count: 2, total_revenue: 200, avg_ticket: 100 },
  { year: 2025, month: 2, quotes_count: 3, total_revenue: 300, avg_ticket: 100 },
  { year: 2025, month: 3, quotes_count: 4, total_revenue: 400, avg_ticket: 100 },
];
const SETOR_ZERADO = [
  { year: 2025, month: 1, avg_quotes_per_company: 0, avg_revenue_per_company: 0, companies_active: 0 },
];
/** Média de duas empresas com histórico. */
const SETOR_DUAS_EMPRESAS = [
  { year: 2025, month: 5, avg_quotes_per_company: 6, avg_revenue_per_company: 600, companies_active: 2 },
];
/** Um comprador só, mesmo com vários cadastros no ramo. */
const SETOR_UMA_EMPRESA = [
  { year: 2025, month: 5, avg_quotes_per_company: 9, avg_revenue_per_company: 900, companies_active: 1 },
];
const SETOR_TRES_EMPRESAS = [
  { year: 2025, month: 5, avg_quotes_per_company: 4, avg_revenue_per_company: 400, companies_active: 3 },
];

function seasonalityRpc(industryRows: unknown[]) {
  rpc.mockImplementation(async (name: string) => {
    if (name === "get_client_seasonality") return { data: CLIENTE, error: null };
    return { data: industryRows, error: null };
  });
}

function renderSeasonality() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useClientSeasonality("cliente", "cooperativa"), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}

describe("useClientSeasonality", () => {
  beforeEach(() => vi.clearAllMocks());

  it("não classifica setor sem atividade e sem três compradores como amostra real", async () => {
    fetchIndustryPeerIds.mockResolvedValue(["a", "b", "c"]);
    seasonalityRpc(SETOR_ZERADO);

    const { result } = renderSeasonality();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasClientData).toBe(true);
    expect(result.current.hasIndustryData).toBe(false);
    expect(result.current.dataStatus).toBe("insufficient");
    expect(result.current.topIndustryMonths).toEqual([]);
  });

  it("não transforma a média de duas empresas em sazonalidade do setor", async () => {
    fetchIndustryPeerIds.mockResolvedValue(["a", "b"]);
    seasonalityRpc(SETOR_DUAS_EMPRESAS);

    const { result } = renderSeasonality();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasIndustryData).toBe(false);
    expect(result.current.dataStatus).toBe("insufficient");
    expect(result.current.topIndustryMonths).toEqual([]);
    expect(result.current.industry.every((celula) => celula.avgQuotesPerCompany === 0)).toBe(true);
    expect(result.current.insight).not.toMatch(/setor|mercado/i);
  });

  it("cadastro no ramo não é histórico: três cadastros com um comprador não viram setor", async () => {
    fetchIndustryPeerIds.mockResolvedValue(["a", "b", "c"]);
    seasonalityRpc(SETOR_UMA_EMPRESA);

    const { result } = renderSeasonality();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasIndustryData).toBe(false);
    expect(result.current.dataStatus).toBe("insufficient");
    expect(result.current.topIndustryMonths).toEqual([]);
    expect(result.current.industry.every((celula) => celula.avgQuotesPerCompany === 0)).toBe(true);
    expect(result.current.insight).not.toMatch(/setor|mercado/i);
  });

  it("usa o setor como mercado quando há três empresas com histórico", async () => {
    fetchIndustryPeerIds.mockResolvedValue(["a", "b", "c"]);
    seasonalityRpc(SETOR_TRES_EMPRESAS);

    const { result } = renderSeasonality();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasIndustryData).toBe(true);
    expect(result.current.dataStatus).toBe("available");
    expect(result.current.topIndustryMonths.map((mes) => mes.month)).toEqual([5]);
  });
});
