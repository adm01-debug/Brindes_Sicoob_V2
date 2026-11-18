export const DEFAULT_TEST_STALE_MINUTES = 45;

export interface IncidentKey {
  key: string;
  title: string;
  message: string;
  type: "warning" | "error";
}

export interface MonitoredConnection {
  id: string;
  name: string;
  type: string;
  last_test_at: string | null;
}

export function buildTestFreshnessIncident(
  connection: MonitoredConnection,
  nowMs = Date.now(),
  staleMinutes = DEFAULT_TEST_STALE_MINUTES,
): IncidentKey | null {
  if (!connection.last_test_at) {
    return {
      key: `connection_test_missing:${connection.id}`,
      title: `Conexão ${connection.type} sem teste`,
      message:
        `${connection.name} ainda não possui teste automático registrado.`,
      type: "warning",
    };
  }

  const testedAtMs = Date.parse(connection.last_test_at);
  const staleAfterMs = Math.max(1, staleMinutes) * 60 * 1000;
  if (!Number.isFinite(testedAtMs) || testedAtMs < nowMs - staleAfterMs) {
    return {
      key: `connection_test_stale:${connection.id}`,
      title: `Teste vencido da conexão ${connection.type}`,
      message: `${connection.name} está sem teste válido há mais de ${
        Math.max(1, staleMinutes)
      } minutos.`,
      type: "warning",
    };
  }

  return null;
}
