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
