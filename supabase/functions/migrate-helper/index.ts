// Mantém uma resposta inerte para substituir a versão antiga ao publicar.
// Este endpoint não deve ler variáveis, credenciais, cabeçalhos ou dados.
Deno.serve(() => new Response(
  JSON.stringify({ error: "endpoint_desativado", message: "Esta ferramenta foi desativada." }),
  { status: 410, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
));
