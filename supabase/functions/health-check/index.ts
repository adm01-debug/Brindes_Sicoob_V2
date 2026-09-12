import { createReadOnlyCatalogFetch } from "../_shared/external-read-only.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const start = Date.now();
  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

  // Check database connectivity
  try {
    const dbStart = Date.now();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );
    const { error } = await supabase.from("profiles").select("id").limit(1);
    checks.database = {
      status: error ? "degraded" : "healthy",
      latency_ms: Date.now() - dbStart,
      ...(error && { error: error.message }),
    };
  } catch (e) {
    checks.database = { status: "unhealthy", error: (e as Error).message };
  }

  // Check external DB connectivity
  try {
    const extStart = Date.now();
    const extUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const extKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");
    
    // Ignore placeholder values
    const isPlaceholder = (val?: string) => !val || val.includes("PLACEHOLDER") || val === "undefined";

    if (extUrl && extKey && !isPlaceholder(extUrl) && !isPlaceholder(extKey)) {
      const extClient = createClient(extUrl, extKey, { global: { fetch: createReadOnlyCatalogFetch() } });
      const { error } = await extClient.from("products").select("id").limit(1);
      checks.external_db = {
        status: error ? "degraded" : "healthy",
        latency_ms: Date.now() - extStart,
        ...(error && { error: error.message }),
      };
    } else {
      checks.external_db = { status: "skipped", error: "No credentials" };
    }
  } catch (e) {
    checks.external_db = { status: "unhealthy", error: (e as Error).message };
  }

  // Overall status
  const allStatuses = Object.values(checks).map(c => c.status);
  const overall = allStatuses.every(s => s === "healthy")
    ? "healthy"
    : allStatuses.some(s => s === "unhealthy")
      ? "unhealthy"
      : "degraded";

  return new Response(
    JSON.stringify({
      status: overall,
      timestamp: new Date().toISOString(),
      total_latency_ms: Date.now() - start,
      checks,
    }),
    {
      status: overall === "unhealthy" ? 503 : 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
