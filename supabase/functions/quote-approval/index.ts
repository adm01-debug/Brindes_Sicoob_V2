import { withStructuredLogging } from "../_shared/structured-logger.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { RateLimiter, applyRateLimit } from "../_shared/rate-limiter.ts";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

const approvalLimiter = new RateLimiter({ maxRequests: 10, windowMs: 60_000, keyPrefix: 'quote-approval' });

function requestOrigin(req: Request) {
  const forwarded = req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-real-ip")
    ?? req.headers.get("x-forwarded-for")?.split(",")[0];
  return (forwarded?.trim() || "unknown").slice(0, 64);
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

serve(withStructuredLogging("quote-approval", async (req) => {
  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    const limited = await applyRateLimit(req, approvalLimiter);
    if (limited) return limited;
    let body;
    try { body = await req.json(); } catch { return json({ error: "JSON inválido." }, 400); }
    const { action, token, status, notes, signer } = body ?? {};
    if (typeof token !== 'string' || !token || token.length > 200 || !['get_data', 'respond'].includes(action)) {
      return json({ error: "Requisição inválida." }, 400);
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const origin = requestOrigin(req);
    const identifier = await sha256Hex(`${origin}\0${token}`);
    const { data: rate, error: rateError } = await supabase.rpc("check_rate_limit", {
      _identifier: identifier,
      _endpoint: `quote-approval:${action}`,
      _max_requests: action === "get_data" ? 10 : 5,
      _window_seconds: 60,
      _block_duration_seconds: 300,
    });
    if (rateError || !rate || typeof rate.allowed !== "boolean") {
      return json({ error: "Serviço de proteção indisponível." }, 503);
    }
    if (!rate.allowed) {
      const retryAfter = Math.max(1, Math.min(Number(rate.retry_after_seconds) || 300, 300));
      return new Response(JSON.stringify({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }), {
        status: 429,
        headers: {
          ...getCorsHeaders(req),
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Retry-After": String(retryAfter),
        },
      });
    }
    if (action === 'get_data') {
      // Projeção pública sem custos, margens, documentos ou dados internos.
      const { data, error } = await supabase.rpc('get_public_quote_approval', { _token: token });
      if (error) return json({ error: "Consulta indisponível." }, 503);
      if (!data) return json({ quote: null });
      return json({ quote: data, approval: { status: data.status, response: data.response, responded_at: data.responded_at }, seller: null });
    }
    if (!['approved', 'rejected'].includes(status) || (notes != null && (typeof notes !== 'string' || notes.length > 2000))) {
      return json({ error: "Resposta inválida." }, 400);
    }
    if (!signer || typeof signer !== "object") {
      return json({ error: "A assinatura do responsável é obrigatória." }, 400);
    }
    const userAgent = (req.headers.get("user-agent")?.trim() || "unknown").slice(0, 512);
    const result = await supabase.rpc('submit_signed_quote_response', {
      _token: token, _response: status, _signer_name: signer.name,
      _signer_document: signer.document, _signature_data_url: signer.signatureDataUrl,
      _signer_ip: origin, _signer_user_agent: userAgent,
    });
    if (result.error) return json({ error: "Não foi possível registrar a resposta." }, result.error.code === '22023' ? 400 : 503);
    if (result.data !== true) return json({ error: "Link expirado, revogado ou já respondido." }, 409);
    return json({ success: true });
  } catch {
    return json({ error: "Serviço de aprovação indisponível." }, 503);
  }
}));
