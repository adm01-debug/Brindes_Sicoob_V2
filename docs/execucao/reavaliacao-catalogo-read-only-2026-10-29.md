# Reavaliação do catálogo externo somente leitura — 29/10/2026

## Resultado

O código da `main` (`e9d59026793b84fabeaec9da890a068f64d49c3`) já restringe o acesso ao catálogo externo a consultas. O achado histórico D02 de `docs/pesquisa/2026-09-11/anexos/auditoria-tecnica-b.md` não descreve a configuração atual do código. A evidência desta reavaliação é de código e testes locais; **não comprova que a Edge Function publicada tenha o mesmo SHA**.

## Controles confirmados no código

- `supabase/functions/_shared/external-db-config.ts` mantém `products`, `companies` e `views` com a única operação `select`.
- `external-db-bridge/index.ts`, em `handleCrud`, valida o grupo e a permissão antes de resolver o cliente externo; operações de escrita recebem HTTP 403 sem chegar ao banco de catálogo.
- `buildExternalClient` injeta `createReadOnlyCatalogFetch`, que aceita apenas a origem canônica `doufsxqlfjyuvxuezpln.supabase.co`, caminhos REST `/rest/v1/` e métodos `GET`/`HEAD`. Redirecionamentos são recusados.
- A lista de RPCs permitidas não inclui as antigas funções de associação ou preenchimento mutante de áreas de impressão. O cliente chama RPC como leitura (`get: true`).
- A resposta do catálogo passa por `redactInternalCatalogFields`; custo, margem e dados internos de fornecedor são removidos antes da resposta.

## Testes locais desta reavaliação

Na branch de correção de testes, baseada na `main`:

- `node --test tests/scenarios/catalogo-somente-leitura.mjs`: **32/32 passaram**. A suíte cobre operações diretas e em lote, método/transporte, origem, redirecionamento, RPCs e a ordem do gate antes da criação do cliente externo.
- `npm test -- tests/lib/external-db-bridge-telemetry.test.ts --reporter=dot`: **67/67 passaram**. A asserção de permissões agora importa o contrato compartilhado real; não mantém mais uma cópia local que afirmava CRUD para produtos.

## Limites e próximo aceite

- Não foi enviada tentativa de escrita ao banco de produtos, nem alteração remota.
- A consulta administrativa ao corpo da RPC no banco canônico expirou; essa consulta não é necessária para os controles locais acima, mas a definição e as permissões reais das RPCs do catálogo permanecem por confirmar.
- Não foi verificada a versão publicada da Edge Function `external-db-bridge`. O aceite de implantação depende de comparar o SHA/versão do deploy com a fonte e validar a configuração de origem sem executar mutações.

**Estado:** contrato local de leitura confirmado e protegido por testes; deploy remoto ainda sem prova nesta rodada.
