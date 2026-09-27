import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: mocks.rpc,
    from: mocks.from,
  },
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { OrderService } from "@/services/OrderService";

describe("OrderService.convertQuoteToOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({
      data: [{
        id: "00000000-0000-4000-8000-000000000101",
        order_number: "SIC-ABCD1234",
        status: "pending",
        total_amount: 110,
      }],
      error: null,
    });
  });

  it("delega toda a conversão à RPC transacional do domínio Sicoob", async () => {
    await expect(OrderService.convertQuoteToOrder({
      quoteId: "00000000-0000-4000-8000-000000000001",
      sellerId: "00000000-0000-4000-8000-000000000002",
      organizationId: "00000000-0000-4000-8000-000000000003",
    })).resolves.toEqual({
      id: "00000000-0000-4000-8000-000000000101",
      order_number: "SIC-ABCD1234",
      status: "pending",
      total: 110,
    });

    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("convert_quote_to_sicoob_order", {
      p_quote_id: "00000000-0000-4000-8000-000000000001",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("não envia identidade ou organização fornecida pelo navegador ao banco", async () => {
    await OrderService.convertQuoteToOrder({ quoteId: "quote-1", sellerId: "ator-forjado", organizationId: "org-forjada" });
    expect(mocks.rpc).toHaveBeenCalledWith("convert_quote_to_sicoob_order", { p_quote_id: "quote-1" });
  });

  it("propaga a falha atômica devolvida pela RPC", async () => {
    const failure = new Error("item inválido");
    mocks.rpc.mockResolvedValue({ data: null, error: failure });
    await expect(OrderService.convertQuoteToOrder({ quoteId: "quote-1", sellerId: "seller-1" }))
      .rejects.toBe(failure);
  });

  it("falha fechado quando a RPC não confirma o pedido criado", async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    await expect(OrderService.convertQuoteToOrder({ quoteId: "quote-1", sellerId: "seller-1" }))
      .rejects.toThrow(/não confirmou/i);
  });
});

describe("OrderService.duplicate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({
      data: [{
        id: "00000000-0000-4000-8000-000000000201",
        order_number: "RE-PED-2026-0001-ABCDEF12",
        status: "rascunho",
        total: 24,
      }],
      error: null,
    });
  });

  it("delega cabeçalho, itens, logística e auditoria à RPC transacional", async () => {
    await expect(OrderService.duplicate(
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000099",
    )).resolves.toMatchObject({
      id: "00000000-0000-4000-8000-000000000201",
      status: "rascunho",
      total: 24,
    });

    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("duplicate_order_atomic", {
      p_order_id: "00000000-0000-4000-8000-000000000001",
      p_idempotency_key: "00000000-0000-4000-8000-000000000099",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("propaga a falha transacional sem tentar completar o pedido no cliente", async () => {
    const failure = new Error("item inválido");
    mocks.rpc.mockResolvedValue({ data: null, error: failure });

    await expect(OrderService.duplicate("order-1", "key-1")).rejects.toBe(failure);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("falha fechado quando o banco não confirma o pedido duplicado", async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    await expect(OrderService.duplicate("order-1", "key-1"))
      .rejects.toThrow(/não confirmou a duplicação integral/i);
  });
});

describe("OrderService.logAudit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("não oculta falha de persistência da trilha de auditoria", async () => {
    const failure = new Error("schema de auditoria inválido");
    mocks.rpc.mockResolvedValue({ data: null, error: failure });

    await expect(OrderService.logAudit({
      orderId: "order-1",
      eventType: "status_change",
      description: "Status alterado",
      metadata: { old_status: "rascunho", new_status: "enviado_gestor" },
    })).rejects.toBe(failure);
  });
});
