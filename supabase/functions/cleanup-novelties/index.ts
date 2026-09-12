/** Rotina legada desativada: o catálogo externo permite somente consulta. */
Deno.serve(() => new Response(JSON.stringify({
  error: "endpoint_desativado",
  message: "A manutenção de produtos pertence ao sistema de origem do catálogo.",
}), {
  status: 410,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
}));
