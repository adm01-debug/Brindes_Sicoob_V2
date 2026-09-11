import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getUser: vi.fn(),
  invoke: vi.fn(),
  from: vi.fn(),
  updates: [] as Array<{ table: string; payload: unknown; filters: Array<[string, unknown]> }>,
  orderAfterMutation: {
    id: "pedido-1",
    order_number: "SCB-001",
    created_by: "comprador-1",
  },
  updateResult: { data: { id: "pedido-1" } as { id: string } | null, error: null as Error | null },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    functions: { invoke: mocks.invoke },
    from: mocks.from,
  },
}));

import { sicoobOrderService } from "@/services/sicoob/orderService";

function criarBuilder(table: string) {
  const filters: Array<[string, unknown]> = [];
  let updatePayload: unknown;
  const builder = {
    select: vi.fn(() => builder),
    update: vi.fn((payload: unknown) => {
      updatePayload = payload;
      return builder;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      filters.push([column, value]);
      return builder;
    }),
    maybeSingle: vi.fn(async () => {
      if (updatePayload !== undefined) {
        mocks.updates.push({ table, payload: updatePayload, filters: [...filters] });
      }
      return mocks.updateResult;
    }),
    single: vi.fn(async () => ({ data: mocks.orderAfterMutation, error: null })),
    insert: vi.fn(async () => ({ data: null, error: null })),
  };
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updates.length = 0;
  mocks.updateResult = { data: { id: "pedido-1" }, error: null };
  mocks.getUser.mockResolvedValue({ data: { user: { id: "gestor-1", email: "gestor@cooperativa.test" } } });
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  mocks.invoke.mockResolvedValue({ data: null, error: null });
  mocks.from.mockImplementation((table: string) => criarBuilder(table));
});

describe("sicoobOrderService.updateOrderStatus", () => {
  it("confirma pelo RPC transacional com comparação do estado atual", async () => {
    await sicoobOrderService.updateOrderStatus("pedido-1", "confirmed", "waiting_approval");

    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("confirm_sicoob_order", {
      p_order_id: "pedido-1",
      p_expected_status: "waiting_approval",
    });
    expect(mocks.updates).toHaveLength(0);
  });

  it("recusa atualização sem estado atual antes de chamar o banco", async () => {
    await expect(sicoobOrderService.updateOrderStatus("pedido-1", "confirmed"))
      .rejects.toThrow(/status atual é obrigatório/i);

    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("recusa transição inválida antes de chamar o banco", async () => {
    await expect(sicoobOrderService.updateOrderStatus("pedido-1", "completed", "waiting_approval"))
      .rejects.toThrow(/transição de status inválida/i);

    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("detecta concorrência em atualizações comuns pela ausência da linha esperada", async () => {
    mocks.updateResult = { data: null, error: null };

    await expect(sicoobOrderService.updateOrderStatus("pedido-1", "logistic", "confirmed"))
      .rejects.toThrow(/pedido mudou/i);

    expect(mocks.updates).toEqual([
      expect.objectContaining({
        table: "sicoob_orders",
        filters: [["id", "pedido-1"], ["status", "confirmed"]],
      }),
    ]);
  });

  it("propaga falha do RPC sem registrar efeitos posteriores", async () => {
    const falha = new Error("verba insuficiente");
    mocks.rpc.mockResolvedValue({ data: null, error: falha });

    await expect(sicoobOrderService.updateOrderStatus("pedido-1", "confirmed", "waiting_approval"))
      .rejects.toBe(falha);

    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
