import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    from: mocks.from,
    functions: { invoke: mocks.invoke },
  },
}));

import { sicoobOrderService } from "@/services/sicoob/orderService";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "gestor-1", email: "gestor@cooperativa.test" } } });
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  mocks.invoke.mockResolvedValue({ data: { quoteId: "orcamento-1" }, error: null });
});

describe("sicoobOrderService.reorderOrder", () => {
  it("delega a revalidação de catálogo à Edge Function autenticada", async () => {
    await expect(sicoobOrderService.reorderOrder("pedido-1", "chave-idempotente-1"))
      .resolves.toBe("orcamento-1");

    expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith("sicoob-reorder", {
      body: { orderId: "pedido-1", idempotencyKey: "chave-idempotente-1" },
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("reutiliza a chave gerenciada quando a primeira resposta é perdida", async () => {
    mocks.invoke
      .mockResolvedValueOnce({ data: null, error: new Error("timeout") })
      .mockResolvedValueOnce({ data: { quoteId: "orcamento-1" }, error: null });

    await expect(sicoobOrderService.reorderOrder("pedido-retry")).rejects.toThrow("timeout");
    await expect(sicoobOrderService.reorderOrder("pedido-retry")).resolves.toBe("orcamento-1");

    const firstCall = mocks.invoke.mock.calls[0];
    const retryCall = mocks.invoke.mock.calls[1];
    expect(firstCall).toBeDefined();
    expect(retryCall).toBeDefined();
    const firstKey = firstCall![1].body.idempotencyKey;
    const retryKey = retryCall![1].body.idempotencyKey;
    expect(firstKey).toEqual(expect.any(String));
    expect(firstKey).not.toHaveLength(0);
    expect(retryKey).toBe(firstKey);
  });

  it("preserva a chave em memória quando o sessionStorage recusa escrita", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("quota excedida", "QuotaExceededError");
    });
    mocks.invoke
      .mockResolvedValueOnce({ data: null, error: new Error("timeout") })
      .mockResolvedValueOnce({ data: { quoteId: "orcamento-1" }, error: null });

    await expect(sicoobOrderService.reorderOrder("pedido-storage-indisponivel"))
      .rejects.toThrow("timeout");
    await expect(sicoobOrderService.reorderOrder("pedido-storage-indisponivel"))
      .resolves.toBe("orcamento-1");

    const firstKey = mocks.invoke.mock.calls[0]?.[1].body.idempotencyKey;
    const retryKey = mocks.invoke.mock.calls[1]?.[1].body.idempotencyKey;
    expect(firstKey).toEqual(expect.any(String));
    expect(retryKey).toBe(firstKey);
  });
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

  it("impede confirmação direta de pedido ainda não submetido à aprovação", async () => {
    await expect(sicoobOrderService.updateOrderStatus("pedido-1", "confirmed", "pending"))
      .rejects.toThrow(/transição de status inválida/i);

    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("prepara pedido dentro da alçada pela RPC própria", async () => {
    await sicoobOrderService.updateOrderStatus("pedido-1", "waiting_approval", "pending", "Pronto para confirmação");

    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("prepare_sicoob_order_confirmation", {
      p_order_id: "pedido-1",
      p_expected_status: "pending",
      p_comment: "Pronto para confirmação",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("escala sem usar a transição genérica", async () => {
    await sicoobOrderService.updateOrderStatus(
      "pedido-1",
      "escalated_to_board",
      "waiting_approval",
      "Escalação para diretoria por exceder a alçada local",
    );

    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("request_sicoob_order_approval", {
      p_order_id: "pedido-1",
      p_expected_status: "waiting_approval",
      p_reason: "Escalação para diretoria por exceder a alçada local",
      p_threshold: 0,
      p_is_escalated: true,
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("recusa rejeição sem o fluxo que registra o motivo", async () => {
    await expect(sicoobOrderService.updateOrderStatus("pedido-1", "rejected", "waiting_approval"))
      .rejects.toThrow(/decisão de rejeição/i);

    expect(mocks.rpc).not.toHaveBeenCalled();
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
