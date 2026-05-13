
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, traceparent',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const body = await req.json()
    const { event_type, entity_type, entity_id, payload, previous_state, metadata } = body

    // W3C Traceparent support
    const traceparent = req.headers.get('traceparent')

    const { error: insertError } = await supabaseClient
      .from('admin_audit_log')
      .insert({
        user_id: user.id,
        event_type,
        entity_type,
        entity_id,
        new_data: payload,
        old_data: previous_state,
        metadata: {
          ...metadata,
          user_email: user.email,
          traceparent: traceparent,
          source: 'admin-audit-hook',
          ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for'),
          timestamp: new Date().toISOString()
        }
      })

    if (insertError) throw insertError

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
