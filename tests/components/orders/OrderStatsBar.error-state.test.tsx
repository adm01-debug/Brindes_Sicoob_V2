import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useOrdersList: vi.fn(), refetch: vi.fn() }));

vi.mock("@/hooks/orders/useOrders", () => ({ useOrdersList: mocks.useOrdersList }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "vendedor-1" } }) }));
vi.mock("@/lib/auth/visibility-scope", () => ({ useSalesScope: () => ({}) }));

import { OrderStatsBar } from "@/components/orders/OrderStatsBar";

describe("OrderStatsBar", () => {
  it("não mostra zeros quando a consulta falha", () => {
    mocks.useOrdersList.mockReturnValue({ data: undefined, isError: true, refetch: mocks.refetch });

    render(<OrderStatsBar />);

    expect(screen.getByRole("alert")).toHaveTextContent("Estatísticas de pedidos indisponíveis");
    expect(screen.queryByText("Total de Pedidos")).toBeNull();
  });

  it("a retentativa do alerta refaz a consulta das estatísticas", () => {
    mocks.useOrdersList.mockReturnValue({ data: undefined, isError: true, refetch: mocks.refetch });

    render(<OrderStatsBar />);
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente as estatísticas" }));

    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });

  it("mostra recarga, não zeros, enquanto a retentativa está em curso", () => {
    mocks.useOrdersList.mockReturnValue({ data: undefined, isError: true, refetch: mocks.refetch });

    const { rerender } = render(<OrderStatsBar />);
    // Retentar tira a consulta do estado de erro mantendo `data` indefinido.
    mocks.useOrdersList.mockReturnValue({ data: undefined, isError: false, refetch: mocks.refetch });
    rerender(<OrderStatsBar />);

    expect(screen.getByRole("status")).toHaveTextContent("Recarregando estatísticas de pedidos");
    expect(screen.queryByText("Total de Pedidos")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("mantém os números já medidos quando só a atualização falha", () => {
    // Carga boa seguida de falha de atualização: o React Query mantém `data`
    // e liga `isError` -- apagar os cartões aqui esconderia número real.
    mocks.useOrdersList.mockReturnValue({
      data: { data: [{ status: "rascunho" }, { status: "concluido" }] },
      isError: true,
      refetch: mocks.refetch,
    });

    render(<OrderStatsBar />);

    expect(screen.getByText("Total de Pedidos").parentElement).toHaveTextContent("2");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Estatísticas da última consulta bem-sucedida",
    );
    expect(screen.queryByText("Estatísticas de pedidos indisponíveis")).toBeNull();
  });

  it("conta os pedidos quando a consulta responde", () => {
    mocks.useOrdersList.mockReturnValue({
      data: {
        data: [
          { status: "rascunho" },
          { status: "enviado_gestor" },
          { status: "concluido" },
        ],
      },
      isError: false,
    });

    render(<OrderStatsBar />);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Total de Pedidos").parentElement).toHaveTextContent("3");
    expect(screen.getByText("Concluídos").parentElement).toHaveTextContent("1");
  });
});
