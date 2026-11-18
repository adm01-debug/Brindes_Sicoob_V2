type SlaHistoryEvent = { new_status: string; created_at: string };

const SLA_CYCLE_STATUSES = new Set(["waiting_approval", "escalated_to_board"]);

/** Retorna o início do ciclo SLA atualmente ativo; não infere pela criação do pedido. */
export function getSlaCycleStartedAt(
  status: string | null | undefined,
  history: readonly SlaHistoryEvent[] | null | undefined,
): string | undefined {
  if (!status || !SLA_CYCLE_STATUSES.has(status)) return undefined;
  return history?.find((event) => event.new_status === status)?.created_at;
}
