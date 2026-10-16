import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import GestorCompras from "@/pages/GestorCompras";

const mockUseQuery = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "gestor-1" },
    profile: { cooperativa_id: "cooperativa-1" },
  }),
}));

vi.mock("@/components/seo/PageSEO", () => ({ PageSEO: () => null }));
vi.mock("@/components/orders/OrderConsolidationPanel", () => ({
  OrderConsolidationPanel: () => <div>Consolidação canônica</div>,
}));
vi.mock("@/components/orders/SmartAlertsPanel", () => ({
  SmartAlertsPanel: () => <div>Alertas</div>,
}));
vi.mock("@/pages/sicoob/orders/OrdersKanbanPage", () => ({
  default: () => <div>Kanban Sicoob canônico</div>,
}));
vi.mock("@/pages/sicoob/orders/OrdersPage", () => ({
  default: () => <div>Pedidos Sicoob canônicos</div>,
}));

type QueryState = {
  data?: unknown;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;
  isLoading: boolean;
  refetch: ReturnType<typeof vi.fn>;
};

function queryState(overrides: Partial<QueryState> = {}): QueryState {
  return {
    data: undefined,
    isError: false,
    error: null,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function configureQueries(states: {
  pending?: QueryState;
  monthly?: QueryState;
  history?: QueryState;
} = {}) {
  const pending = states.pending ?? queryState({ data: { data: [], count: 0 } });
  const monthly = states.monthly ?? queryState({ data: { data: [], count: 0 } });
  const history = states.history ?? queryState();

  mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
    if (options.queryKey[0] === "purchasing-manager-sla-events") return history;
    if (options.queryKey[1] === "pedidos-pendentes") return pending;
    if (options.queryKey[1] === "pedidos-mes") return monthly;
    throw new Error(`Consulta inesperada: ${String(options.queryKey[0])}`);
  });

  return { pending, monthly, history };
}

describe("GestorCompras", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it("informa as consultas de métricas com falha e repete somente as consultas afetadas", () => {
    const pending = queryState({ isError: true, error: new Error("falha pendências") });
    const monthly = queryState({ isError: true, error: new Error("falha mensal") });
    const history = queryState();
    configureQueries({ pending, monthly, history });

    render(<GestorCompras />);

    expect(screen.getByRole("alert")).toHaveTextContent("fila de pendências, resumo mensal");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(pending.refetch).toHaveBeenCalledOnce();
    expect(monthly.refetch).toHaveBeenCalledOnce();
    expect(history.refetch).not.toHaveBeenCalled();
  });

  it("expõe a falha do histórico e permite repetir sua consulta", () => {
    const history = queryState({ isError: true, error: new Error("falha histórico") });
    configureQueries({
      pending: queryState({
        data: {
          data: [{ id: "pedido-1", status: "waiting_approval", total_amount: 100, created_at: "2026-10-15T10:00:00Z" }],
          count: 1,
        },
      }),
      history,
    });

    render(<GestorCompras />);

    expect(screen.getByRole("alert")).toHaveTextContent("histórico de aprovação");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(history.refetch).toHaveBeenCalledOnce();
  });

  it("abre as visões canônicas de pedidos Sicoob nas abas operacionais", async () => {
    configureQueries();
    render(<GestorCompras />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Kanban" }));
    expect(await screen.findByText("Kanban Sicoob canônico")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Pedidos" }));
    expect(await screen.findByText("Pedidos Sicoob canônicos")).toBeInTheDocument();
  });
});
