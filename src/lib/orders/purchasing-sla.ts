export interface SicoobOrderHistoryStatusEvent {
  order_id: string | null;
  new_status: string;
  created_at: string;
}

/** Retorna a última entrada canônica na fila de aprovação do gestor. */
export function mapLatestManagerSubmissionTimes(
  events: readonly SicoobOrderHistoryStatusEvent[],
): ReadonlyMap<string, string> {
  const latestByOrder = new Map<string, string>();
  for (const event of events) {
    if (event.new_status !== "waiting_approval" || !event.order_id) continue;

    const occurredAtMs = Date.parse(event.created_at);
    if (!Number.isFinite(occurredAtMs)) continue;
    const existing = latestByOrder.get(event.order_id);
    if (!existing || occurredAtMs > Date.parse(existing)) {
      latestByOrder.set(event.order_id, event.created_at);
    }
  }
  return latestByOrder;
}
