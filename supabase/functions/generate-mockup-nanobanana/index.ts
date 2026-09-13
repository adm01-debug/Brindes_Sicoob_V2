/**
 * Rotina legada desativada: a geração de mockups por IA foi consolidada em
 * `generate-mockup` (Nano Banana ficou sem chamador em src/ após a migração).
 * Mantido como stub 410 para não deixar a rota virar 404 silencioso.
 */
Deno.serve(() => new Response(JSON.stringify({
  error: "endpoint_desativado",
  message: "Use a function generate-mockup para geração de mockups.",
}), {
  status: 410,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
}));
