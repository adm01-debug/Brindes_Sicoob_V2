// Edge function: comparisons-public-react
// Reactions anônimas (👍 ❤️ 🔥 💡) em itens de comparações públicas compartilhadas.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  share_token: z.string().uuid(),
  comparison_id: z.string().uuid(),
  item_index: z.number().int().min(0).max(20),
  emoji: z.enum(["👍", "❤️", "🔥", "💡"]),
  anon_id: z.string().min(8).max(64),
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + "::pgcmp-react-salt");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let raw: unknown;
  try { raw = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }
  const { share_token, comparison_id, item_index, emoji, anon_id } = parsed.data;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || req.headers.get("cf-connecting-ip")
    || "unknown";
  const userAgent = req.headers.get("user-agent")?.slice(0, 200) ?? null;
  const ipHash = await hashIp(ip);

  // Rate limit: 5 req/min/IP
  const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
  const { count: recentCount } = await supabase
    .from("bot_detection_log")
    .select("id", { count: "exact", head: true })
    .eq("ip_address", ip)
    .eq("endpoint", "comparisons-public-react")
    .gte("created_at", oneMinAgo);

  if ((recentCount ?? 0) >= 5) {
    await supabase.from("bot_detection_log").insert({
      ip_address: ip,
      endpoint: "comparisons-public-react",
      detection_reason: "rate_limit_exceeded",
      blocked: true,
      user_agent: userAgent,
      metadata: { comparison_id, item_index, emoji },
    });
    return jsonResponse({ error: "Rate limit exceeded" }, 429);
  }

  // Validar token + comparison
  const { data: comparison, error: cErr } = await supabase
    .from("user_comparisons")
    .select("id, share_token, share_expires_at, is_public")
    .eq("share_token", share_token)
    .eq("id", comparison_id)
    .maybeSingle();

  if (cErr || !comparison || !comparison.is_public) {
    return jsonResponse({ error: "Invalid or expired link" }, 404);
  }
  if (comparison.share_expires_at && new Date(comparison.share_expires_at) < new Date()) {
    return jsonResponse({ error: "Link expired" }, 410);
  }

  const { error: insErr } = await supabase
    .from("comparison_reactions")
    .upsert(
      {
        comparison_id,
        item_index,
        emoji,
        anon_id,
        ip_hash: ipHash,
        user_agent: userAgent,
      },
      { onConflict: "comparison_id,item_index,anon_id,emoji", ignoreDuplicates: true },
    );

  if (insErr) {
    return jsonResponse({ error: "Failed to register reaction", details: insErr.message }, 500);
  }

  await supabase.from("bot_detection_log").insert({
    ip_address: ip,
    endpoint: "comparisons-public-react",
    detection_reason: "ok",
    blocked: false,
    user_agent: userAgent,
    metadata: { comparison_id, item_index, emoji },
  });

  return jsonResponse({ ok: true });
});
