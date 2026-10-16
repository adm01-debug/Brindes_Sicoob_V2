import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useCrmClientsPage: vi.fn(),
}));

vi.mock("@/hooks/useCrmCompanies", () => ({
  useCrmClientsPage: mocks.useCrmClientsPage,
}));
vi.mock("@/components/seo/PageSEO", () => ({ PageSEO: () => null }));
vi.mock("@/components/clients/ClientCard", () => ({
  ClientCard: ({ client }: { client: { razao_social: string } }) => <div>{client.razao_social}</div>,
}));

import ClientsPage from "@/pages/ClientsPage";

const KPIS = { totalCount: 201, newThisMonth: 0, withLocation: 0, withCnpj: 0 };

function client(id: string, razaoSocial: string) {
  return { id, razao_social: razaoSocial };
}

function renderPage() {
  return render(<MemoryRouter><ClientsPage /></MemoryRouter>);
}

describe("paginação de ClientsPage", () => {
  beforeEach(() => {
    mocks.useCrmClientsPage.mockReset();
  });

  it("retorna à última página válida quando uma remoção reduz o total de páginas", async () => {
    let lastPageWasRemoved = false;
    mocks.useCrmClientsPage.mockImplementation(({ pageIndex }: { pageIndex: number }) => {
      const pageWasInvalidated = lastPageWasRemoved && pageIndex === 2;
      const pageClients = pageWasInvalidated
        ? []
        : [client(`cliente-${pageIndex}`, pageIndex === 2 ? "Cliente removido" : `Cliente da página ${pageIndex + 1}`)];
      return {
        data: {
          clients: pageClients,
          filteredCount: lastPageWasRemoved ? 200 : 201,
          totalPages: lastPageWasRemoved ? 2 : 3,
          pageIndex,
          kpis: KPIS,
        },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      };
    });

    const view = renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    expect(screen.getByText("Página 3 de 3")).toBeInTheDocument();

    lastPageWasRemoved = true;
    view.rerender(<MemoryRouter><ClientsPage /></MemoryRouter>);

    await waitFor(() => expect(mocks.useCrmClientsPage).toHaveBeenLastCalledWith(expect.objectContaining({ pageIndex: 1 })));
    expect(screen.getByText("Cliente da página 2")).toBeInTheDocument();
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
    expect(screen.queryByText("Sua base está vazia")).not.toBeInTheDocument();
  });
});
