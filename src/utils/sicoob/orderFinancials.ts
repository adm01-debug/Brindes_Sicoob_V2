import type { OrderStatus } from "@/types/sicoob/orders";

export const SICOOB_COMMITTED_ORDER_STATUSES: readonly OrderStatus[] = [
  "confirmed",
  "logistic",
  "in_production",
  "in_separation",
  "in_transit",
  "delivered",
  "completed",
];

const committedStatuses = new Set<OrderStatus>(SICOOB_COMMITTED_ORDER_STATUSES);

export function isCommittedSicoobOrder(order: { status: string }): boolean {
  return committedStatuses.has(order.status as OrderStatus);
}

export function sumCommittedSicoobOrders(
  orders: ReadonlyArray<{ status: string; total_amount: number | null }>,
): number {
  return orders.reduce(
    (sum, order) => sum + (isCommittedSicoobOrder(order) ? Number(order.total_amount || 0) : 0),
    0,
  );
}
