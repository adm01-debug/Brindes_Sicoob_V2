import type { OrderStatus } from "@/types/sicoob/orders";

/** Mantido em sincronia com os estados `v_old_consumes`/`v_new_consumes` da migration 20260911143000. */
export const ORDER_STATUSES_CONSUMING_BUDGET: ReadonlySet<OrderStatus> = new Set([
  "confirmed",
  "logistic",
  "in_production",
  "in_separation",
  "in_transit",
  "delivered",
  "completed",
]);

const ORDER_STATUSES_PROJECTING_BUDGET: ReadonlySet<OrderStatus> = new Set([
  "draft",
  "pending",
  "waiting_approval",
  "escalated_to_board",
]);

const ORDER_STATUSES_WITHOUT_BUDGET_IMPACT: ReadonlySet<OrderStatus> = new Set([
  "rejected",
  "cancelled",
]);

export function projectOrderAgainstBudget(input: {
  allocatedBudget: number | null;
  remainingBudget: number;
  orderTotal: number;
  orderStatus?: OrderStatus | null;
}) {
  const alreadyConsumed = hasStatus(input.orderStatus, ORDER_STATUSES_CONSUMING_BUDGET);
  const hasNoBudgetImpact = hasStatus(input.orderStatus, ORDER_STATUSES_WITHOUT_BUDGET_IMPACT);
  const shouldProjectConsumption = shouldProjectOrder(input.orderStatus);
  const consumptionToApply = alreadyConsumed || !shouldProjectConsumption ? 0 : input.orderTotal;
  const projectedRemainingBudget = input.remainingBudget - consumptionToApply;
  const projectedSpent = input.allocatedBudget === null
    ? null
    : input.allocatedBudget - input.remainingBudget + consumptionToApply;
  const percentageAfterOrder = getPercentageAfterOrder(
    input.allocatedBudget,
    projectedSpent,
    input.orderTotal,
    hasNoBudgetImpact,
  );
  const impact = calculateImpact(input.allocatedBudget, input.orderTotal, hasNoBudgetImpact);

  return {
    alreadyConsumed,
    hasNoBudgetImpact,
    projectedRemainingBudget,
    projectedSpent,
    percentageAfterOrder,
    impact,
    isOverBudget: projectedRemainingBudget < 0,
  };
}

function hasStatus(status: OrderStatus | null | undefined, candidates: ReadonlySet<OrderStatus>) {
  return status !== null && status !== undefined && candidates.has(status);
}

function shouldProjectOrder(status: OrderStatus | null | undefined) {
  return status === null || status === undefined || ORDER_STATUSES_PROJECTING_BUDGET.has(status);
}

function calculateImpact(allocatedBudget: number | null, orderTotal: number, hasNoBudgetImpact: boolean) {
  if (hasNoBudgetImpact || allocatedBudget === null || allocatedBudget <= 0) return null;
  return (orderTotal / allocatedBudget) * 100;
}

function getPercentageAfterOrder(
  allocatedBudget: number | null,
  projectedSpent: number | null,
  orderTotal: number,
  hasNoBudgetImpact: boolean,
) {
  if (allocatedBudget !== null && allocatedBudget > 0 && projectedSpent !== null) {
    return Math.min((projectedSpent / allocatedBudget) * 100, 100);
  }
  if (allocatedBudget === 0 && orderTotal > 0 && !hasNoBudgetImpact) return 100;
  return 0;
}
