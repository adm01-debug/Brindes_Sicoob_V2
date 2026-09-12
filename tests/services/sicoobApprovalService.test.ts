import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
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
