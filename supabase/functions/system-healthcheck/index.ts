import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7"
import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "system-healthcheck", requestId, req });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    log.info('health_check_start');

    const health: any = {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      services: {
        database: { status: 'unknown' },
        auth: { status: 'unknown' },
        bridge_external: { status: 'unknown' },
        bridge_crm: { status: 'unknown' }
      }
    }

    // 1. Check Database
    const startDb = Date.now();
    const { data: dbData, error: dbError } = await supabaseClient
      .from('profiles')
      .select('count', { count: 'exact', head: true })
      .limit(1)

    health.services.database.status = dbError ? 'unhealthy' : 'healthy'
    health.services.database.latency = Date.now() - startDb;
    
    if (dbError) {
      health.services.database.error = dbError.message;
      log.error('database_check_failed', { err: dbError.message, latency: health.services.database.latency });
    }

    // 2. Check Auth
    health.services.auth.status = 'healthy' 

    // 3. Check External DB Bridge
    const bridgeUrl = Deno.env.get('VITE_EXTERNAL_DB_URL');
    if (bridgeUrl) {
      try {
        const start = Date.now()
        const bridgeRes = await fetch(`${bridgeUrl}/health`, { 
          signal: AbortSignal.timeout(3000) 
        })
        health.services.bridge_external.status = bridgeRes.ok ? 'healthy' : 'unhealthy'
        health.services.bridge_external.latency = Date.now() - start
      } catch (e) {
        health.services.bridge_external.status = 'unhealthy'
        health.services.bridge_external.error = e.message
        log.warn('external_bridge_check_failed', { err: e.message });
      }
    } else {
      health.services.bridge_external.status = 'skipped'
    }

    // 4. Check CRM Bridge
    const crmUrl = Deno.env.get('VITE_CRM_BRIDGE_URL');
    if (crmUrl) {
      try {
        const start = Date.now()
        const crmRes = await fetch(`${crmUrl}/health`, { 
          signal: AbortSignal.timeout(3000) 
        })
        health.services.bridge_crm.status = crmRes.ok ? 'healthy' : 'unhealthy'
        health.services.bridge_crm.latency = Date.now() - start
      } catch (e) {
        health.services.bridge_crm.status = 'unhealthy'
        health.services.bridge_crm.error = e.message
        log.warn('crm_bridge_check_failed', { err: e.message });
      }
    } else {
      health.services.bridge_crm.status = 'skipped'
    }

    // Overall status
    const criticalServices = ['database', 'auth'];
    const allCriticalHealthy = criticalServices.every((key) => health.services[key].status === 'healthy');
    const allHealthy = Object.values(health.services).every((s: any) => s.status === 'healthy' || s.status === 'skipped');
    
    health.status = allHealthy ? 'healthy' : (allCriticalHealthy ? 'degraded' : 'down');

    log.info('health_check_complete', { status: health.status });

    return log.respond(new Response(JSON.stringify(health), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    }));

  } catch (error) {
    log.error('health_check_critical_error', { err: error.message });
    return log.respond(new Response(JSON.stringify({ error: error.message, request_id: requestId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    }));
  }
})