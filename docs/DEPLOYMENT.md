# Publicação e migrações

**Revisado em:** 30/10/2026. O projeto está em construção; este documento não certifica publicação em produção.

## Frontend

1. Instale dependências reproduzíveis com `npm ci`.
2. Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_PROJECT_ID` no provedor de hospedagem do ambiente de destino. Não inclua chaves secretas em variáveis `VITE_*` nem versione `.env.production`.
3. Execute `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`.
4. Publique somente o artefato do SHA aprovado pela PR e pelo fluxo de release do ambiente.

## Edge Functions Sicoob

O deploy remoto é manual e restrito ao environment `construction`, à branch `main` e ao workflow **Publicar funções Sicoob**. Antes de publicar, confirme no GitHub que `CONSTRUCTION_SUPABASE_PROJECT_REF` aponta para um projeto isolado de construção. O workflow recusa o projeto canônico `cfmzkthhgliqelozlmwu`.

1. Abra **Actions → Publicar funções Sicoob → Run workflow** na branch `main`.
2. Digite `PUBLICAR` no campo de confirmação.
3. Verifique que o job passou pela validação do project ref e pela checagem das versões publicadas.
4. Registre URL do run, SHA, projeto de construção e resultado em `RELATORIO_CI.md`.

Não substitua esse fluxo por `supabase functions deploy` manual nem por um project ref copiado de documentação antiga.

## Migrations Sicoob

Use somente **Actions → Aplicar migrations Sicoob**, na branch protegida `main`, após revisão do SQL e confirmação do environment `construction`. O workflow executa preflight, aplica somente a allowlist versionada e valida o ledger e os contratos remotos.

Não execute `supabase db push --linked`, `--include-all`, SQL manual ou os lotes de setembro descritos em registros históricos. O ledger histórico ainda exige reconciliação; a existência de um arquivo local não comprova aplicação remota. A migration `20261030190000_bind_sicoob_scan_evidence_hash.sql` está versionada no candidato da PR #176 e validada em PostgreSQL descartável, mas não foi aplicada a nenhum Supabase remoto.

## Estado e limites

- A PR #176 permanece aberta e bloqueada por configuração ausente de E2E e falha do revisor Copilot gerenciado; consulte [PENDENCIAS.md](../PENDENCIAS.md) e [RELATORIO_CI.md](../RELATORIO_CI.md) para runs atuais.
- Nenhum deploy de funções ou migration no Supabase remoto foi executado nesta rodada.
- Piloto comercial, compra real, restore medido e estabilidade operacional exigem evidência e aceite próprios; build verde não os substitui.
