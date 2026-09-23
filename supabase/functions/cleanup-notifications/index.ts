import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { requireInternalService } from "../_shared/internal-service-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'metodo_nao_permitido' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const denied = await requireInternalService(req);
  if (denied) return denied;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stats = {
      deleted_read_old: 0,
    };

    // Delete read notifications older than 90 days using the existing RPC
    const { error: cleanupError } = await supabase.rpc('cleanup_old_notifications');

    if (cleanupError) {
      console.warn('Cleanup RPC warning:', cleanupError.message);
    } else {
      stats.deleted_read_old = -1; // RPC doesn't return count
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        timestamp: new Date().toISOString(),
        stats 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ error: 'erro_interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
