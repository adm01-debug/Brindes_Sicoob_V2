import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    from: mocks.from,
  },
}));

import { sicoobApprovalService } from "@/services/sicoob/approvalService";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "gestor-1" } } });
  mocks.rpc.mockResolvedValue({ data: null, error: null });
});

describe("sicoobApprovalService.rejectOrderWithoutApproval", () => {
  it("registra a rejeição sem solicitação pela RPC auditável", async () => {
    await sicoobApprovalService.rejectOrderWithoutApproval(
      "pedido-1",
      "waiting_approval",
      "Especificação comercial não atende ao pedido local",
    );

    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("reject_sicoob_order_without_approval", {
      p_order_id: "pedido-1",
      p_expected_status: "waiting_approval",
      p_reason: "Especificação comercial não atende ao pedido local",
    });
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
});

describe("sicoobApprovalService.createLimitIncreaseRequest", () => {
  it("grava o solicitante, que é o que a policy de INSERT exige", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ insert });

    await sicoobApprovalService.createLimitIncreaseRequest("pa-1", 5000, "Aumento sazonal");

    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("limit_increase_requests");
    expect(insert).toHaveBeenCalledExactlyOnceWith({
      pa_id: "pa-1",
      requested_by: "gestor-1",
      requested_limit: 5000,
      reason: "Aumento sazonal",
      status: "pending",
    });
  });

  it("falha sem sessão em vez de inserir pedido sem solicitante", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    await expect(
      sicoobApprovalService.createLimitIncreaseRequest("pa-1", 1, "motivo"),
    ).rejects.toThrow("Usuário não autenticado");
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
