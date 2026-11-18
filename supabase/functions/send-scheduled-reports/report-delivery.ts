export interface ScheduledReportRef {
  id: string;
}

export type EmailProvider = (reportData: string) => Promise<void>;

export interface ReportDeliveryDependencies {
  generateData: () => Promise<string>;
  persistSent: () => Promise<void>;
}

export interface ReportDeliveryResult {
  id: string;
  status: "sent" | "blocked";
  error?: "provedor_email_nao_configurado";
}

export async function deliverScheduledReport(
  report: ScheduledReportRef,
  emailProvider: EmailProvider | null,
  dependencies: ReportDeliveryDependencies,
): Promise<ReportDeliveryResult> {
  if (!emailProvider) {
    return {
      id: report.id,
      status: "blocked",
      error: "provedor_email_nao_configurado",
    };
  }

  const reportData = await dependencies.generateData();
  await emailProvider(reportData);
  await dependencies.persistSent();
  return { id: report.id, status: "sent" };
}
