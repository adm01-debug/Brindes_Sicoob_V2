// Edge function: favorites-public-react
// Recebe reactions anônimas (👍 ❤️ 🔥 💡) em itens de listas públicas compartilhadas.
// - Sem JWT obrigatório (rota pública).
// - Valida token de lista + expiração.
// - Rate limit 5 req/min/IP via bot_detection_log.
// - Hash do IP (não armazena IP cru).

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  list_token: z.string().regex(/^[a-f0-9]{64}$/, "Invalid token"),
  item_id: z.string().uuid(),
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
  const data = new TextEncoder().encode(ip + "::pgfav-react-salt");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }
  const { list_token, item_id, emoji, anon_id } = parsed.data;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || req.headers.get("cf-connecting-ip")
    || "unknown";
  const userAgent = req.headers.get("user-agent")?.slice(0, 200) ?? null;
  const ipHash = await hashIp(ip);

  // ==== Rate limit: 5 req/min/IP ====
  const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
  const { count: recentCount } = await supabase
    .from("bot_detection_log")
    .select("id", { count: "exact", head: true })
    .eq("ip_address", ip)
    .eq("endpoint", "favorites-public-react")
    .gte("created_at", oneMinAgo);

  if ((recentCount ?? 0) >= 5) {
    await supabase.from("bot_detection_log").insert({
      ip_address: ip,
      endpoint: "favorites-public-react",
      detection_reason: "rate_limit_exceeded",
      blocked: true,
      user_agent: userAgent,
      metadata: { item_id, emoji },
    });
    return jsonResponse({ error: "Rate limit exceeded" }, 429);
  }

  // ==== Valida token + busca list_id ====
  const { data: list, error: listErr } = await supabase
    .from("favorite_lists")
    .select("id, shared_token, shared_expires_at")
    .eq("shared_token", list_token)
    .maybeSingle();

  if (listErr || !list) {
    return jsonResponse({ error: "Invalid or expired link" }, 404);
  }
  if (list.shared_expires_at && new Date(list.shared_expires_at) < new Date()) {
    return jsonResponse({ error: "Link expired" }, 410);
  }

  // ==== Valida que item pertence à lista ====
  const { data: item, error: itemErr } = await supabase
    .from("favorite_items")
    .select("id, list_id")
    .eq("id", item_id)
    .eq("list_id", list.id)
    .maybeSingle();

  if (itemErr || !item) {
    return jsonResponse({ error: "Item not in list" }, 404);
  }

  // ==== Insert (idempotente via UNIQUE constraint) ====
  const { error: insErr } = await supabase
    .from("favorite_item_reactions")
    .upsert(
      {
        item_id,
        list_id: list.id,
        emoji,
        anon_id,
        ip_hash: ipHash,
        user_agent: userAgent,
      },
      { onConflict: "item_id,anon_id,emoji", ignoreDuplicates: true },
    );

  if (insErr) {
    return jsonResponse({ error: "Failed to register reaction", details: insErr.message }, 500);
  }

  // Log para análise (não-bloqueante)
  await supabase.from("bot_detection_log").insert({
    ip_address: ip,
    endpoint: "favorites-public-react",
    detection_reason: "ok",
    blocked: false,
    user_agent: userAgent,
    metadata: { item_id, emoji, list_id: list.id },
  });

  return jsonResponse({ ok: true });
});
