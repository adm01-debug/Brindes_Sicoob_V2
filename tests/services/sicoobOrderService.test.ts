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

import { applyProfileScope, sicoobOrderService } from "@/services/sicoob/orderService";

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

describe("sicoobOrderService.getItemLogs", () => {
  /** Builder minimo do PostgREST: resolve no terminador da cadeia. */
  function builder(result: { data: unknown; error: unknown }, terminator: string) {
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order", "in"]) {
      chain[method] = vi.fn(() => (method === terminator ? Promise.resolve(result) : chain));
    }
    return chain;
  }

  it("resolve o autor por profiles.user_id sem embed irresolvivel", async () => {
    const selects: string[] = [];
    const logs = builder(
      {
        data: [
          { id: "l1", action: "UPDATE", old_data: null, new_data: null, created_at: "2026-01-02", user_id: "u1" },
          { id: "l2", action: "INSERT", old_data: null, new_data: null, created_at: "2026-01-01", user_id: null },
        ],
        error: null,
      },
      "order",
    );
    const profiles = builder({ data: [{ user_id: "u1", full_name: "Ana Souza" }], error: null }, "in");
    mocks.from.mockImplementation((table: string) => {
      const chain = table === "profiles" ? profiles : logs;
      const select = chain.select as ReturnType<typeof vi.fn>;
      select.mockImplementation((columns: string) => {
        selects.push(columns);
        return columns === "user_id, full_name" || table !== "profiles" ? chain : chain;
      });
      return chain;
    });

    const result = await sicoobOrderService.getItemLogs("pedido-1");

    // O embed `profiles!user_id` nao existe no schema e devolvia 400 no PostgREST.
    expect(selects.some((columns) => columns.includes("profiles!"))).toBe(false);
    expect(result).toEqual([
      { id: "l1", action: "UPDATE", old_data: null, new_data: null, created_at: "2026-01-02", user: { display_name: "Ana Souza" } },
      { id: "l2", action: "INSERT", old_data: null, new_data: null, created_at: "2026-01-01" },
    ]);
  });

  it("nao consulta profiles quando nenhum log tem autor", async () => {
    const logs = builder(
      { data: [{ id: "l1", action: "DELETE", old_data: null, new_data: null, created_at: "2026-01-03", user_id: null }], error: null },
      "order",
    );
    mocks.from.mockImplementation(() => logs);

    const result = await sicoobOrderService.getItemLogs("pedido-2");

    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("sicoob_order_item_logs");
    expect(result[0]).not.toHaveProperty("user");
  });
});

describe("applyProfileScope", () => {
  type Query = Parameters<typeof applyProfileScope>[0];

  function fakeQuery() {
    const eq = vi.fn((column: string, value: string) => ({ scoped: [column, value] }));
    return { query: { eq } as unknown as Query, eq };
  }

  it.each([
    ["gerente_pa", "gestor_pa"],
  ])("escopa por PA no papel %s e no rótulo legado %s", async (canonico, legado) => {
    for (const role of [canonico, legado]) {
      const { query, eq } = fakeQuery();
      const resultado = applyProfileScope(query, { role, pa_id: "pa-1", cooperativa_id: "coop-1" });
      expect(eq).toHaveBeenCalledExactlyOnceWith("pa_id", "pa-1");
      expect(resultado).toEqual({ scoped: ["pa_id", "pa-1"] });
    }
  });

  it.each([
    ["gestor_compras", "gestor_singular"],
  ])("escopa por cooperativa no papel %s e no rótulo legado %s", async (canonico, legado) => {
    for (const role of [canonico, legado]) {
      const { query, eq } = fakeQuery();
      applyProfileScope(query, { role, pa_id: "pa-1", cooperativa_id: "coop-1" });
      expect(eq).toHaveBeenCalledExactlyOnceWith("cooperative_id", "coop-1");
    }
  });

  it("não escopa vendedor, gestor sem vínculo e perfil ausente", () => {
    const casos = [
      { role: "vendedor", pa_id: "pa-1", cooperativa_id: "coop-1" },
      { role: "gerente_pa", pa_id: null, cooperativa_id: "coop-1" },
      { role: "gestor_compras", pa_id: "pa-1", cooperativa_id: null },
      null,
    ];

    for (const perfil of casos) {
      const { query, eq } = fakeQuery();
      expect(applyProfileScope(query, perfil)).toBe(query);
      expect(eq).not.toHaveBeenCalled();
    }
  });
});
