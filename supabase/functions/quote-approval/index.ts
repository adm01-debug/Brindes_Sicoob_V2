import { withStructuredLogging } from "../_shared/structured-logger.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { RateLimiter, applyRateLimit } from "../_shared/rate-limiter.ts";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

const approvalLimiter = new RateLimiter({ maxRequests: 10, windowMs: 60_000, keyPrefix: 'quote-approval' });

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
    if (action === 'get_data') {
      // Projeção pública sem custos, margens, documentos ou dados internos.
      const { data, error } = await supabase.rpc('get_public_quote_approval', { _token: token });
      if (error) return json({ error: "Consulta indisponível." }, 503);
      if (!data) return json({ error: "Link inválido ou expirado." }, 404);
      return json({ quote: data, approval: { status: data.status, response: data.response, responded_at: data.responded_at }, seller: null });
    }
    if (!['approved', 'rejected'].includes(status) || (notes != null && (typeof notes !== 'string' || notes.length > 2000))) {
      return json({ error: "Resposta inválida." }, 400);
    }
    // A API legada sem assinatura permanece disponível, sem alegar assinatura.
    const result = signer
      ? await supabase.rpc('submit_signed_quote_response', {
        _token: token, _response: status, _signer_name: signer.name,
        _signer_document: signer.document, _signature_data_url: signer.signatureDataUrl,
      })
      : await supabase.rpc('submit_quote_response', { _token: token, _response: status, _response_notes: notes ?? null });
    if (result.error) return json({ error: "Não foi possível registrar a resposta." }, result.error.code === '22023' ? 400 : 503);
    if (result.data !== true) return json({ error: "Link expirado, revogado ou já respondido." }, 409);
    return json({ success: true });
  } catch {
    return json({ error: "Serviço de aprovação indisponível." }, 503);
  }
}));
