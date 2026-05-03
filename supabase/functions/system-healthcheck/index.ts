import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
}

interface LogContext {
  requestId?: string;
  service?: string;
  operation?: string;
  [key: string]: any;
}

const logStructured = (level: 'info' | 'error' | 'warn', message: string, context: LogContext) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  console.log(JSON.stringify(logEntry));
};

Deno.serve(async (req) => {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const ctx: LogContext = { requestId, service: 'system-healthcheck' };

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    logStructured('info', 'Starting health check', ctx);

    const health: any = {
      timestamp: new Date().toISOString(),
      requestId,
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
      logStructured('error', 'Database health check failed', { ...ctx, error: dbError.message, latency: health.services.database.latency });
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
        logStructured('warn', 'External DB bridge check failed', { ...ctx, error: e.message });
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
        logStructured('warn', 'CRM bridge check failed', { ...ctx, error: e.message });
      }
    } else {
      health.services.bridge_crm.status = 'skipped'
    }

    // Overall status
    const criticalServices = ['database', 'auth'];
    const allCriticalHealthy = criticalServices.every((key) => health.services[key].status === 'healthy');
    const allHealthy = Object.values(health.services).every((s: any) => s.status === 'healthy' || s.status === 'skipped');
    
    health.status = allHealthy ? 'healthy' : (allCriticalHealthy ? 'degraded' : 'down');

    logStructured('info', 'Health check completed', { ...ctx, status: health.status });

    return new Response(JSON.stringify(health), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    logStructured('error', 'Critical error in health check function', { ...ctx, error: error.message });
    return new Response(JSON.stringify({ error: error.message, requestId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
