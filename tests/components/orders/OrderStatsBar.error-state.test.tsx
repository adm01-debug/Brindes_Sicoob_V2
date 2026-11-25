import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useOrdersList: vi.fn() }));

vi.mock("@/hooks/orders/useOrders", () => ({ useOrdersList: mocks.useOrdersList }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "vendedor-1" } }) }));
vi.mock("@/lib/auth/visibility-scope", () => ({ useSalesScope: () => ({}) }));

import { OrderStatsBar } from "@/components/orders/OrderStatsBar";

describe("OrderStatsBar", () => {
  it("não mostra zeros quando a consulta falha", () => {
    mocks.useOrdersList.mockReturnValue({ data: undefined, isError: true });

    render(<OrderStatsBar />);

    expect(screen.getByRole("alert")).toHaveTextContent("Estatísticas de pedidos indisponíveis");
    expect(screen.queryByText("Total de Pedidos")).toBeNull();
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
