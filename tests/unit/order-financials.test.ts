import { describe, expect, it } from "vitest";
import { isCommittedSicoobOrder, sumCommittedSicoobOrders } from "@/utils/sicoob/orderFinancials";

describe("semântica financeira dos pedidos Sicoob", () => {
  it("exclui rascunhos, pendências, rejeições e cancelamentos do volume comprometido", () => {
    const orders = [
      { status: "draft" as const, total_amount: 100 },
      { status: "pending" as const, total_amount: 200 },
      { status: "rejected" as const, total_amount: 300 },
      { status: "cancelled" as const, total_amount: 400 },
      { status: "confirmed" as const, total_amount: 500 },
      { status: "in_transit" as const, total_amount: 600 },
      { status: "completed" as const, total_amount: 700 },
    ];

    expect(sumCommittedSicoobOrders(orders)).toBe(1_800);
    expect(isCommittedSicoobOrder({ status: "waiting_approval" })).toBe(false);
    expect(isCommittedSicoobOrder({ status: "delivered" })).toBe(true);
  });
});
