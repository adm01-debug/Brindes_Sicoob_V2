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
      data: [],
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<CategoryRanking />);

    expect(screen.getByText("Nenhuma categoria com vendas")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
