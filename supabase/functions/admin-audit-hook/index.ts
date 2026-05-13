
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";
import { encode as hexEncode } from "https://deno.land/std@0.177.0/encoding/hex.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, traceparent',
}

async function hash(data: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  return new TextDecoder().decode(hexEncode(new Uint8Array(hashBuffer)));
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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const body = await req.json()
    const { event_type, entity_type, entity_id, payload, previous_state, metadata } = body
    const traceparent = req.headers.get('traceparent')

    // Fetch previous log hash for chaining
    const { data: prevLog } = await supabaseClient
      .from('admin_audit_log')
      .select('current_hash')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previous_hash = prevLog?.current_hash || '0'.repeat(64);
    
    // Create new data payload for hashing
    const logData = JSON.stringify({
      user_id: user.id,
      event_type,
      entity_type,
      entity_id,
      payload,
      previous_hash,
      timestamp: new Date().toISOString()
    });

    const current_hash = await hash(logData);

    const { error: insertError } = await supabaseClient
      .from('admin_audit_log')
      .insert({
        user_id: user.id,
        event_type,
        entity_type,
        entity_id,
        new_data: payload,
        old_data: previous_state,
        previous_hash,
        current_hash,
        metadata: {
          ...metadata,
          user_email: user.email,
          traceparent: traceparent,
          source: 'admin-audit-hook-v2',
          ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for'),
          timestamp: new Date().toISOString()
        }
      })

    if (insertError) throw insertError

    return new Response(JSON.stringify({ success: true, hash: current_hash }), {
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
