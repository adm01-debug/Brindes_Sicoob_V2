import type { OrderStatus } from "@/types/sicoob/orders";

export interface SellerOrderMetricInput {
  status: string;
  total_amount: number | null;
}

export interface RecurrenceOrderInput {
  id: string;
  created_at: string;
}

export interface RecurrenceItemInput {
  order_id: string | null;
  product_name: string;
  quantity: number;
}

export interface ProductRecurrenceSignal {
  name: string;
  orderOccurrences: number;
  totalQuantity: number;
  sampleSize: number;
  lastObservedAt: string;
}

export interface CompletionEventMetricInput {
  order_id: string | null;
  created_at: string;
  total_amount: number | null;
}

export interface CompletedOrderMetric {
  id: string;
  total_amount: number;
  completed_at: string;
}

const WAITING_STATUSES = new Set<OrderStatus>([
  "draft", "pending", "waiting_approval", "escalated_to_board",
]);
const APPROVED_STATUSES = new Set<OrderStatus>([
  "confirmed", "logistic", "in_production", "in_separation",
  "in_transit", "delivered", "completed",
]);

export function deriveSellerOrderMetrics(orders: SellerOrderMetricInput[]) {
  return {
    total: orders.length,
    waiting: orders.filter((order) => WAITING_STATUSES.has(order.status as OrderStatus)).length,
    approved: orders.filter((order) => APPROVED_STATUSES.has(order.status as OrderStatus)).length,
    rejected: orders.filter((order) => order.status === "rejected").length,
    measuredAmount: orders.reduce(
      (sum, order) => sum + (APPROVED_STATUSES.has(order.status as OrderStatus) ? Number(order.total_amount || 0) : 0),
      0,
    ),
  };
}

export function formatMeasuredCurrency(value: number, sampleSize: number, formatter: (value: number) => string) {
  return sampleSize > 0 ? formatter(value) : "Sem dados";
}

export function deriveProductRecurrenceSignals(
  orders: RecurrenceOrderInput[],
  items: RecurrenceItemInput[],
  minimumSampleSize = 3,
): ProductRecurrenceSignal[] {
  if (orders.length < minimumSampleSize) return [];

  const orderDates = new Map(orders.map((order) => [order.id, order.created_at]));
  const products = new Map<string, {
    name: string;
    orderIds: Set<string>;
    totalQuantity: number;
    lastObservedAt: string;
  }>();

  for (const item of items) {
    if (!item.order_id || !orderDates.has(item.order_id)) continue;
    const name = item.product_name.trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase("pt-BR");
    const observedAt = orderDates.get(item.order_id)!;
    const current = products.get(key) ?? {
      name,
      orderIds: new Set<string>(),
      totalQuantity: 0,
      lastObservedAt: observedAt,
    };
    current.orderIds.add(item.order_id);
    current.totalQuantity += Number(item.quantity || 0);
    if (observedAt > current.lastObservedAt) current.lastObservedAt = observedAt;
    products.set(key, current);
  }

  return [...products.values()]
    .filter((product) => product.orderIds.size >= 2)
    .map((product) => ({
      name: product.name,
      orderOccurrences: product.orderIds.size,
      totalQuantity: product.totalQuantity,
      sampleSize: orders.length,
      lastObservedAt: product.lastObservedAt,
    }))
    .sort((left, right) =>
      right.orderOccurrences - left.orderOccurrences
      || right.totalQuantity - left.totalQuantity
      || left.name.localeCompare(right.name, "pt-BR"),
    )
    .slice(0, 3);
}

export function deduplicateCompletedOrders(events: CompletionEventMetricInput[]): CompletedOrderMetric[] {
  const uniqueOrders = new Map<string, CompletedOrderMetric>();
  for (const event of events) {
    if (!event.order_id) continue;
    const current = uniqueOrders.get(event.order_id);
    if (!current || event.created_at > current.completed_at) {
      uniqueOrders.set(event.order_id, {
        id: event.order_id,
        total_amount: Number(event.total_amount || 0),
        completed_at: event.created_at,
      });
    }
  }
  return [...uniqueOrders.values()];
}

export const SAVINGS_NOT_MEASURED =
  "Não medida: os pedidos ainda não registram um preço de referência comparável ao valor contratado.";
