/** A assinatura pública usa exclusivamente um segredo próprio, separado da service role. */
export function resolveBiShareSecret(env: {
  BI_SHARE_SECRET?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}): string | null {
  const dedicatedSecret = env.BI_SHARE_SECRET?.trim();
  return dedicatedSecret || null;
}

export function createBiShareUnavailableResponse(headers: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: "Service unavailable" }), {
    status: 503,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
