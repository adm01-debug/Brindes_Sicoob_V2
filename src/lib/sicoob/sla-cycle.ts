type SlaHistoryEvent = { new_status: string; created_at: string };

const SLA_CYCLE_STATUSES = new Set(["waiting_approval", "escalated_to_board"]);

/** Retorna o início do ciclo SLA atualmente ativo; não infere pela criação do pedido. */
export function getSlaCycleStartedAt(
  status: string | null | undefined,
  history: readonly SlaHistoryEvent[] | null | undefined,
): string | undefined {
  if (!status || !SLA_CYCLE_STATUSES.has(status)) return undefined;
  // `find` devolveria o primeiro da ordem recebida: o ciclo certo viria apenas
  // porque `useSicoobOrderHistory` consulta em ordem decrescente. Mudar aquela
  // consulta passaria a medir o SLA do ciclo ERRADO, em silêncio. A escolha do
  // mais recente é feita aqui, não herdada do chamador.
  let maisRecente: string | undefined;
  for (const event of history ?? []) {
    if (event.new_status !== status) continue;
    if (maisRecente === undefined || event.created_at > maisRecente) maisRecente = event.created_at;
  }
  return maisRecente;
}
