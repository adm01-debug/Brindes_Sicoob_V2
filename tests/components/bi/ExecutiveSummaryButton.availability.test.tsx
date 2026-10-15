import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../render-helpers";

const mocks = vi.hoisted(() => ({
  hooks: {} as Record<string, unknown>,
  generateBIPptx: vi.fn(),
}));

vi.mock("@/hooks/bi/useClientHealthScore", () => ({ useClientHealthScore: () => mocks.hooks.health }));
vi.mock("@/hooks/bi/useClientBI", () => ({ useClientBI: () => mocks.hooks.bi }));
vi.mock("@/hooks/bi/useClientAffinity", () => ({ useClientAffinity: () => mocks.hooks.affinity }));
vi.mock("@/hooks/bi/useIndustryTrends", () => ({ useIndustryTrends: () => mocks.hooks.trends }));
vi.mock("@/hooks/bi/useClientSeasonality", () => ({ useClientSeasonality: () => mocks.hooks.seas }));
vi.mock("@/hooks/bi/useClientVsIndustry", () => ({ useClientVsIndustry: () => mocks.hooks.vs }));
vi.mock("@/hooks/bi/useClientCategoryAffinity", () => ({ useClientCategoryAffinity: () => mocks.hooks.catAffinity }));
vi.mock("@/hooks/bi/useIndustryCategoryTrends", () => ({ useIndustryCategoryTrends: () => mocks.hooks.catIndustry }));
vi.mock("@/lib/bi/pptxGenerator", () => ({ generateBIPptx: mocks.generateBIPptx }));
vi.mock("@/lib/bi/executive-summary", () => ({ buildCategorySection: vi.fn(() => "") }));

import { ExecutiveSummaryButton } from "@/components/bi/ExecutiveSummaryButton";

function makeHooks(overrides: Record<string, Record<string, unknown>> = {}) {
  const retry = vi.fn(async () => undefined);
  const baseline = {
    health: { isLoading: false, tier: "healthy", score: 82, crossZoneInsight: "Dados reais", shareOfWalletPct: 20, potentialUntappedBRL: 1000, windowLabel: "Sem janela", nextActionLabel: "Manter cadência", nextActionDetail: "Acompanhar", scriptHint: "Olá" },
    bi: { isLoading: false, isUnavailable: false, ltv: 1000, ordersCount: 2, avgTicket: 500, daysSinceLastOrder: 30, refetch: retry },
    affinity: { isLoading: false, isError: false, data: { categories: [{ category: "Canetas" }] }, refetch: retry },
    trends: { isLoading: false, isError: false, data: { trends: [{ productName: "Caneta" }] }, refetch: retry },
    seas: { isLoading: false, isError: false, industryError: null, insight: "Pico confirmado", refetch: retry },
    vs: { isLoading: false, isError: false, refetch: retry, metrics: [] },
    catAffinity: { isLoading: false, isError: false, categories: [], refetch: retry },
    catIndustry: { isLoading: false, isError: false, categories: [], refetch: retry },
  };
  mocks.hooks = Object.fromEntries(Object.entries(baseline).map(([name, value]) => [name, { ...value, ...overrides[name], refetch: overrides[name]?.refetch ?? retry }]));
  return { retry };
}

describe("disponibilidade do resumo executivo", () => {
  beforeEach(() => {
    makeHooks();
    mocks.generateBIPptx.mockReset().mockResolvedValue(undefined);
  });

  it("bloqueia copiar e PPTX quando uma fonte usada pelo resumo falha e permite tentar novamente", async () => {
    const retryAffinity = vi.fn(async () => undefined);
    makeHooks({ affinity: { isError: true, data: undefined, refetch: retryAffinity } });
    renderWithProviders(<ExecutiveSummaryButton clientId="cliente-1" clientName="Cooperativa" ramoAtividade="Crédito" />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Resumo indisponível/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("afinidade do cliente");
    const copyItem = screen.getByRole("menuitem", { name: /Copiar para WhatsApp/i });
    const pptxItem = screen.getByRole("menuitem", { name: /Exportar PPTX/i });
    expect(copyItem).toHaveAttribute("data-disabled");
    expect(pptxItem).toHaveAttribute("data-disabled");

    await user.click(screen.getByRole("menuitem", { name: /Tentar novamente/i }));
    await waitFor(() => expect(retryAffinity).toHaveBeenCalledTimes(1));
    expect(mocks.generateBIPptx).not.toHaveBeenCalled();
  });

  it("mantém a cópia disponível quando falha apenas uma fonte exclusiva do PPTX", async () => {
    makeHooks({ catIndustry: { isError: true, categories: undefined } });
    renderWithProviders(<ExecutiveSummaryButton clientId="cliente-1" clientName="Cooperativa" ramoAtividade="Crédito" />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Resumo indisponível/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("categorias do setor");
    expect(screen.getByRole("menuitem", { name: /Copiar para WhatsApp/i })).not.toHaveAttribute("data-disabled");
    expect(screen.getByRole("menuitem", { name: /Exportar PPTX/i })).toHaveAttribute("data-disabled");
  });

  it("não publica zeros sentinela quando o Health Score não possui amostra suficiente", async () => {
    makeHooks({
      health: {
        tier: "unknown",
        score: 0,
        shareOfWalletPct: 0,
        potentialUntappedBRL: 0,
        isError: false,
        unavailableReason: "insufficient-data",
      },
    });
    renderWithProviders(<ExecutiveSummaryButton clientId="cliente-1" clientName="Cooperativa" ramoAtividade="Crédito" />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Resumo indisponível/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/dados insuficientes/i);
    expect(screen.getByRole("menuitem", { name: /Copiar para WhatsApp/i })).toHaveAttribute("data-disabled");
    expect(screen.getByRole("menuitem", { name: /Exportar PPTX/i })).toHaveAttribute("data-disabled");
    expect(screen.queryByRole("menuitem", { name: /Tentar novamente/i })).toBeNull();
    expect(mocks.generateBIPptx).not.toHaveBeenCalled();
  });
});
