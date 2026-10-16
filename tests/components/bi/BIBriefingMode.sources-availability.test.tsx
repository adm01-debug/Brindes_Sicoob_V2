import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../render-helpers";

const mocks = vi.hoisted(() => ({ hooks: {} as Record<string, unknown>, retryCategoryAffinity: vi.fn() }));

vi.mock("@/hooks/bi/useClientHealthScore", () => ({
  useClientHealthScore: () => mocks.hooks.health,
  getAvailableHealthScore: (health: { tier: string; score: number }) => health.tier === "unknown" ? null : health.score,
}));
vi.mock("@/hooks/bi/useClientBI", () => ({
  useClientBI: () => mocks.hooks.bi,
  getAvailableClientHistory: (bi: { isUnavailable: boolean; ltv: number; avgTicket: number; ordersCount: number; daysSinceLastOrder: number | null }) => bi.isUnavailable ? null : bi,
}));
vi.mock("@/hooks/bi/useClientAffinity", () => ({ useClientAffinity: () => mocks.hooks.affinity }));
vi.mock("@/hooks/bi/useIndustryTrends", () => ({ useIndustryTrends: () => mocks.hooks.trends }));
vi.mock("@/hooks/bi/useClientCategoryAffinity", () => ({ useClientCategoryAffinity: () => mocks.hooks.catAffinity }));
vi.mock("@/hooks/bi/useIndustryCategoryTrends", () => ({ useIndustryCategoryTrends: () => mocks.hooks.catIndustry }));
vi.mock("@/hooks/bi/useClientSeasonality", () => ({ useClientSeasonality: () => mocks.hooks.seas }));
vi.mock("@/hooks/bi/useClientVsIndustry", () => ({ useClientVsIndustry: () => mocks.hooks.vs }));

import { BIBriefingMode } from "@/components/bi/BIBriefingMode";

describe("BIBriefingMode — disponibilidade de fontes", () => {
  beforeEach(() => {
    mocks.retryCategoryAffinity.mockReset().mockResolvedValue({});
    const retry = vi.fn(async () => undefined);
    const category = { slug: "garrafas", label: "Garrafas", revenueSharePct: 50, trend: "stable", deltaPct: null };
    mocks.hooks = {
      health: { isLoading: false, tier: "healthy", score: 80, crossZoneInsight: "Saúde", nextActionLabel: "Manter", nextActionDetail: "Acompanhar", windowLabel: "Sem janela", scriptHint: "Olá" },
      bi: { isLoading: false, isUnavailable: false, ltv: 100, avgTicket: 50, ordersCount: 2, daysSinceLastOrder: 4, refetch: retry },
      affinity: { isLoading: false, isFetching: false, isError: false, data: { categories: [], topProducts: [] }, refetch: retry },
      trends: { isLoading: false, isFetching: false, isError: false, data: { trends: [] }, refetch: retry },
      catAffinity: { isLoading: false, isError: true, categories: [category], refetch: mocks.retryCategoryAffinity },
      catIndustry: { isLoading: false, isError: false, categories: [{ ...category, revenueSharePct: 30 }], refetch: retry },
      seas: { isLoading: false, isError: false, industryError: null, refetch: retry, topClientMonths: [], nextPeakMonth: null, daysToNextPeak: null },
      vs: { isLoading: false, isError: false, refetch: retry, metrics: [] },
    };
  });

  it("oculta o GAP e bloqueia cópia se categorias do cliente falham", async () => {
    renderWithProviders(<BIBriefingMode open onOpenChange={vi.fn()} clientId="cliente-1" clientName="Cooperativa" ramoAtividade="Crédito" />);

    expect(screen.getByRole("alert").textContent).toContain("categorias do cliente");
    expect(screen.queryByText("GAP")).toBeNull();
    expect((screen.getByRole("button", { name: "Briefing indisponível" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(mocks.retryCategoryAffinity).toHaveBeenCalledTimes(1));
  });

  it("bloqueia briefing com tendência setorial em cache após falha do CRM", async () => {
    const retryTrends = vi.fn(async () => undefined);
    mocks.hooks.trends = {
      isLoading: false,
      isFetching: false,
      isError: true,
      data: { trends: [{ productName: "Produto setorial em cache" }] },
      refetch: retryTrends,
    };
    mocks.hooks.catAffinity = { ...mocks.hooks.catAffinity as object, isError: false };

    renderWithProviders(<BIBriefingMode open onOpenChange={vi.fn()} clientId="cliente-1" clientName="Cooperativa" ramoAtividade="Crédito" />);

    expect(screen.getByRole("alert")).toHaveTextContent("tendências do setor");
    expect(screen.queryByText("Produto setorial em cache")).toBeNull();
    expect((screen.getByRole("button", { name: "Briefing indisponível" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(retryTrends).toHaveBeenCalledOnce());
  });
});
