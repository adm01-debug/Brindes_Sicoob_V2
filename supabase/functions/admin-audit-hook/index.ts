import { withStructuredLogging } from "../_shared/structured-logger.ts";

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

serve(withStructuredLogging("admin-audit-hook", async (req) => {
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

    // admin_audit_log real não tem event_type/entity_type/entity_id/new_data/
    // old_data/metadata como colunas soltas (esse INSERT falhava sempre,
    // silenciosamente, no cliente) — schema real: action, resource_type,
    // resource_id, ip_address, source (colunas) + details (JSONB), igual ao
    // padrão já usado em useDiscountApproval.ts e em _shared/audit-log.ts.
    const { error: insertError } = await supabaseClient
      .from('admin_audit_log')
      .insert({
        user_id: user.id,
        action: event_type,
        resource_type: entity_type,
        resource_id: entity_id,
        previous_hash,
        current_hash,
        ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for'),
        source: 'admin-audit-hook-v2',
        details: {
          new_data: payload,
          old_data: previous_state,
          metadata: {
            ...metadata,
            user_email: user.email,
            traceparent: traceparent,
            timestamp: new Date().toISOString()
          }
        }
      })

    if (insertError) throw insertError

    return new Response(JSON.stringify({ success: true, hash: current_hash }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[admin-audit-hook] request_failed', message);
    return new Response(JSON.stringify({ error: 'request_failed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
}))
