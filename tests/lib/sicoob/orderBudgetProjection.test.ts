import { describe, expect, it } from "vitest";
import type { OrderStatus } from "@/types/sicoob/orders";
import { ORDER_STATUSES_CONSUMING_BUDGET, projectOrderAgainstBudget } from "@/lib/sicoob/orderBudgetProjection";

describe("projeção de consumo da verba por status do pedido", () => {
  it.each([...ORDER_STATUSES_CONSUMING_BUDGET])("não desconta novamente pedidos em %s", (orderStatus) => {
    const projection = projectOrderAgainstBudget({
      allocatedBudget: 1_000,
      remainingBudget: 800,
      orderTotal: 250,
      orderStatus,
    });

    expect(projection.alreadyConsumed).toBe(true);
    expect(projection.projectedRemainingBudget).toBe(800);
    expect(projection.projectedSpent).toBe(200);
    expect(projection.percentageAfterOrder).toBe(20);
    expect(projection.isOverBudget).toBe(false);
  });

  it.each<OrderStatus>([
    "draft",
    "pending",
    "waiting_approval",
    "escalated_to_board",
  ])("projeta o desconto uma única vez para pedidos ainda não consumidores (%s)", (orderStatus) => {
    const projection = projectOrderAgainstBudget({
      allocatedBudget: 1_000,
      remainingBudget: 800,
      orderTotal: 250,
      orderStatus,
    });

    expect(projection.alreadyConsumed).toBe(false);
    expect(projection.projectedRemainingBudget).toBe(550);
    expect(projection.projectedSpent).toBe(450);
    expect(projection.percentageAfterOrder).toBe(45);
    expect(projection.isOverBudget).toBe(false);
  });

  it.each<OrderStatus>(["rejected", "cancelled"])("não projeta consumo para pedido encerrado (%s)", (orderStatus) => {
    const projection = projectOrderAgainstBudget({
      allocatedBudget: 1_000,
      remainingBudget: 800,
      orderTotal: 250,
      orderStatus,
    });

    expect(projection.alreadyConsumed).toBe(false);
    expect(projection.hasNoBudgetImpact).toBe(true);
    expect(projection.projectedRemainingBudget).toBe(800);
    expect(projection.projectedSpent).toBe(200);
    expect(projection.impact).toBeNull();
    expect(projection.isOverBudget).toBe(false);
  });

  it("não atribui consumo a pedido encerrado quando a verba configurada é zero", () => {
    const projection = projectOrderAgainstBudget({
      allocatedBudget: 0,
      remainingBudget: 0,
      orderTotal: 250,
      orderStatus: "cancelled",
    });

    expect(projection.percentageAfterOrder).toBe(0);
    expect(projection.impact).toBeNull();
    expect(projection.isOverBudget).toBe(false);
  });

  it("sinaliza saldo insuficiente somente quando o pedido ainda precisa consumir verba", () => {
    const awaitingApproval = projectOrderAgainstBudget({
      allocatedBudget: 1_000,
      remainingBudget: 200,
      orderTotal: 250,
      orderStatus: "waiting_approval",
    });
    const confirmed = projectOrderAgainstBudget({
      allocatedBudget: 1_000,
      remainingBudget: 200,
      orderTotal: 250,
      orderStatus: "confirmed",
    });

    expect(awaitingApproval.isOverBudget).toBe(true);
    expect(confirmed.isOverBudget).toBe(false);
  });
});
