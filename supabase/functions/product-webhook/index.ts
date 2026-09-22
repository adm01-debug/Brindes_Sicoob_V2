// O catálogo canônico é externo e somente de leitura neste portal.
// Mantém resposta explícita para integrações antigas, sem ler segredos ou gravar produtos.
Deno.serve(() => new Response(JSON.stringify({
  error: "endpoint_desativado",
  message: "A sincronização de produtos por este endpoint foi desativada.",
}), { status: 410, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }));
