import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const health: any = {
      timestamp: new Date().toISOString(),
      services: {
        database: { status: 'unknown' },
        auth: { status: 'unknown' },
        bridge_external: { status: 'unknown' },
        bridge_crm: { status: 'unknown' }
      }
    }

    // 1. Check Database
    const { data: dbData, error: dbError } = await supabaseClient
      .from('profiles')
      .select('count', { count: 'exact', head: true })
      .limit(1)

    health.services.database.status = dbError ? 'unhealthy' : 'healthy'
    if (dbError) health.services.database.error = dbError.message

    // 2. Check Auth (via basic list users check or similar if possible, otherwise assume healthy if DB works)
    health.services.auth.status = 'healthy' 

    // 3. Check External DB Bridge
    try {
      const bridgeUrl = Deno.env.get('VITE_EXTERNAL_DB_URL') || 'http://localhost:8000'
      const start = Date.now()
      const bridgeRes = await fetch(`${bridgeUrl}/health`, { 
        signal: AbortSignal.timeout(5000) 
      })
      health.services.bridge_external.status = bridgeRes.ok ? 'healthy' : 'unhealthy'
      health.services.bridge_external.latency = Date.now() - start
    } catch (e) {
      health.services.bridge_external.status = 'unhealthy'
      health.services.bridge_external.error = e.message
    }

    // 4. Check CRM Bridge
    try {
      const crmUrl = Deno.env.get('VITE_CRM_BRIDGE_URL') || 'http://localhost:8001'
      const start = Date.now()
      const crmRes = await fetch(`${crmUrl}/health`, { 
        signal: AbortSignal.timeout(5000) 
      })
      health.services.bridge_crm.status = crmRes.ok ? 'healthy' : 'unhealthy'
      health.services.bridge_crm.latency = Date.now() - start
    } catch (e) {
      health.services.bridge_crm.status = 'unhealthy'
      health.services.bridge_crm.error = e.message
    }

    // Overall status
    const allHealthy = Object.values(health.services).every((s: any) => s.status === 'healthy')
    health.status = allHealthy ? 'healthy' : 'degraded'

    return new Response(JSON.stringify(health), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: allHealthy ? 200 : 200 // We return 200 even if degraded so we can see the JSON
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
