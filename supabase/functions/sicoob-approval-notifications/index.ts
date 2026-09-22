import { withStructuredLogging } from "../_shared/structured-logger.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(withStructuredLogging("sicoob-approval-notifications", async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") return new Response(JSON.stringify({ error: "metodo_nao_permitido" }), { status: 405, headers: corsHeaders });
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return new Response(JSON.stringify({ error: "servico_nao_configurado" }), { status: 503, headers: corsHeaders });
  if (req.headers.get("Authorization") !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "credencial_de_servico_necessaria" }), { status: 401, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceKey
    );

    let event;
    try { event = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "json_invalido" }), { status: 400, headers: corsHeaders });
    }
    // Aceita o envelope nativo do Database Webhook e o envelope legado.
    const { type } = event ?? {};
    const payload = event?.payload ?? event;

    if (type !== "INSERT" || (payload?.schema && payload.schema !== "public") || payload?.table !== "sicoob_approval_requests" || typeof payload?.record?.id !== "string") {
      return new Response(JSON.stringify({ error: "evento_invalido" }), { status: 400, headers: corsHeaders });
    }
    {
      // Reconsulta o registro: o corpo do webhook não é a fonte dos valores.
      const { data: request, error: requestError } = await supabase
        .from("sicoob_approval_requests").select("requester_id, amount_at_request, request_reason")
        .eq("id", payload.record.id).maybeSingle();
      if (requestError) throw requestError;
      if (!request) return new Response(JSON.stringify({ error: "solicitacao_nao_encontrada" }), { status: 404, headers: corsHeaders });
      
      // Consulta os canais configurados para o PA
      const { data: requester, error: requesterError } = await supabase
        .from("profiles")
        .select("pa_id, full_name")
        .eq("id", request.requester_id)
        .single();

      if (requesterError) throw requesterError;
      if (!requester?.pa_id) return new Response(JSON.stringify({ success: true, skipped: "solicitante_sem_pa", delivered: 0 }), { headers: corsHeaders });

      const { data: settings, error: settingsError } = await supabase
        .from("pa_notification_settings")
        .select("*")
        .eq("pa_id", requester.pa_id)
        .eq("is_active", true);

      if (settingsError) throw settingsError;
      // Não declarar entrega de um canal que ainda não possui implementação.
      // Valida todos os destinos antes do primeiro envio para evitar lote parcial.
      for (const setting of settings || []) {
        if (setting.channel !== 'slack' || !setting.webhook_url) {
          return new Response(JSON.stringify({ error: "canal_nao_implementado_ou_incompleto" }), { status: 501, headers: corsHeaders });
        }
        const destination = new URL(setting.webhook_url);
        if (destination.protocol !== 'https:' || destination.hostname !== 'hooks.slack.com' || !destination.pathname.startsWith('/services/') || destination.username || destination.password || destination.port) {
          return new Response(JSON.stringify({ error: "destino_de_notificacao_invalido" }), { status: 400, headers: corsHeaders });
        }
      }
      for (const setting of settings || []) {
        if (setting.channel === 'slack' && setting.webhook_url) {
          const delivery = await fetch(setting.webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            redirect: "error",
            signal: AbortSignal.timeout(10_000),
            body: JSON.stringify({
              text: `🚨 *Nova Solicitação de Alçada Sicoob*\n\n*Solicitante:* ${requester.full_name}\n*Valor:* R$ ${request.amount_at_request.toLocaleString()}\n*Motivo:* ${request.request_reason}\n\n<${Deno.env.get("PUBLIC_APP_URL")}/admin/sicoob|Acessar Painel de Aprovação>`,
            }),
          });
          if (!delivery.ok) return new Response(JSON.stringify({ error: "entrega_de_notificacao_recusada" }), { status: 502, headers: corsHeaders });
        }
        

      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "notificacao_indisponivel" }), { status: 503, headers: corsHeaders });
  }
}));
