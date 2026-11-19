import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useClientCategoryAffinity: vi.fn(),
  useIndustryCategoryTrends: vi.fn(),
  useBICategoryFocus: vi.fn(),
  navigate: vi.fn(),
  refetchClient: vi.fn(),
  refetchIndustry: vi.fn(),
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("@/hooks/bi/useClientCategoryAffinity", () => ({ useClientCategoryAffinity: mocks.useClientCategoryAffinity }));
vi.mock("@/hooks/bi/useIndustryCategoryTrends", () => ({ useIndustryCategoryTrends: mocks.useIndustryCategoryTrends }));
vi.mock("@/contexts/BICategoryFocusContext", () => ({ useBICategoryFocus: mocks.useBICategoryFocus }));

import { ClientCategoryRadar } from "@/components/bi/ClientCategoryRadar";

describe("ClientCategoryRadar — falha na consulta do setor", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.refetchClient.mockReset().mockResolvedValue({});
    mocks.refetchIndustry.mockReset().mockResolvedValue({});
    mocks.useBICategoryFocus.mockReturnValue({ focusedSlug: null, setFocus: vi.fn() });
    mocks.useClientCategoryAffinity.mockReturnValue({
      isMock: false,
      isLoading: false,
      isError: false,
      refetch: mocks.refetchClient,
      categories: [{
        slug: "garrafas",
        label: "Garrafas",
        revenueSharePct: 100,
        occurrences: 2,
        totalQuantity: 20,
        totalRevenue: 1000,
        revenueRecent: 1000,
        revenuePrevious: 0,
        deltaPct: null,
        trend: "stable",
        topProducts: [],
      }],
    });
    mocks.useIndustryCategoryTrends.mockReturnValue({
      isMock: false,
      isLoading: false,
      isError: true,
      refetch: mocks.refetchIndustry,
      categories: [],
    });
  });

  it("oculta classificações exclusivas e badge de dados reais enquanto o setor falha", () => {
    render(<ClientCategoryRadar clientId="cliente-1" ramoAtividade="Cooperativa" />);

    expect(screen.getByText("Dados incompletos")).toBeTruthy();
    expect(screen.getByText(/dados reais do setor/i)).toBeTruthy();
    expect(screen.queryByText("Dados reais")).toBeNull();
    expect(screen.queryByText("Exclusivo do cliente")).toBeNull();
    expect(screen.queryByText(/GAP — Oportunidade/)).toBeNull();
    expect(screen.queryByText("Garrafas")).toBeNull();
  });

  it("permite tentar novamente a fonte do setor que falhou", () => {
    render(<ClientCategoryRadar clientId="cliente-1" ramoAtividade="Cooperativa" />);

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(mocks.refetchIndustry).toHaveBeenCalledTimes(1);
    expect(mocks.refetchClient).not.toHaveBeenCalled();
  });
});
