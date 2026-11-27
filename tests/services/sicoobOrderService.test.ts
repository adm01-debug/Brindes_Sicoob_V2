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

describe("sicoobOrderService.listOrders", () => {
  /** Builder minimo do PostgREST: a cadeia termina no segundo `.order()`. */
  function listBuilder(result: { data: unknown; error: unknown; count: number }) {
    let orders = 0;
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ["select", "eq", "in", "gte", "lte", "or", "range"]) {
      chain[method] = vi.fn(() => chain);
    }
    chain.order = vi.fn(() => {
      orders += 1;
      return orders === 2 ? Promise.resolve(result) : chain;
    });
    return chain;
  }

  it("filtra SLA critico no servidor, antes de paginar", async () => {
    const chain = listBuilder({ data: [], error: null, count: 0 });
    mocks.from.mockImplementation(() => chain);

    await sicoobOrderService.listOrders({ sla_status: "critical", page: 1, pageSize: 9 });

    const eq = chain.eq as ReturnType<typeof vi.fn>;
    const range = chain.range as ReturnType<typeof vi.fn>;
    expect(mocks.from).toHaveBeenCalledWith("sicoob_orders");
    expect(eq).toHaveBeenCalledWith("sla_status", "critical");
    // O filtro tem de entrar no PostgREST antes do recorte da pagina: "Ver
    // Urgencias" contava o pedido critico em `waiting_approval` e nao o exibia.
    expect(eq.mock.invocationCallOrder[0]).toBeLessThan(range.mock.invocationCallOrder[0]);
  });

  it("nao envia filtro de SLA quando o recorte e todos", async () => {
    const chain = listBuilder({ data: [], error: null, count: 0 });
    mocks.from.mockImplementation(() => chain);

    await sicoobOrderService.listOrders({ sla_status: "all" });

    expect(chain.eq as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
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

describe("sicoobOrderService.listOrders — filtro de urgências", () => {
  function builderEspiao() {
    const chamadas: Array<[string, unknown]> = [];
    const builder: any = {
      select: () => builder,
      eq: (coluna: string, valor: unknown) => {
        chamadas.push([`eq:${coluna}`, valor]);
        return builder;
      },
      in: (coluna: string, valores: unknown) => {
        chamadas.push([`in:${coluna}`, valores]);
        return builder;
      },
      gte: () => builder,
      lt: () => builder,
      or: () => builder,
      ilike: () => builder,
      range: () => builder,
      order: () => builder,
      then: (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null, count: 0 }),
    };
    return { builder, chamadas };
  }

  it("“Ver Urgências” só lista pedidos em etapa de aprovação", async () => {
    const { builder, chamadas } = builderEspiao();
    mocks.from.mockReturnValue(builder);

    await sicoobOrderService.listOrders({ sla_status: "critical", page: 1, pageSize: 10 });

    // O cartão de SLA crítico conta apenas etapas de aprovação: sem o mesmo
    // recorte aqui, um pedido já aprovado (sla_status ainda `critical` até o
    // recálculo periódico) aparecia na lista com o cartão zerado.
    expect(chamadas).toContainEqual(["eq:sla_status", "critical"]);
    expect(chamadas).toContainEqual([
      "in:status",
      ["pending", "waiting_approval", "escalated_to_board"],
    ]);
  });

  it.each(["warning", "normal"])("o filtro %s continua sem recorte de etapa", async (sla) => {
    const { builder, chamadas } = builderEspiao();
    mocks.from.mockReturnValue(builder);

    await sicoobOrderService.listOrders({ sla_status: sla, page: 1, pageSize: 10 });

    expect(chamadas).toContainEqual(["eq:sla_status", sla]);
    expect(chamadas.some(([chave]) => chave === "in:status")).toBe(false);
  });
});
