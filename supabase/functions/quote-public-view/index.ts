import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { withStructuredLogging } from "../_shared/structured-logger.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

/**
 * Compatibilidade encerrada.
 *
 * O fluxo antigo gravava a resposta em bancos distintos, sem transação e sem
 * verificar os erros das escritas. As rotas públicas usam agora o contrato
 * local atômico (`get_public_quote_approval`/`submit_signed_quote_response`).
 */
serve(withStructuredLogging("quote-public-view", async (req) => {
  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;

  return new Response(JSON.stringify({
    error: "endpoint_descontinuado",
    message: "Atualize a página para usar o fluxo seguro de aprovação.",
  }), {
    status: 410,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}));
