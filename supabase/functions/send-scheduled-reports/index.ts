import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { requireInternalService } from "../_shared/internal-service-auth.ts";
import { deliverScheduledReport } from "./report-delivery.ts";
import {
  buildScheduledReportIdempotencyKey,
  sendScheduledReportEmail,
} from "../_shared/scheduled-report-email.ts";
import { generateScheduledReportHtml } from "../_shared/scheduled-report-data.ts";
import { calculateNextRun, getAnchorDay } from "./report-types.ts";
import {
  decideScheduledReportEligibility,
} from "./report-eligibility.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH_LIMIT = 20;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "metodo_nao_permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const denied = await requireInternalService(req);
  if (denied) return denied;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);
    const now = new Date();
    const nowIso = now.toISOString();

    const { data: dueReports, error: fetchErr } = await supabase
      .from("scheduled_reports")
      .select("*")
      .eq("is_active", true)
      .lte("next_run_at", nowIso)
      .order("next_run_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (fetchErr) throw fetchErr;
    if (!dueReports || dueReports.length === 0) {
      return new Response(
        JSON.stringify({ message: "No reports due", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const report of dueReports) {
      try {
        // Agendamento de usuário revogado, conta inativada ou e-mail desatualizado
        // ficaria vencido encabeçando o lote para sempre. A decisão é binária:
        // entregar ou desativar. "Pular" devolveria o mesmo registro em toda rodada
        // e, com 20 assim, o 21º válido nunca seria processado.
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", report.user_id)
          .limit(1);
        if (rolesError) throw rolesError;

        // O trigger `trg_validate_report_email` compara `email_to` com o perfil
        // no INSERT/UPDATE. Se o usuário trocou de e-mail depois de agendar, o
        // endereço gravado é o antigo — e a caixa pode ter outro dono. Revalidar
        // aqui impede entregar dados comerciais a terceiros. `is_active` entra
        // porque inativar a conta não remove os papéis do usuário.
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email, is_active")
          .eq("user_id", report.user_id)
          .maybeSingle();
        if (profileError) throw profileError;

        const eligibility = decideScheduledReportEligibility({
          hasRole: Array.isArray(roles) && roles.length > 0,
          profileActive: profile?.is_active ?? null,
          profileEmail: profile?.email ?? null,
          emailTo: report.email_to,
        });
        if (eligibility.action === "deactivate") {
          const { error: deactivateError } = await supabase
            .from("scheduled_reports")
            .update({ is_active: false, updated_at: nowIso })
            .eq("id", report.id);
          if (deactivateError) throw deactivateError;
          results.push({ id: report.id, status: "deactivated", error: eligibility.reason });
          continue;
        }

        const previousRun = report.last_sent_at ? new Date(report.last_sent_at) : null;
        const emailProvider = resendKey
          ? async (html: string) => {
            await sendScheduledReportEmail({
              apiKey: resendKey,
              to: report.email_to,
              subject: `Relatório — ${report.report_name}`,
              html,
              idempotencyKey: buildScheduledReportIdempotencyKey(
                `scheduled-report:${report.id}:${report.next_run_at}`,
              ),
            }, () => Promise.resolve());
          }
          : null;
        const result = await deliverScheduledReport(report, emailProvider, {
          generateData: () =>
            generateScheduledReportHtml(supabase, report, now, previousRun),
          persistSent: async () => {
            const nextRun = calculateNextRun(
              report.frequency,
              now,
              getAnchorDay(report.next_run_at, report.created_at),
            );
            const { data: updatedReport, error } = await supabase
              .from("scheduled_reports")
              .update({
                last_sent_at: nowIso,
                next_run_at: nextRun.toISOString(),
                updated_at: nowIso,
              })
              .eq("id", report.id)
              .select("id")
              .maybeSingle();
            if (error) throw error;
            if (!updatedReport) {
              throw new Error("Agendamento nao encontrado para confirmar o envio.");
            }
          },
        });
        results.push(result);
      } catch (err) {
        console.error("send-scheduled-reports report error:", err);
        results.push({ id: report.id, status: "error", error: "erro_interno" });
      }
    }

    const blocked = results.filter((result) => result.status === "blocked").length;
    return new Response(
      JSON.stringify({ processed: results.length, results }),
      {
        status: blocked > 0 ? 503 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("send-scheduled-reports error:", err);
    return new Response(JSON.stringify({ error: "erro_interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
