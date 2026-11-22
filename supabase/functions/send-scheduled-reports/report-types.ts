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

/** Início da janela coberta pelo relatório, em ISO, a partir de `reference`. */
export function getPeriodStart(frequency: unknown, reference: Date): string {
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

/**
 * Próxima execução, ancorada no relógio de 8h. `setDate`/`setMonth` sobre `now`
 * preservava a hora em que o job rodou, então a cada rodada o horário do
 * relatório andava alguns minutos; ancorar em 8h mantém o agendamento estável.
 */
export function calculateNextRun(frequency: unknown, reference: Date): Date {
  const next = new Date(reference.getTime());
  switch (frequency) {
    case "daily":
      next.setUTCDate(next.getUTCDate() + 1);
      break;
    case "monthly":
      next.setUTCMonth(next.getUTCMonth() + 1);
      break;
    case "weekly":
    default:
      next.setUTCDate(next.getUTCDate() + 7);
      break;
  }
  next.setUTCHours(8, 0, 0, 0);
  return next;
}
