import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../render-helpers";

const mocks = vi.hoisted(() => ({
  useIndustryTrends: vi.fn(),
  useClientAffinity: vi.fn(),
  useBICategoryFocus: vi.fn(),
  refetchTrends: vi.fn(),
  refetchAffinity: vi.fn(),
}));

vi.mock("@/hooks/bi/useIndustryTrends", () => ({ useIndustryTrends: mocks.useIndustryTrends }));
vi.mock("@/hooks/bi/useClientAffinity", () => ({ useClientAffinity: mocks.useClientAffinity }));
vi.mock("@/contexts/BICategoryFocusContext", () => ({ useBICategoryFocus: mocks.useBICategoryFocus }));

import { IndustryTrendingProducts } from "@/components/bi/IndustryTrendingProducts";

describe("IndustryTrendingProducts — afinidade indisponível", () => {
  beforeEach(() => {
    mocks.refetchTrends.mockReset().mockResolvedValue({});
    mocks.refetchAffinity.mockReset().mockResolvedValue({});
    mocks.useBICategoryFocus.mockReturnValue({ focusedSlug: null, focusedLabel: null });
    mocks.useIndustryTrends.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { isMock: false, companiesInRamo: 4, trends: [{ productName: "Garrafa Térmica", productId: "p-1", category: "Garrafas", unitsSold: 12, ordersCount: 4, avgPrice: 30, trend: "stable" }] },
      refetch: mocks.refetchTrends,
    });
    mocks.useClientAffinity.mockReturnValue({ isLoading: false, isFetching: false, isError: true, data: undefined, refetch: mocks.refetchAffinity });
  });

  it("não marca produtos como GAP/oportunidade quando a afinidade falha e permite retry", async () => {
    renderWithProviders(<IndustryTrendingProducts ramoAtividade="Crédito" clientId="cliente-1" />);

    expect(screen.getByRole("alert").textContent).toContain("afinidade de produtos do cliente");
    expect(screen.getByRole("alert").textContent).toContain("não serão classificadas sem afinidade confirmada");
    expect(screen.queryByText("Garrafa Térmica")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/i }));
    await waitFor(() => expect(mocks.refetchAffinity).toHaveBeenCalledTimes(1));
    expect(mocks.refetchTrends).not.toHaveBeenCalled();
  });

  it("permanece carregando enquanto consulta afinidade, sem renderizar GAPs", () => {
    mocks.useClientAffinity.mockReturnValue({ isLoading: false, isFetching: true, isError: false, data: undefined, refetch: mocks.refetchAffinity });
    renderWithProviders(<IndustryTrendingProducts ramoAtividade="Crédito" clientId="cliente-1" />);

    expect(screen.queryByText("Garrafa Térmica")).toBeNull();
    expect(screen.queryByText("Oportunidade")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
