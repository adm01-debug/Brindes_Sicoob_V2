// supabase/functions/_shared/cors.ts
// Centralized CORS configuration — restrict to known origins

const EXACT_ALLOWED_ORIGINS = new Set([
  'https://vamos-build-awesome.lovable.app',
  'https://id-preview--fe8e4c8b-66f6-4a3b-bbec-0366e2d42e04.lovable.app',
  'https://fe8e4c8b-66f6-4a3b-bbec-0366e2d42e04.lovableproject.com',
  'https://promogifts.com.br',
  'https://www.promogifts.com.br',
  'https://brindes-sicoob-v2.vercel.app',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:3000',
]);

const ALLOWED_ORIGIN_PATTERNS = [
  // Previews gerados pelo projeto Brindes Sicoob na Vercel. O prefixo
  // específico impede que qualquer outro projeto *.vercel.app seja aceito.
  /^https:\/\/brindes-sicoob-v2(?:-[a-z0-9-]+)?\.vercel\.app$/i,
  /^http:\/\/localhost(?::\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/i,
];

const CORS_HEADERS_BASE = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-request-id, x-client-timestamp, traceparent, tracestate, baggage',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function isAllowedOrigin(origin: string): boolean {
  return EXACT_ALLOWED_ORIGINS.has(origin) || ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

/**
 * Returns CORS headers with origin validation.
 * If the request origin is in the allowlist, it is reflected back.
 * Otherwise, the first allowed origin is used (blocks browser requests from unknown origins).
 */
export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('Origin') || req?.headers.get('origin') || '';
  const fallbackOrigin = 'https://vamos-build-awesome.lovable.app';
  const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : fallbackOrigin;

  return {
    ...CORS_HEADERS_BASE,
    'Access-Control-Allow-Origin': allowedOrigin,
  };
}

/**
 * Handle CORS preflight (OPTIONS) request.
 * Returns a Response if it's an OPTIONS request, null otherwise.
 */
export function handleCorsPreflightIfNeeded(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}

/**
 * Legacy wildcard CORS headers for public-facing endpoints
 * (webhooks, public quote views, public kit views).
 * Use sparingly — only for endpoints that MUST be accessible from any origin.
 */
/**
 * @deprecated Use getCorsHeaders(req) instead. Kept only for legacy webhooks
 * that genuinely need wildcard access (e.g., third-party callbacks without Origin header).
 * For all browser-facing endpoints, ALWAYS use getCorsHeaders(req).
 */
export const publicCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-request-id, x-client-timestamp, traceparent, tracestate, baggage',
};
