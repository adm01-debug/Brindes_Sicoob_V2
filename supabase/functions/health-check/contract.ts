import { getCorsHeaders } from "../_shared/cors.ts";

/** Resposta pública e estável que confirma somente que a Edge Function está ativa. */
export function createLivenessResponse(req: Request): Response {
  const headers = {
    ...getCorsHeaders(req),
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "GET") {
    return new Response(null, {
      status: 405,
      headers: { ...headers, Allow: "GET, OPTIONS" },
    });
  }

  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
