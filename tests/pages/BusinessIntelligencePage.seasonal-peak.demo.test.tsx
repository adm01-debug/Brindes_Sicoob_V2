/**
 * Ligacao: BusinessIntelligencePage repassa `seasonality.isMock` para
 * useSeasonalPeakNotifications. Se a pagina mandar `isMock: false` quando a
 * fonte sazonalidade e simulada, o alerta de pico grava na tabela real de
 * toda equipe em modo demo (regressao do ADM-35).
 */
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  useClientSeasonality: vi.fn(),
  useSeasonalPeakNotifications: vi.fn(),
  useCrmCompany: vi.fn(),
  supabaseFrom: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.supabaseFrom },
}));

vi.mock("@/hooks/bi/useClientSeasonality", () => ({
  useClientSeasonality: mocks.useClientSeasonality,
}));

vi.mock("@/hooks/bi/useSeasonalPeakNotifications", () => ({
  useSeasonalPeakNotifications: mocks.useSeasonalPeakNotifications,
}));

vi.mock("@/hooks/useCrmCompanies", () => ({ useCrmCompany: mocks.useCrmCompany }));
vi.mock("@/lib/bi/demoClient", () => ({
  DEMO_CLIENT_ID: "sicoob-demo",
  isDemoClient: (id: string | null) => id === "sicoob-demo",
}));

// Componentes pesados do BI ficam fora do escopo desta ligacao.
vi.mock("@/components/bi/ClientHealthHero", () => ({ ClientHealthHero: () => null }));
vi.mock("@/components/bi/ChurnRiskBanner", () => ({ ChurnRiskBanner: () => null }));
vi.mock("@/components/bi/ClientCategoryRadar", () => ({ ClientCategoryRadar: () => null }));
vi.mock("@/components/bi/ClientOverview360", () => ({ ClientOverview360: () => null }));
vi.mock("@/components/bi/EnrichedOrdersTimeline", () => ({ EnrichedOrdersTimeline: () => null }));
vi.mock("@/components/bi/ClientVsIndustryComparison", () => ({ ClientVsIndustryComparison: () => null }));
vi.mock("@/components/bi/ClientAffinityProducts", () => ({ ClientAffinityProducts: () => null }));
vi.mock("@/components/bi/BundleSuggestions", () => ({ BundleSuggestions: () => null }));
vi.mock("@/components/bi/IndustryTrendingProducts", () => ({ IndustryTrendingProducts: () => null }));
vi.mock("@/components/bi/ClientSeasonalityHeatmap", () => ({ ClientSeasonalityHeatmap: () => null }));
vi.mock("@/components/bi/ClientLookalikes", () => ({ ClientLookalikes: () => null }));
vi.mock("@/components/bi/EmpiricalRecommendations", () => ({ EmpiricalRecommendations: () => null }));
vi.mock("@/components/bi/BITourGuide", () => ({ BITourGuide: () => null }));
vi.mock("@/components/bi/BIBriefingMode", () => ({ BIBriefingMode: () => null }));
vi.mock("@/components/bi/BIAiCopilot", () => ({ BIAiCopilot: () => null }));
vi.mock("@/components/bi/ExecutiveSummaryButton", () => ({ ExecutiveSummaryButton: () => null }));
vi.mock("@/components/bi/ClientSelector", () => ({ ClientSelector: () => null }));
vi.mock("@/components/seo/PageSEO", () => ({ PageSEO: () => null }));

import BusinessIntelligencePage from "@/pages/BusinessIntelligencePage";

const BASE_SEASONALITY = {
  isMock: false,
  hasEnoughData: true,
  monthsCovered: 12,
  topClientMonths: [],
  topIndustryMonths: [],
  insight: null,
  daysToNextPeak: 3,
  nextPeakMonth: 4,
  client: [],
  industry: [],
};

describe("BI -> repasse do modo demo ao alerta de pico", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useCrmCompany.mockReset().mockReturnValue({ data: null });
  });

  // Mesmo clientId nos dois cenarios: o que muda e o retorno de
  // useClientSeasonality. Se a pagina deduzisse o sinal pelo ID (isDemoClient),
  // ambos cairiam no mesmo valor e um dos cenarios falharia.
  const renderFor = (seasonality: Record<string, unknown>) => {
    mocks.useClientSeasonality.mockReset().mockReturnValue(seasonality);
    render(
      <MemoryRouter initialEntries={["/ferramentas/bi?clientId=sicoob-real"]}>
        <BusinessIntelligencePage />
      </MemoryRouter>
    );
    return waitFor(() => expect(mocks.useSeasonalPeakNotifications).toHaveBeenCalled());
  };

  it("sazonalidade simulada passa isMock: true para useSeasonalPeakNotifications", async () => {
    await renderFor({ ...BASE_SEASONALITY, isMock: true });
    const [args] = mocks.useSeasonalPeakNotifications.mock.calls[0] as unknown as Array<Record<string, unknown>>;
    expect(args.isMock).toBe(true);
    expect(args.daysToNextPeak).toBe(3);
  });

  it("sazonalidade real passa isMock: false", async () => {
    await renderFor({ ...BASE_SEASONALITY, isMock: false });
    const [args] = mocks.useSeasonalPeakNotifications.mock.calls[0] as unknown as Array<Record<string, unknown>>;
    expect(args.isMock).toBe(false);
  });
});
