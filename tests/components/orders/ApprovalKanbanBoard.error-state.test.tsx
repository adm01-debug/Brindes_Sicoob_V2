import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const refetch = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks", async () => {
  const actual = await vi.importActual<typeof import("@/hooks")>("@/hooks");
  return {
    ...actual,
    useOrdersList: () => ({ data: undefined, isLoading: false, isError: true, refetch }),
    useUpdateOrder: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "gestor-1" } }) }));
vi.mock("@/pages/sicoob/orders/OrdersKanbanPage", () => ({
  DroppableColumn: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DraggableCard: () => null,
}));
vi.mock("@/components/orders/OrderDetailSheet", () => ({ OrderDetailSheet: () => null }));

import { ApprovalKanbanBoard } from "@/components/orders/ApprovalKanbanBoard";

describe("ApprovalKanbanBoard — falha de consulta", () => {
  it("distingue falha de fila vazia e oferece retentativa", () => {
    render(<ApprovalKanbanBoard />);

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar os pedidos desta fila");
    expect(screen.queryByTestId("approval-kanban")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
