import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../render-helpers";

const mocks = vi.hoisted(() => ({
  hooks: {} as Record<string, unknown>,
  invoke: vi.fn(),
  refetchAffinity: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("@/hooks/bi/useClientHealthScore", () => ({ useClientHealthScore: () => mocks.hooks.health }));
vi.mock("@/hooks/bi/useClientBI", () => ({ useClientBI: () => mocks.hooks.bi }));
vi.mock("@/hooks/bi/useClientAffinity", () => ({ useClientAffinity: () => mocks.hooks.affinity }));
vi.mock("@/hooks/bi/useIndustryTrends", () => ({ useIndustryTrends: () => mocks.hooks.trends }));
vi.mock("@/hooks/bi/useClientSeasonality", () => ({ useClientSeasonality: () => mocks.hooks.seas }));
vi.mock("@/hooks/bi/useClientVsIndustry", () => ({ useClientVsIndustry: () => mocks.hooks.vs }));

import { BIAiCopilot } from "@/components/bi/BIAiCopilot";

describe("BIAiCopilot — disponibilidade de fontes", () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
    mocks.refetchAffinity.mockReset().mockResolvedValue({});
    const retry = vi.fn(async () => undefined);
    mocks.hooks = {
      health: { isLoading: false, tier: "healthy", score: 80 },
      bi: { isLoading: false, isUnavailable: false, refetch: retry, ltv: 100, avgTicket: 50, ordersCount: 2, daysSinceLastOrder: 4 },
      affinity: { isLoading: false, isFetching: false, isError: true, data: undefined, refetch: mocks.refetchAffinity },
      trends: { isLoading: false, isFetching: false, isError: false, data: { trends: [] }, refetch: retry },
      seas: { isLoading: false, isError: false, industryError: null, refetch: retry, topClientMonths: [], nextPeakMonth: null, daysToNextPeak: null },
      vs: { isLoading: false, isError: false, refetch: retry, metrics: [] },
    };
  });

  it("bloqueia envio quando afinidade falha e permite refazer a consulta", async () => {
    renderWithProviders(<BIAiCopilot open onOpenChange={vi.fn()} clientId="cliente-1" clientName="Cooperativa" ramoAtividade="Crédito" />);

    expect(screen.getByRole("alert").textContent).toContain("afinidade de produtos");
    expect((screen.getByPlaceholderText("Pergunte algo sobre este cliente...") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Por que a frequência caiu\?/i }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(mocks.refetchAffinity).toHaveBeenCalledTimes(1));
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("não envia tendência setorial em cache quando a fonte falha", async () => {
    const retryTrends = vi.fn(async () => undefined);
    mocks.hooks.affinity = { ...mocks.hooks.affinity as object, isError: false, data: { categories: [] } };
    mocks.hooks.trends = {
      isLoading: false,
      isFetching: false,
      isError: true,
      data: { trends: [{ productName: "Produto setorial em cache" }] },
      refetch: retryTrends,
    };

    renderWithProviders(<BIAiCopilot open onOpenChange={vi.fn()} clientId="cliente-1" clientName="Cooperativa" ramoAtividade="Crédito" />);

    expect(screen.getByRole("alert")).toHaveTextContent("tendências do setor");
    expect((screen.getByPlaceholderText("Pergunte algo sobre este cliente...") as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(retryTrends).toHaveBeenCalledOnce());
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
