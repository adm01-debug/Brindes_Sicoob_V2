# Paridade GitHub × banco Sicoob — 27/09/2026

Projeto de construção: `cfmzkthhgliqelozlmwu`. Referência GitHub: `main`
`3094cbab22adfa012edcca5278680fa739df46ca` (PR #41 incorporada).

## Resultado observado

- Os arquivos da PR #41 coincidem com a árvore de `main`. A correção local de
  `secretNormalizers.ts` ainda estava fora do GitHub; ela está nesta PR.
- A chave publicável e a chave anônima versionadas em `.env.production`
  responderam HTTP 200 em consulta REST de zero linhas; seus valores não foram
  copiados para esta evidência.
- O OpenAPI do PostgREST não lista `bulk_update_quote_status_atomic`. A RPC da
  migration `20260927110000` não está disponível no banco canônico.
- `get_enum_values('quote_status')` retornou `[]`, enquanto
  `get_enum_values('app_role')` retornou os papéis esperados. O OpenAPI informa
  `quotes.status` como `text`. A migration `20260927110100` pressupunha o enum
  ausente e falharia ao ser aplicada nessa ordem.
- As Edge Functions `webhook-dispatcher`, `webhook-inbound`, `bitrix-sync`,
  `sync-quote-bitrix` e `ownership-audit` responderam HTTP 200 a `OPTIONS`.
  `sicoob-artwork-register`, `sicoob-kit-quote` e `sicoob-reorder` responderam
  HTTP 404. `OPTIONS` prova apenas roteamento, não a versão do código.

## Correção e simulação

A migration `20260927110050` cria o enum legado apenas se ele estiver ausente,
antes de `20260927110100`, sem alterar a coluna `quotes.status`. Em PostgreSQL
17 descartável, a sequência `110000 → 110050 → 110100 → 110200` passou tanto
com `quotes.status text` quanto com `quotes.status quote_status`. Em ambos os
cenários, dois status iniciais diferentes produziram dois históricos corretos,
sem duplicação; aprovação sem alçada e versão obsoleta foram negadas, sem
escrita parcial. As transações de teste foram revertidas.

## Pendências de publicação

O MCP SQL do projeto retornou `Management API 401`; o CLI autenticado retornou
`403` ao listar as funções desse projeto. A tentativa de executar o workflow
`Publicar funções Sicoob` no SHA de `main` falhou antes de iniciar qualquer
etapa: GitHub informou que o orçamento de Actions impede novos jobs
([execução 36329081604](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36329081604)).
Nenhuma migration nem Edge Function foi aplicada por esta auditoria. O ledger,
as definições SQL remotas e a versão exata das funções publicadas continuam sem
verificação administrativa.
