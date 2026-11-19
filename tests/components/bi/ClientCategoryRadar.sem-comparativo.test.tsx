/**
 * Regressão: sem categorias do setor, o radar afirmava exclusividade
 * ("Exclusivo do cliente") lendo a ausência de comparativo como setor em 0%.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useClientCategoryAffinity: vi.fn(),
  useIndustryCategoryTrends: vi.fn(),
  useBICategoryFocus: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("@/hooks/bi/useClientCategoryAffinity", () => ({ useClientCategoryAffinity: mocks.useClientCategoryAffinity }));
vi.mock("@/hooks/bi/useIndustryCategoryTrends", () => ({ useIndustryCategoryTrends: mocks.useIndustryCategoryTrends }));
vi.mock("@/contexts/BICategoryFocusContext", () => ({ useBICategoryFocus: mocks.useBICategoryFocus }));

import { ClientCategoryRadar } from "@/components/bi/ClientCategoryRadar";

const categoriaDoCliente = {
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
};

describe("ClientCategoryRadar — setor sem categorias", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.useBICategoryFocus.mockReturnValue({ focusedSlug: null, setFocus: vi.fn() });
    mocks.useClientCategoryAffinity.mockReturnValue({
      isMock: false, isLoading: false, isError: false, refetch: vi.fn(),
      categories: [categoriaDoCliente],
    });
    mocks.useIndustryCategoryTrends.mockReturnValue({
      isMock: false, isLoading: false, isError: false, refetch: vi.fn(),
      categories: [],
    });
  });

  it("não afirma exclusividade quando não há comparativo do setor", () => {
    render(<ClientCategoryRadar clientId="c1" clientName="Cooperativa Alpha" ramoAtividade="Crédito" />);

    expect(screen.queryByText("Exclusivo do cliente")).toBeNull();
    expect(screen.getAllByText("Sem comparativo do setor").length).toBeGreaterThan(0);
  });

  it("mantém a exclusividade quando o setor respondeu e não tem a categoria", () => {
    mocks.useIndustryCategoryTrends.mockReturnValue({
      isMock: false, isLoading: false, isError: false, refetch: vi.fn(),
      categories: [{ slug: "canetas", label: "Canetas", revenueSharePct: 80, topProducts: [] }],
    });

    render(<ClientCategoryRadar clientId="c1" clientName="Cooperativa Alpha" ramoAtividade="Crédito" />);

    expect(screen.getAllByText("Exclusivo do cliente").length).toBeGreaterThan(0);
  });
});
