import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  try {
    const report: any = { blocks: [], timestamp: new Date().toISOString() };

    // 1. Check for 500 errors in query_telemetry
    const { count: err500 } = await supabase
      .from('query_telemetry')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'critical')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if (err500 && err500 > 0) {
      report.blocks.push({ type: "CRITICAL_ERRORS", count: err500, message: "Erros críticos detectados nos últimos 5 min" });
    }

    // 2. Check for RLS leakage (telemetry marked as is_rls_violation)
    const { count: rlsLeaks } = await supabase
      .from('query_telemetry')
      .select('*', { count: 'exact', head: true })
      .eq('is_rls_violation', true)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if (rlsLeaks && rlsLeaks > 0) {
      report.blocks.push({ type: "RLS_VIOLATION", count: rlsLeaks, message: "Violações de RLS (possível vazamento) detectadas" });
    }

    // 3. Check if telemetry is offline
    const { data: lastTelemetry } = await supabase
      .from('query_telemetry')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastTelemetry || (Date.now() - new Date(lastTelemetry.created_at).getTime() > 10 * 60 * 1000)) {
      report.blocks.push({ type: "TELEMETRY_OFFLINE", message: "Telemetria sem novos registros há mais de 10 minutos" });
    }

    // Return current status
    return new Response(JSON.stringify(report), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
