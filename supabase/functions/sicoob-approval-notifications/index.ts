import { withStructuredLogging } from "../_shared/structured-logger.ts";
import { deliverApprovalNotification, type ApprovalDelivery } from "../_shared/approval-delivery.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(withStructuredLogging("sicoob-approval-notifications", async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  if (req.method !== "POST") return json({ error: "metodo_nao_permitido" }, 405);
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return json({ error: "servico_nao_configurado" }, 503);
  if (req.headers.get("Authorization") !== `Bearer ${serviceKey}`) return json({ error: "credencial_de_servico_necessaria" }, 401);
  try {
    let event;
    try { event = await req.json(); } catch { return json({ error: "json_invalido" }, 400); }
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);
    let requestId: string | null = null;
    if (event?.action !== 'process_queue') {
      const payload = event?.payload ?? event;
      if (event?.type !== 'INSERT' || (payload?.schema && payload.schema !== 'public') || payload?.table !== 'sicoob_approval_requests' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload?.record?.id ?? '')) {
        return json({ error: "evento_invalido" }, 400);
      }
      requestId = payload.record.id;
      const { data, error } = await supabase.from('sicoob_approval_requests').select('id').eq('id', requestId).maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: 'solicitacao_nao_encontrada' }, 404);
      const queued = await supabase.rpc('enqueue_sicoob_approval_notifications', { p_request_id: requestId });
      if (queued.error) throw queued.error;
    }
    // Reserva uma mensagem de cada vez: não deixa leases vencerem esperando o lote.
    const startedAt = Date.now();
    for (let index = 0; index < 5 && Date.now() - startedAt < 35_000; index++) {
      const claimed = await supabase.rpc('claim_sicoob_approval_delivery', { p_request_id: requestId });
      if (claimed.error) throw claimed.error;
      if (!Array.isArray(claimed.data)) throw new Error('Contrato de reserva inválido');
      const delivery = claimed.data[0] as ApprovalDelivery | undefined;
      if (!delivery) break;
      const result = await deliverApprovalNotification(delivery);
      const finished = await supabase.rpc('finish_sicoob_approval_delivery', {
        p_id: delivery.id, p_lease_token: delivery.lease_token, p_outcome: result.outcome,
        p_error_code: result.errorCode ?? null, p_provider_id: result.providerId ?? null,
      });
      if (finished.error || finished.data !== true) return json({ error: 'confirmacao_de_entrega_indisponivel' }, 503);
    }
    const { data: summary, error } = await supabase.rpc('get_sicoob_approval_delivery_summary', { p_request_id: requestId });
    if (error || !summary || !['delivered','pending','uncertain','failed','cancelled'].every(key => Number.isInteger(summary[key]) && summary[key] >= 0)) throw new Error('Resumo indisponível');
    const status = summary.uncertain || summary.failed ? 503 : summary.pending ? 202 : 200;
    return json({ success: status === 200, ...summary }, status);
  } catch {
    return json({ error: "notificacao_indisponivel" }, 503);
  }
}));
