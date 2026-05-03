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

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Stats for the month
    const { data: errorStats } = await supabaseClient
      .from('telemetry_query_performance')
      .select('severity')
      .gte('created_at', firstDay);

    const errorCount = errorStats?.filter(s => s.severity === 'error').length || 0;
    const slowCount = errorStats?.filter(s => s.severity === 'slow' || s.severity === 'very_slow').length || 0;

    // SLA performance for Sicoob
    const { data: slaStats } = await supabaseClient
      .from('sicoob_orders')
      .select('sla_status')
      .gte('created_at', firstDay);

    const slaCompliance = slaStats?.length 
      ? (slaStats.filter(s => s.sla_status === 'met').length / slaStats.length) * 100 
      : 100;

    const report = {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      telemetry: {
        total_errors: errorCount,
        total_slow_queries: slowCount,
      },
      business: {
        sla_compliance: `${slaCompliance.toFixed(1)}%`,
        total_orders: slaStats?.length || 0
      },
      status: errorCount > 50 ? 'Critical' : errorCount > 10 ? 'Degraded' : 'Healthy'
    };

    // In a real scenario, this would send an email or store in a 'reports' table
    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
