import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useCategoryRanking: vi.fn() }));
vi.mock("@/hooks/useCommercialIntelligence", () => ({ useCategoryRanking: mocks.useCategoryRanking }));

import { CategoryRanking } from "@/components/intelligence/CategoryRanking";

describe("CategoryRanking — falha versus lista vazia", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mostra erro com retry e não apresenta falha inicial como ranking vazio", () => {
    const refetch = vi.fn();
    mocks.useCategoryRanking.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch,
    });

    render(<CategoryRanking />);

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar o ranking combinado");
    expect(screen.queryByText("Nenhuma categoria com vendas")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("exibe o estado vazio apenas após consulta bem-sucedida sem categorias", () => {
    mocks.useCategoryRanking.mockReturnValue({
      data: { items: [], marketAvailable: true, marketError: null },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<CategoryRanking />);

    expect(screen.getByText("Nenhuma categoria com vendas")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("mantém a receita interna e desabilita os modos externos quando o mercado falha", () => {
    const refetch = vi.fn();
    mocks.useCategoryRanking.mockReturnValue({
      data: {
        items: [{
          categoryId: "category-1",
          categoryName: "Canecas",
          internalRevenue: 1200,
          internalQty: 40,
          internalOrders: 2,
          marketDepleted: 0,
          totalScore: 60,
        }],
        marketAvailable: false,
        marketError: "market indisponível",
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch,
    });

    render(<CategoryRanking />);

    expect(screen.getByRole("status")).toHaveTextContent("O ranking exibe somente a receita interna");
    expect(screen.getByText("Canecas")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*1\.200/)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Combinado" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Mercado/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Interno/ })).toHaveAttribute("data-state", "on");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
