const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "no-store",
};

function json(body: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "HEAD") {
    return json({ error: "metodo_nao_permitido" }, 405);
  }

  // Endpoint anônimo de liveness: não consulta serviços internos nem revela
  // latência, nomes de dependências, configuração ou mensagens de erro.
  return req.method === "HEAD" ? new Response(null, { headers: corsHeaders }) : json({ status: "ok" });
});
