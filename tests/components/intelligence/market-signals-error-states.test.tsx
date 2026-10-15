import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  refetch: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => mocks.query,
}));
vi.mock("@/pages/trends/is-demo-mode", () => ({ isDemoMode: () => false }));

import { HotSearchesCard } from "@/components/intelligence/HotSearchesCard";
import { TopCategoriesCard } from "@/components/intelligence/TopCategoriesCard";

function failedQuery() {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    isFetching: false,
    refetch: mocks.refetch,
  };
}

describe("cartões de sinais de mercado — falha e ausência", () => {
  beforeEach(() => {
    mocks.refetch.mockReset().mockResolvedValue({});
    mocks.query = failedQuery();
  });

  it("mostra indisponibilidade e retry nas buscas quentes", () => {
    render(<MemoryRouter><HotSearchesCard days={30} /></MemoryRouter>);

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as buscas quentes");
    expect(screen.queryByText("Sem dados de busca no período")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it("mostra indisponibilidade e retry no ranking de categorias", () => {
    render(<TopCategoriesCard days={30} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar o ranking de categorias");
    expect(screen.queryByText(/Ainda não há dados suficientes/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it("só declara ausência depois de resposta confirmada sem dados", () => {
    mocks.query = { ...failedQuery(), data: [], isError: false };
    const first = render(<MemoryRouter><HotSearchesCard days={30} /></MemoryRouter>);
    expect(screen.getByText("Sem dados de busca no período")).toBeInTheDocument();
    first.unmount();

    render(<TopCategoriesCard days={30} />);
    expect(screen.getByText(/Ainda não há dados suficientes/)).toBeInTheDocument();
  });
});
