/**
 * SLA de aprovação (24h) e totais do mês da gestão de compras.
 *
 * Duas regras valem mais do que o cálculo em si:
 *
 * 1. **Só agrega universo completo.** As consultas são limitadas (1.000 linhas)
 *    e passam por RLS. Se o `count` do Postgres não bate com as linhas
 *    devolvidas, a consulta truncou ou a RLS cortou: devolvemos `null` e a tela
 *    mostra "—". Um agregado parcial apresentado como total vira decisão errada.
 * 2. **SLA sai do histórico canônico, não do `created_at` do pedido.** O que
 *    importa é quando o pedido entrou na fila do gestor (`waiting_approval` em
 *    `sicoob_order_history`), não quando foi criado. Sem esse dado para algum
 *    pedido da amostra, o SLA é `null` — não estimamos.
 *
 * Recuperado da PR #119, fechada sem merge.
 */
import type { OrderStatus } from '@/types/sicoob/orders';

export interface SicoobOrderHistoryStatusEvent {
  order_id: string | null;
  new_status: string;
  created_at: string;
}

export interface PurchasingOrder {
  id: string;
  status: OrderStatus;
  total_amount: number | null;
  created_at: string;
}

export type OrderListResult = { data: PurchasingOrder[]; count: number | null } | undefined;

export interface PurchasingMetrics {
  pendingCount: number | null;
  slaPercent: number | null;
  monthlyTotal: number | null;
  approvedTotal: number | null;
}

const APPROVED_STATUSES = new Set<OrderStatus>([
  'confirmed',
  'logistic',
  'in_production',
  'in_separation',
  'in_transit',
  'delivered',
  'completed',
]);

const DIA_EM_MS = 24 * 60 * 60 * 1000;

/** Última entrada canônica de cada pedido na fila de aprovação do gestor. */
export function mapLatestManagerSubmissionTimes(
  events: readonly SicoobOrderHistoryStatusEvent[],
): ReadonlyMap<string, string> {
  const latestByOrder = new Map<string, string>();
  for (const event of events) {
    if (event.new_status !== 'waiting_approval' || !event.order_id) continue;

    const occurredAtMs = Date.parse(event.created_at);
    if (!Number.isFinite(occurredAtMs)) continue;
    const existing = latestByOrder.get(event.order_id);
    if (!existing || occurredAtMs > Date.parse(existing)) {
      latestByOrder.set(event.order_id, event.created_at);
    }
  }
  return latestByOrder;
}

function resultCount(result: OrderListResult): number | null {
  return result ? result.count : null;
}

/** Universo completo: o total do banco bate com as linhas que chegaram. */
function hasCompleteResult(
  result: OrderListResult,
  count: number | null,
): result is NonNullable<OrderListResult> {
  return Boolean(result && count !== null && count === result.data.length);
}

function calculatePendingSla(
  result: OrderListResult,
  count: number | null,
  sentAtByOrderId: ReadonlyMap<string, string> | undefined,
  now: Date,
): number | null {
  if (!hasCompleteResult(result, count) || result.data.length === 0) return null;
  if (!sentAtByOrderId) return null;
  const ontem = now.getTime() - DIA_EM_MS;
  const enviados = result.data.map((order) => sentAtByOrderId.get(order.id));
  if (enviados.some((carimbo) => !carimbo || !Number.isFinite(Date.parse(carimbo)))) return null;
  const dentroDoSla = enviados
    .filter((carimbo): carimbo is string => Boolean(carimbo))
    .filter((carimbo) => Date.parse(carimbo) >= ontem).length;
  return (dentroDoSla / result.data.length) * 100;
}

function sumCompleteOrders(
  result: OrderListResult,
  count: number | null,
  predicate: (order: PurchasingOrder) => boolean,
): number | null {
  if (!hasCompleteResult(result, count)) return null;
  return result.data
    .filter(predicate)
    .reduce((total, order) => total + (Number(order.total_amount) || 0), 0);
}

export function calculatePurchasingMetrics(
  pendingResult: OrderListResult,
  monthlyResult: OrderListResult,
  now = new Date(),
  sentAtByOrderId?: ReadonlyMap<string, string>,
): PurchasingMetrics {
  const pendingCount = resultCount(pendingResult);
  const monthlyCount = resultCount(monthlyResult);

  return {
    pendingCount,
    slaPercent: calculatePendingSla(pendingResult, pendingCount, sentAtByOrderId, now),
    monthlyTotal: sumCompleteOrders(
      monthlyResult,
      monthlyCount,
      (order) => order.status !== 'cancelled',
    ),
    approvedTotal: sumCompleteOrders(monthlyResult, monthlyCount, (order) =>
      APPROVED_STATUSES.has(order.status),
    ),
  };
}

/** "—" quando não há universo completo; nunca um número parcial. */
export function metricLabel(value: number | null, formatter: (value: number) => string): string {
  return value === null ? '—' : formatter(value);
}
