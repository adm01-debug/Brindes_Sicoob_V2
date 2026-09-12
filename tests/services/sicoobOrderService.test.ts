import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    from: mocks.from,
  },
}));

import { sicoobOrderService } from "@/services/sicoob/orderService";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "gestor-1", email: "gestor@cooperativa.test" } } });
  mocks.rpc.mockResolvedValue({ data: null, error: null });
});

describe("sicoobOrderService.updateOrderStatus", () => {
  it("confirma pelo RPC transacional com comparação do estado atual", async () => {
    await sicoobOrderService.updateOrderStatus("pedido-1", "confirmed", "waiting_approval");

    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("confirm_sicoob_order", {
      p_order_id: "pedido-1",
      p_expected_status: "waiting_approval",
    });
    expect(mocks.from).not.toHaveBeenCalled();
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

  it("usa RPC transacional para status comuns e encaminha a observação", async () => {
    await sicoobOrderService.updateOrderStatus("pedido-1", "logistic", "confirmed", "Pedido entregue à transportadora");

    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("transition_sicoob_order_status", {
      p_order_id: "pedido-1",
      p_expected_status: "confirmed",
      p_new_status: "logistic",
      p_comment: "Pedido entregue à transportadora",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("propaga falha da transição sem tentar efeitos adicionais no cliente", async () => {
    const falha = new Error("o pedido mudou");
    mocks.rpc.mockResolvedValue({ data: null, error: falha });

    await expect(sicoobOrderService.updateOrderStatus("pedido-1", "logistic", "confirmed"))
      .rejects.toBe(falha);

    expect(mocks.from).not.toHaveBeenCalled();
  });
});
