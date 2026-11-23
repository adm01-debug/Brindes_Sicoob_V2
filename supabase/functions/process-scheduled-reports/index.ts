import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { requireInternalService } from "../_shared/internal-service-auth.ts";
import {
  buildScheduledReportIdempotencyKey,
  sendScheduledReportEmail,
} from "../_shared/scheduled-report-email.ts";
import { generateScheduledReportHtml } from "../_shared/scheduled-report-data.ts";
import { calculateNextRun, getAnchorDay } from "../send-scheduled-reports/report-types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_LIMIT = 50;

Deno.serve(async (req) => {
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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date();

    // `limit` evita que a rodada do cron cresça sem teto quando muitos
    // agendamentos vencem no mesmo minuto; o que sobrar cai na próxima rodada.
    const { data: dueReports, error: fetchError } = await supabase
      .from("scheduled_reports")
      .select("*")
      .eq("is_active", true)
      .lte("next_run_at", now.toISOString())
      .order("next_run_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (fetchError) throw fetchError;

    if (!dueReports || dueReports.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "Nenhum relatório pendente" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const report of dueReports) {
      try {
        // Agendamento de usuário revogado ficaria vencido encabeçando o lote
        // para sempre. Desativar tira ele da fila sem travar os demais.
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", report.user_id)
          .limit(1);
        if (rolesError) throw rolesError;
        if (!Array.isArray(roles) || roles.length === 0) {
          const { error: deactivateError } = await supabase
            .from("scheduled_reports")
            .update({ is_active: false, updated_at: now.toISOString() })
            .eq("id", report.id);
          if (deactivateError) throw deactivateError;
          results.push({ id: report.id, status: "deactivated", error: "acesso_revogado" });
          continue;
        }

        if (!resendKey) {
          // Sem provedor não há envio: marca bloqueado e NÃO avança
          // `next_run_at`, para o relatório sair assim que a chave existir.
          results.push({ id: report.id, status: "blocked", error: "provedor_email_nao_configurado" });
          continue;
        }

        // O trigger `trg_validate_report_email` só valida no INSERT/UPDATE: se o
        // usuário trocou de e-mail depois de agendar, `email_to` está velho e a
        // caixa pode pertencer a outra pessoa. Revalidar contra o perfil atual.
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", report.user_id)
          .maybeSingle();
        if (profileError) throw profileError;
        const currentEmail = String(profile?.email ?? "").trim().toLowerCase();
        if (!currentEmail || currentEmail !== String(report.email_to).trim().toLowerCase()) {
          results.push({ id: report.id, status: "skipped", error: "email_desatualizado" });
          continue;
        }

        // A janela fecha onde o ciclo anterior fechou: uma janela móvel deixava
        // um dia descoberto nos meses de 31 dias.
        const previousRun = report.last_sent_at ? new Date(report.last_sent_at) : null;
        const html = await generateScheduledReportHtml(supabase, report, now, previousRun);
        await sendScheduledReportEmail({
          apiKey: resendKey,
          to: report.email_to,
          subject: `Relatório — ${report.report_name}`,
          html,
          idempotencyKey: buildScheduledReportIdempotencyKey(
            `scheduled-report:${report.id}:${report.next_run_at}`,
          ),
        }, async () => {
          const nextRun = calculateNextRun(
            report.frequency,
            now,
            getAnchorDay(report.next_run_at, report.created_at),
          );
          const { data: updatedReport, error: updateError } = await supabase
            .from("scheduled_reports")
            .update({
              last_sent_at: now.toISOString(),
              next_run_at: nextRun.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("id", report.id)
            .select("id")
            .maybeSingle();

          if (updateError) throw updateError;
          if (!updatedReport) throw new Error("Agendamento não encontrado para confirmar o envio.");
        });

        results.push({ id: report.id, status: "sent" });
      } catch (err) {
        console.error("process-scheduled-reports report error:", err);
        results.push({ id: report.id, status: "error", error: "erro_interno" });
      }
    }

    const blocked = results.filter((result) => result.status === "blocked").length;
    return new Response(
      JSON.stringify({ processed: results.length, results }),
      {
        status: blocked > 0 && blocked === results.length ? 503 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("process-scheduled-reports error:", err);
    return new Response(JSON.stringify({ error: "erro_interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
