// webhook-inbound: receives external webhooks at /webhook-inbound?slug=<slug>
// Validates HMAC signature using the secret stored in env (referenced by the
// endpoint row), records every event in inbound_webhook_events.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature-256, x-event",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_PAYLOAD_BYTES = 1_048_576;

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return encodeHex(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug")
      || url.pathname.split("/").filter(Boolean).pop()
      || "";
    if (!slug) {
      return new Response(JSON.stringify({ error: "slug ausente" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(slug)) {
      return new Response(JSON.stringify({ error: "slug inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_PAYLOAD_BYTES) {
      return new Response(JSON.stringify({ error: "payload excede o limite de 1 MiB" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: endpoint, error: endpointError } = await supabase
      .from("inbound_webhook_endpoints")
      .select("*")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();
    if (endpointError) throw endpointError;
    if (!endpoint) {
      return new Response(JSON.stringify({ error: "endpoint não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_PAYLOAD_BYTES) {
      return new Response(JSON.stringify({ error: "payload excede o limite de 1 MiB" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const signatureHeader = req.headers.get("x-signature-256")
      || req.headers.get("x-webhook-signature")
      || "";
    const eventType = req.headers.get("x-event") || "unknown";
    const sourceIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

    const secret = Deno.env.get(endpoint.hmac_secret_ref);
    let signatureValid = false;
    if (secret) {
      const expected = "sha256=" + await hmacSign(rawBody, secret);
      const provided = signatureHeader.startsWith("sha256=") ? signatureHeader : "sha256=" + signatureHeader;
      signatureValid = timingSafeEqual(expected, provided);
    }
    const eventAllowed = endpoint.allowed_events.length === 0 || endpoint.allowed_events.includes(eventType);
    const accepted = signatureValid && eventAllowed;

    let parsedPayload: unknown = null;
    try { parsedPayload = JSON.parse(rawBody); } catch { /* keep null */ }

    const { error: eventError } = await supabase.from("inbound_webhook_events").insert({
      endpoint_id: endpoint.id,
      event_type: eventType,
      payload: parsedPayload,
      signature_valid: signatureValid,
      processed: accepted,
      source_ip: sourceIp,
      error: !signatureValid
        ? "HMAC inválido ou ausente"
        : eventAllowed ? null : "Evento não permitido para este endpoint",
    });
    // Não confirme o recebimento ao emissor se o evento não foi duravelmente registrado.
    // Isso permite que o mecanismo de retry do emissor recupere a entrega.
    if (eventError) throw eventError;

    const { error: metricsError } = await supabase.from("inbound_webhook_endpoints").update({
      last_received_at: new Date().toISOString(),
      total_received: (endpoint.total_received ?? 0) + 1,
      total_invalid: (endpoint.total_invalid ?? 0) + (accepted ? 0 : 1),
    }).eq("id", endpoint.id);
    if (metricsError) console.error("Falha ao atualizar métricas do webhook:", metricsError.message);

    if (!signatureValid) {
      return new Response(JSON.stringify({ error: "Assinatura inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!eventAllowed) {
      return new Response(JSON.stringify({ error: "Evento não permitido" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
