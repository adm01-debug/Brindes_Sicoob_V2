/**
 * Elegibilidade de um relatorio agendado, isolada do Supabase para poder ser
 * testada sem banco. O lote do worker pega os 20 agendamentos vencidos mais
 * antigos: um agendamento que nunca podera ser entregue, se apenas "pulado",
 * volta a ocupar vaga em toda rodada e — com 20 assim — o 21o valido nunca e
 * processado. Por isso a decisao aqui e binaria: entregar ou desativar.
 */

export type ScheduledReportEligibility =
  | { action: "send" }
  | {
    action: "deactivate";
    reason: "acesso_revogado" | "conta_inativa" | "email_desatualizado";
  };

export interface ScheduledReportSignals {
  hasRole: boolean;
  profileActive: boolean | null;
  profileEmail: string | null;
  emailTo: string | null;
}

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function decideScheduledReportEligibility(
  signals: ScheduledReportSignals,
): ScheduledReportEligibility {
  if (!signals.hasRole) {
    return { action: "deactivate", reason: "acesso_revogado" };
  }
  // `profiles.is_active = false` nao remove os papeis do usuario: sem esta
  // checagem a conta inativada continua recebendo relatorio com dados
  // comerciais, porque o worker so olhava `user_roles`.
  if (signals.profileActive === false) {
    return { action: "deactivate", reason: "conta_inativa" };
  }
  // O trigger `trg_validate_report_email` so compara `email_to` com o perfil no
  // INSERT/UPDATE. Quem trocou de e-mail depois de agendar ficou com o endereco
  // antigo gravado — e a caixa pode ter outro dono. Reativar no painel
  // (`useScheduledReports.toggleActive`) reescreve `email_to` com o perfil
  // atual, entao desativar aqui nao deixa o agendamento sem saida.
  const currentEmail = normalizeEmail(signals.profileEmail);
  if (!currentEmail || currentEmail !== normalizeEmail(signals.emailTo)) {
    return { action: "deactivate", reason: "email_desatualizado" };
  }
  return { action: "send" };
}

export interface ScheduledReportBatchItem {
  id: string;
  user_id: string;
  email_to: string;
}

export interface ScheduledReportBatchOutcome {
  id: string;
  status: string;
  error?: string;
}

export interface ScheduledReportBatchDependencies<T extends ScheduledReportBatchItem> {
  decide: (report: T) => Promise<ScheduledReportEligibility>;
  deactivate: (report: T, reason: string) => Promise<void>;
  deliver: (report: T) => Promise<ScheduledReportBatchOutcome>;
}

/**
 * Executa o lote: cada agendamento ou e entregue, ou sai da fila. A falha de um
 * registro nao interrompe os demais — o cron roda de novo em seguida.
 */
export async function runScheduledReportBatch<T extends ScheduledReportBatchItem>(
  reports: readonly T[],
  dependencies: ScheduledReportBatchDependencies<T>,
): Promise<ScheduledReportBatchOutcome[]> {
  const results: ScheduledReportBatchOutcome[] = [];
  for (const report of reports) {
    try {
      const eligibility = await dependencies.decide(report);
      if (eligibility.action === "deactivate") {
        await dependencies.deactivate(report, eligibility.reason);
        results.push({ id: report.id, status: "deactivated", error: eligibility.reason });
        continue;
      }
      results.push(await dependencies.deliver(report));
    } catch (err) {
      console.error("send-scheduled-reports report error:", err);
      results.push({ id: report.id, status: "error", error: "erro_interno" });
    }
  }
  return results;
}