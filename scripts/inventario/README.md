# inventario — estado real do banco e do código

**O que faz:** escreve `inventario/estado/*.json`, a fonte que um agente consulta **antes** de
planejar qualquer tarefa, para não redescobrir o que já está medido. Tudo sai de comando (SQL de
leitura, Management API e varredura do código); nada é escrito à mão.

| Script | Saída | O que mede |
|---|---|---|
| `gerar-banco.mjs` + `banco.sql` | `inventario/estado/banco.json` | tabelas do `public` (RLS, policies, triggers, linhas, bytes, citada em função/view), resumo (postgres, funções, views, ledger de migrations), `cron` (jobs, agenda, falhas em 7d, histórico), `operacao.filas` (entregas/notificações por status), edge functions publicadas × no repo, **tabelas órfãs** e **alertas** |
| `gerar-rotas.mjs` | `inventario/estado/rotas.json` | rotas de `src/routes/config/*.ts`, guardas com que o `src/App.tsx` as monta, item de menu do `SidebarReorganized`, e para cada página o fecho de imports: hooks, tabelas, RPCs, edges e buckets. `problemas`: menu sem rota, rota sem menu, rota sem arquivo, grupo não montado, import quebrado |
| `gerar-repo.mjs` | `inventario/estado/edges.json` (+ `tabelas-uso.json` se receber nomes no stdin) | para cada edge function: linhas, segredos lidos (`Deno.env.get`) e quem a invoca (src, migrations, outras edges, e2e, CI); marca **edge sem chamador** |
| `mudou-conteudo.mjs` | `true`/`false` no stdout | gate de PR: compara com o `HEAD` ignorando carimbo de data e telemetria de janela rolante |

## Como rodar

```bash
npm run inventario:rotas          # só código, sem credencial
npm run inventario:repo           # precisa de ripgrep (rg) no PATH
SUPABASE_ACCESS_TOKEN=... npm run inventario:banco
npm run inventario:test           # node --test dos dois .unit.mjs
npm run inventario:rotas:check    # exit 1 se rotas.json commitado está desatualizado
```

Sem token, o inventário do banco também aceita a resposta do SQL salva em arquivo (rode
`scripts/inventario/banco.sql` no console/MCP de SQL do projeto oficial):

```bash
node scripts/inventario/gerar-banco.mjs --entrada /tmp/resposta.json [--functions /tmp/functions.json]
```

## Garantias

- **Só leitura.** `banco.sql` é só `SELECT` em catálogo e contadores; o cliente
  (`scripts/db/supabase-sql-client.mjs`) vai de `read_only: true`.
- **Nenhum segredo na saída.** De `cron.job` sai só o nome das funções chamadas, nunca o `command`
  (que carrega URL e cabeçalho). Antes de gravar, `gerar-banco.mjs` recusa saída com cara de
  credencial (`Bearer …`, JWT, `sb_secret_`).
- **Projeto certo.** O ref oficial (`cfmzkthhgliqelozlmwu`) é fixo no script, e a resposta é
  conferida contra as tabelas de `src/integrations/supabase/types.ts` (≥90% das tabelas de types.ts
  presentes, ≥70% da resposta conhecida) — resposta de banco irmão (catálogo externo, CRM, Lovable)
  é recusada com exit 2.
- **Diff estável.** Chaves ordenadas recursivamente e `rotas.json` sem data: o diff entre semanas
  mostra só o que mudou de verdade.
- O **ledger de migrations** entra como informação, não como critério de origem: neste repo ele é
  menor que o repo de propósito (passivo histórico em `scripts/db/migration-ledger-baseline.json`).

## Quem roda isso sozinho

`.github/workflows/inventario-estado-semanal.yml` (segunda, 10:41 UTC, e dispatch) refaz os três
arquivos, e **só abre PR** (`automation/inventario-estado`, auto-merge ligado) se
`mudou-conteudo.mjs` disser que o conteúdo mudou. Secret: `SUPABASE_ACCESS_TOKEN`, no environment
`construction` (mesmo padrão do `migration-ledger-drift.yml`).

Replicado do Zapp Web V2 (`scripts/inventario/`). Diferenças aqui: roteamento próprio
(`src/routes/config/` + `App.tsx` + `SidebarReorganized`), bloco de operação genérico (`filas`)
em vez do bloco de WhatsApp, leitura de cron/ledger tolerante a esquema ausente e conferência de
origem por `types.ts`.
