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
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

    // Query telemetry for recent errors
    const { data: recentErrors, error: telError } = await supabaseClient
      .from('telemetry_query_performance')
      .select('count', { count: 'exact', head: true })
      .eq('severity', 'error')
      .gte('created_at', fiveMinutesAgo);

    const errorCount = recentErrors || 0;
    const threshold = 10; // 10 errors in 5 minutes

    if (errorCount >= threshold) {
      // Send alert to admin via workspace_notifications
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
              content: `Detectamos ${errorCount} erros nos últimos 5 minutos. Verifique o dashboard de telemetria imediatamente.`,
              type: 'system',
              metadata: { errorCount, period: '5m' }
            });
        }
      }
      
      return new Response(JSON.stringify({ status: 'alert_sent', errorCount }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ status: 'ok', errorCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
