/**
 * Catálogo único dos tipos de relatório agendado. Precisa coincidir com o CHECK
 * de `scheduled_reports.report_type` (20260402110748) e com `ReportType` do
 * frontend (`src/hooks/useScheduledReports.ts`): um tipo existir aqui e não ser
 * tratado fazia o agendamento sair com o entregável genérico, sem os dados que
 * o gestor pediu.
 */
export const SCHEDULED_REPORT_TYPES = [
  "sales",
  "quotes",
  "clients",
  "products",
  "orders",
] as const;

export type ScheduledReportType = typeof SCHEDULED_REPORT_TYPES[number];

export function isScheduledReportType(value: unknown): value is ScheduledReportType {
  return typeof value === "string"
    && (SCHEDULED_REPORT_TYPES as readonly string[]).includes(value);
}

const FREQUENCY_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

/**
 * Início da janela coberta pelo relatório, em ISO.
 *
 * A janela fecha em `reference` e abre onde o ciclo anterior fechou: com uma
 * janela móvel de 30 dias num agendamento mensal, os meses de 31 dias deixavam
 * um dia sem cobertura e os mais curtos se sobrepunham. Sem `previousRun`
 * (primeira execução) a janela volta a ser a distância nominal da frequência.
 */
export function getPeriodStart(
  frequency: unknown,
  reference: Date,
  previousRun: Date | null = null,
): string {
  if (previousRun && !Number.isNaN(previousRun.getTime())
    && previousRun.getTime() < reference.getTime()) {
    return previousRun.toISOString();
  }
  const days = FREQUENCY_DAYS[String(frequency)] ?? 7;
  return new Date(reference.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function getPeriodLabel(frequency: unknown): string {
  switch (frequency) {
    case "daily":
      return "Diário";
    case "weekly":
      return "Semanal";
    case "monthly":
      return "Mensal";
    default:
      return String(frequency ?? "");
  }
}

/** Último dia do mês de `year`/`month` (0-indexado), em UTC. */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Próxima execução, ancorada no relógio de 8h. `setDate`/`setMonth` sobre `now`
 * preservava a hora em que o job rodou, então a cada rodada o horário do
 * relatório andava alguns minutos; ancorar em 8h mantém o agendamento estável.
 *
 * O mensal limita o dia ao último dia válido do mês de destino: avançar de 31
 * de janeiro com `setUTCMonth` caía em 3 de março e pulava fevereiro inteiro.
 */
export function calculateNextRun(frequency: unknown, reference: Date): Date {
  const next = new Date(reference.getTime());
  switch (frequency) {
    case "daily":
      next.setUTCDate(next.getUTCDate() + 1);
      break;
    case "monthly": {
      const day = next.getUTCDate();
      next.setUTCDate(1);
      next.setUTCMonth(next.getUTCMonth() + 1);
      next.setUTCDate(Math.min(day, lastDayOfMonth(next.getUTCFullYear(), next.getUTCMonth())));
      break;
    }
    case "weekly":
    default:
      next.setUTCDate(next.getUTCDate() + 7);
      break;
  }
  next.setUTCHours(8, 0, 0, 0);
  return next;
}
