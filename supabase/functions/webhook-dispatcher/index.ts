// webhook-dispatcher: dispatches an event to all active outbound_webhooks
// subscribed to that event. HMAC signs payload with webhook secret. Retries
// with backoff and logs each attempt to webhook_deliveries.
// Called publicly from DB triggers (no JWT) — but only acts on events
// declared in outbound_webhooks rows that the admin created.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { authorize } from "../_shared/authorize.ts";
import { requireInternalService } from "../_shared/internal-service-auth.ts";

const BodySchema = z.object({
  event: z.string().min(1),
  payload: z.unknown().optional(),
  // Replay mode: re-deliver a single failed delivery by id
  replay_delivery_id: z.string().uuid().optional(),
  // Test mode (Onda 13 #9): dispatch to a specific webhook, no metrics, no breaker, no DB log
  test_mode: z.boolean().optional(),
  test_webhook_id: z.string().uuid().optional(),
});

// Circuit breaker: 5 falhas consecutivas → desativa o webhook
const CIRCUIT_BREAKER_THRESHOLD = 5;

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return encodeHex(new Uint8Array(sig));
}

async function payloadHash(payload: string): Promise<string> {
  const data = new TextEncoder().encode(payload);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return encodeHex(new Uint8Array(hash));
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let { event, payload } = parsed.data;
    const { replay_delivery_id, test_mode, test_webhook_id } = parsed.data;

    // Disparos operacionais são exclusivos de cron/Edge por segredo dedicado.
    // Teste e replay podem causar efeitos externos e por isso exigem supervisor.
    if (test_mode || replay_delivery_id) {
      const auth = await authorize(req, { requireRole: "supervisor", enforceServerSide: true });
      if (!auth.ok) return auth.response;
    } else {
      const denied = await requireInternalService(req, "WEBHOOK_DISPATCHER_SECRET");
      if (denied) return denied;
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Test mode (Onda 13 #9): single-shot, no retries, no DB write, no breaker
    if (test_mode) {
      if (!test_webhook_id) {
        return new Response(JSON.stringify({ error: "test_webhook_id obrigatório em test_mode" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: hook, error: hookErr } = await supabase
        .from("outbound_webhooks")
        .select("id, name, url, secret_ref")
        .eq("id", test_webhook_id)
        .maybeSingle();
      if (hookErr || !hook) {
        return new Response(JSON.stringify({ error: "Webhook não encontrado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const bodyJson = JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        test: true,
        data: payload ?? null,
      });
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "PromoGifts-Webhooks/1.0 (test)",
        "X-Event": event,
        "X-Webhook-Id": hook.id,
        "X-Test-Mode": "1",
      };
      const secret = hook.secret_ref ? Deno.env.get(hook.secret_ref) : null;
      if (secret) headers["X-Signature-256"] = "sha256=" + await hmacSign(bodyJson, secret);
      const start = Date.now();
      try {
        const res = await fetch(hook.url, { method: "POST", headers, body: bodyJson });
        const respText = (await res.text()).slice(0, 4000);
        return new Response(JSON.stringify({
          ok: true,
          test_mode: true,
          webhook_id: hook.id,
          status_code: res.status,
          latency_ms: Date.now() - start,
          response_body: respText,
          success: res.ok,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (err) {
        return new Response(JSON.stringify({
          ok: true,
          test_mode: true,
          webhook_id: hook.id,
          status_code: null,
          latency_ms: Date.now() - start,
          error: err instanceof Error ? err.message : "Erro de rede",
          success: false,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Replay mode: load the original delivery and re-target only its webhook
    let replayHookId: string | null = null;
    if (replay_delivery_id) {
      const { data: orig, error: origErr } = await supabase
        .from("webhook_deliveries")
        .select("webhook_id, event, payload")
        .eq("id", replay_delivery_id)
        .maybeSingle();
      if (origErr || !orig) {
        return new Response(JSON.stringify({ error: "Delivery não encontrada" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      event = orig.event;
      payload = orig.payload;
      replayHookId = orig.webhook_id;
    }

    let hooksQuery = supabase
      .from("outbound_webhooks")
      .select("*")
      .contains("events", [event]);
    if (replayHookId) {
      hooksQuery = hooksQuery.eq("id", replayHookId); // replay ignora active flag
    } else {
      hooksQuery = hooksQuery.eq("active", true);
    }
    const { data: hooks, error } = await hooksQuery;
    if (error) throw error;

    if (!hooks || hooks.length === 0) {
      return new Response(JSON.stringify({ ok: true, dispatched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bodyJson = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload ?? null,
    });
    const phash = await payloadHash(bodyJson);
    const results: Array<Record<string, unknown>> = [];

    for (const hook of hooks) {
      const policy = hook.retry_policy ?? { max_attempts: 3, backoff_seconds: [5, 30, 120] };
      const max = Math.max(1, Math.min(5, Number(policy.max_attempts ?? 3)));
      const backoff = Array.isArray(policy.backoff_seconds) ? policy.backoff_seconds : [5, 30, 120];
      let success = false;
      let attempt = 0;

      while (attempt < max && !success) {
        attempt++;
        try {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "User-Agent": "PromoGifts-Webhooks/1.0",
            "X-Event": event,
            "X-Webhook-Id": hook.id,
            "X-Delivery-Attempt": String(attempt),
          };
          const secret = hook.secret_ref ? Deno.env.get(hook.secret_ref) : null;
          if (secret) headers["X-Signature-256"] = "sha256=" + await hmacSign(bodyJson, secret);

          const res = await fetch(hook.url, { method: "POST", headers, body: bodyJson });
          const respText = (await res.text()).slice(0, 4000);

          await supabase.from("webhook_deliveries").insert({
            webhook_id: hook.id,
            event,
            payload: payload ?? null,
            payload_hash: phash,
            status_code: res.status,
            response_body_truncated: respText,
            attempt,
            success: res.ok,
            error_message: res.ok ? null : `HTTP ${res.status}`,
          });

          if (res.ok) {
            success = true;
            await supabase.from("outbound_webhooks").update({
              last_triggered_at: new Date().toISOString(),
              total_success: (hook.total_success ?? 0) + 1,
              consecutive_failures: 0,
            }).eq("id", hook.id);
            results.push({ webhook_id: hook.id, status: "success", attempt });
          } else if (attempt < max) {
            const delay = (backoff[attempt - 1] ?? backoff[backoff.length - 1] ?? 30) * 1000;
            await new Promise((r) => setTimeout(r, delay));
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          await supabase.from("webhook_deliveries").insert({
            webhook_id: hook.id, event, payload: payload ?? null, payload_hash: phash,
            status_code: null, response_body_truncated: msg.slice(0, 4000),
            attempt, success: false, error_message: msg,
          });
          if (attempt < max) {
            const delay = (backoff[attempt - 1] ?? 30) * 1000;
            await new Promise((r) => setTimeout(r, delay));
          }
        }
      }

      if (!success) {
        const newConsecutive = (hook.consecutive_failures ?? 0) + 1;
        const shouldAutoDisable = !replayHookId && newConsecutive >= CIRCUIT_BREAKER_THRESHOLD && hook.active;
        const updatePayload: Record<string, unknown> = {
          total_failure: (hook.total_failure ?? 0) + 1,
          consecutive_failures: newConsecutive,
        };
        if (shouldAutoDisable) {
          updatePayload.active = false;
          updatePayload.auto_disabled_at = new Date().toISOString();
          updatePayload.auto_disabled_reason = `${newConsecutive} falhas consecutivas (circuit breaker)`;
        }
        await supabase.from("outbound_webhooks").update(updatePayload).eq("id", hook.id);
        results.push({
          webhook_id: hook.id,
          status: "failed",
          attempts: attempt,
          consecutive_failures: newConsecutive,
          auto_disabled: shouldAutoDisable,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, dispatched: hooks.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
