import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7"
import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";
import { authorize } from "../_shared/authorize.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "error-monitor", requestId, req });
  log.info("monitor_start");

  const auth = await authorize(req, { requireRole: "supervisor", enforceServerSide: true });
  if (!auth.ok) return log.respond(auth.response);

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

    const { count: errorCount, error: telError } = await supabaseClient
      .from('telemetry_query_performance')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'error')
      .gte('created_at', fiveMinutesAgo);

    if (telError) {
      log.error("telemetry_query_failed", { err: telError.message });
      throw telError;
    }

    const currentCount = errorCount || 0;
    const threshold = 10; 

    if (currentCount >= threshold) {
      log.warn("threshold_exceeded", { count: currentCount, threshold });

      const { data: admins } = await supabaseClient
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (admins) {
        for (const admin of admins) {
          await supabaseClient
            .from('workspace_notifications')
            .insert({
              user_id: admin.user_id,
              title: '🚨 Alerta de Erro Crítico',
              content: `Detectamos ${currentCount} erros nos últimos 5 minutos. Verifique o dashboard de telemetria imediatamente.`,
              type: 'system',
              metadata: { errorCount: currentCount, period: '5m' }
            });
        }
        log.info("alerts_sent", { admin_count: admins.length });
      }
      
      return log.respond(new Response(JSON.stringify({ status: 'alert_sent', errorCount: currentCount }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }));
    }

    log.info("monitor_ok", { errorCount: currentCount });

    return log.respond(new Response(JSON.stringify({ status: 'ok', errorCount: currentCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("monitor_failed", { err: message });
    return log.respond(new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    }));
  }
})
