import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { authenticateUser } from "./auth.ts";
import { getCorsHeaders } from "./cors.ts";
import { resolveCredential } from "./credentials.ts";
import { createReadOnlyCatalogFetch } from "./external-read-only.ts";

type CatalogRequestContext =
  | { ok: true; corsHeaders: Record<string, string>; userId: string; response: null }
  | { ok: false; corsHeaders: Record<string, string>; userId: null; response: Response };

/** Aplica CORS e autenticação comum às APIs privadas do catálogo. */
export async function prepareAuthenticatedCatalogRequest(req: Request): Promise<CatalogRequestContext> {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return {
      ok: false,
      corsHeaders,
      userId: null,
      response: new Response(null, { headers: corsHeaders }),
    };
  }

  const authentication = await authenticateUser(req);
  if (!authentication.ok) {
    return {
      ok: false,
      corsHeaders,
      userId: null,
      response: new Response(JSON.stringify({ error: authentication.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  return { ok: true, corsHeaders, userId: authentication.userId, response: null };
}

/**
 * Cria o cliente canônico de consulta ao catálogo externo.
 * As credenciais seguem a SSOT DB-first e o transporte bloqueia qualquer escrita.
 */
export async function createExternalCatalogClient() {
  const [{ value: url }, { value: serviceRoleKey }] = await Promise.all([
    resolveCredential("EXTERNAL_PROMOBRIND_URL"),
    resolveCredential("EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY"),
  ]);

  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    global: { fetch: createReadOnlyCatalogFetch() },
  });
}

export function catalogFunctionErrorResponse(
  error: unknown,
  corsHeaders: Record<string, string>,
  context: string,
): Response {
  const message = error instanceof Error ? error.message : 'Erro desconhecido';
  console.error(`[${context}]`, message);
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
