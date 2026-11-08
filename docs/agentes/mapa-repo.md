# Mapa do repositório — referência para agentes

Ler quando precisar saber onde fica algo antes de buscar por texto.

## Onde olhar primeiro

| Precisa de | Leia |
|---|---|
| O que está quebrado e qual a prioridade | **`PENDENCIAS.md`** (cresce por append: seções por workflow de CI + blocos datados; o mais recente está no fim). Complemento: `docs/GO_LIVE_CHECKLIST.md` |
| Estado do CI por PR/SHA | `RELATORIO_CI.md` (log de sessões; "Pendências que requerem ação do owner" em `:126`) |
| Auditoria consolidada mais recente | `RELATORIO_AUDITORIA_EXAUSTIVA.md` (2026-10-22; 12 seções + resumo final em `:363`) |
| Qual banco, migrations, ledger, RLS, edge functions, secrets | `AGENTS.md` + **`docs/agentes/banco.md`** |
| Perímetro do GitHub, workflows, required checks | **`docs/agentes/github-ci.md`** |
| Deploy, domínios, integrações externas | **`docs/agentes/servicos.md`** |
| Regras de negócio que o código não deixa óbvio (papéis Sicoob, escopo de vendedor, verba, kit, preço) | **`docs/agentes/regras-dominio.md`** |
| Rota → componente | `docs/ROUTES.md` (**gerado** por `scripts/generate-routes-map.mjs` a partir de `src/routes/config/*.ts`; tem `--check`) |
| Módulo/tela → tabelas e RPCs | `docs/API_DEPENDENCY_MAP.md` (80 linhas, ~20 módulos — cobre pouco do app) |
| Tabelas locais | `docs/DATA_DICTIONARY.md` (63 tabelas, "última atualização 2026-04-17") |
| Autorização de cada edge function | **`supabase/functions/_shared/edge-authz-manifest.ts`** (SSOT). `docs/EDGE_FUNCTIONS.md` se auto-declara referência histórica de 2026-04-17, cobrindo 50 de 106 |
| Decisões de arquitetura | `docs/adr/` (0001…0009; há **dois** arquivos com prefixo `0001`) |
| Runbooks de operação | `docs/RUNBOOK.md`, `docs/RUNBOOK_CONNECTIONS.md`, `docs/RUNBOOKS/MCP_DDL_APPLICATION.md`, `docs/RUNBOOKS/CREDENTIAL_ROTATION.md`, `docs/HOTFIX_PROCEDURE.md`, `docs/DR.md` |
| Histórico, auditorias, planos antigos | `docs/execucao/` (~306 arquivos), `docs/plano-implementacao/`, `docs/audits/`, `docs/pesquisa/`, `docs/externo/`, `docs/evidencias/`, `reports/`, `public/reports/` — **contexto, não fonte de verdade** |

**Não existe um único doc rota → tela → hook → edge → tabela.** Está fatiado nos quatro itens acima; o
`docs/api_dependency_map.json` está desatualizado (`updated_at: 2024-05-24`, 4 módulos, um deles marcado
"uses mock data").

## Mapa rápido

| Onde | O que tem |
|---|---|
| `src/` | front Vite + React (1.9k arquivos). `components/` (63 subpastas por feature: `sicoob/`, `quotes/`, `kit-builder/`, `catalog/`, `bi/`, `admin/`, `ui/` shadcn…), `hooks/`, `pages/` (61 na raiz + 17 subpastas), `lib/` (`auth/`, `rbac/`, `security/`, `sicoob/`, `bi/`, `external-db/`, `telemetry/`, `roles.ts`, `sentry.ts`), `services/` (+ 11 em `services/sicoob/`), `contexts/`, `stores/` (Zustand), `routes/config/` (**fonte das rotas**), `integrations/supabase/` (`client.ts`, `types.ts` gerado), `utils/`, `types/` |
| `supabase/functions/` | **106 funções** (diretório com `index.ts`) + `_shared/` (CORS em `cors.ts`, autorização em `edge-authz-manifest.ts`, `credentials.ts`, `external-read-only.ts`, `internal-service-auth.ts`), `tests/`. `graphify-out/` ali é lixo de uma rodada antiga (só um `.gitignore`), não é função |
| `supabase/migrations/` | 590 arquivos `.sql` (o vivo). `supabase/migrations_archive/` = arquivo morto, nunca reaplicar |
| `supabase/preflight/`, `supabase/cron/` | preflight somente leitura do contrato Sicoob; `cron-config.sql` é script manual fora das migrations |
| `scripts/` | ~20 gates `check-*.mjs` na raiz + `ci/` (`verify-supabase-functions-published.mjs`), `db/` (10: `apply-sicoob-migrations.mjs`, `check-migration-ledger-drift.mjs`, `audit-core-rls.mjs`, `supabase-sql-client.mjs`, `migration-ledger-baseline.json`…), `lib/` (contratos de edge), `qa/` (**35 simuladores Python `simular-*.py`** de regras Sicoob + `check-bundle-budget.mjs`, `login-browser.mjs`, `demo-browser.mjs`), `revisao/` (geradores de relatório), `graphify/` |
| `tests/` | ~518 arquivos, 32 subpastas: unidade (`hooks/`, `components/`, `lib/`, `utils/`, `pages/`, `services/`, `stores/`), segurança (`p0/`, `rls/`, `security/`, `contract/`), Sicoob/negócio (`sicoob/`, `admin/`, `public-approval/`), Deno (`edge-functions/`, `functions/`), cenários Node (`scenarios/`, rodados com `node --test`) |
| `e2e/` | Playwright: `flows/` (numerados `01-auth` … `26-complete-flow` + `p0/`), `routes/` (por área + `_catalog.ts`, `_factories.ts`), `critical-flows/`, `helpers/`, `fixtures/` (`auth.setup.ts`, `permissions-matrix.ts`…). Estrutura em `e2e/README.md` |
| `infra/` | Terraform — hoje **só** `infra/modules/cloudflare/main.tf`; o `infra/README.md:6-8` lista `modules/supabase` e `environments/prod` que **não existem** |
| `infrastructure/` | 1 arquivo: `github-runner/docker-compose.yml` (runner self-hosted, deploy por Portainer, var `RUNNER_TOKEN`) |
| `vendor/` | dependências locais com `proveniencia.json`: `braces` e `pptxgenjs-browser` (referenciadas como `file:` no `package.json`) |
| `public/` | assets + `manifest.json`, `sw.js`, `offline.html`, `_headers` (CSP/HSTS **duplicando** o `vercel.json` — manter as duas idênticas, `docs/SECURITY.md:21`) |
| `.lovable/` | memória/planos do agente Lovable (features, integrações, hardening) — contexto, não config de deploy |
| `.devin/skills/graphify/` | skill do graphify (1.4k linhas) + `.graphify_version` = `0.9.73` |

## Automações (`scripts/`)

A convenção deste padrão é: automação em `scripts/<nome>/`, um subdiretório por automação, cada um com
`README.md` dizendo o que faz, como rodar e que secrets usa. **Hoje só `scripts/graphify/` tem README** —
as outras subpastas (`ci/`, `db/`, `lib/`, `qa/`, `revisao/`) e os ~20 scripts soltos na raiz de `scripts/`
não têm. Ao criar automação nova, siga a convenção; ao alterar uma existente, leia o script antes.
Scripts em `scripts/`; a saída deles em `docs/` ou `reports/` — nunca misturar. Nunca em `supabase/`
(o CLI do Supabase é dono dessa pasta) nem em `src/` (entra no bundle).

## Comandos

O repo usa **npm**: há `package-lock.json` e **não** há `bun.lock` (`bun.lock`/`bun.lockb` estão no
`.gitignore` de propósito) — use `npm ci`. Node `>=24 <25` (`package.json` > `engines`); **não há `.nvmrc`**,
os workflows fixam `node-version: 24`.

- typecheck só dos arquivos tocados: `node scripts/tscheck-files.mjs <arquivos>` (= `npm run typecheck:files`);
  ele inclui o que os arquivos importam, então filtre a saída pelo caminho que está corrigindo;
- typecheck do projeto: `npm run typecheck` (`tsconfig.app.json` + `tsconfig.node.json`). O gate do CI é
  `npm run typecheck:baseline` e cobre **só** `tsconfig.app.json`;
- lint: `npx eslint <arquivos>` para o que tocou; gate `npm run lint:baseline`;
- teste unitário só do que você tocou: `npx vitest run <caminho>`. Cobertura do CI:
  `npm run test:coverage:ci` (80% statements/branches). `vitest.config.ts:28-34` **exclui** `e2e/**`,
  `supabase/functions/**/*.test.ts` e `tests/scenarios/**`;
- cenários Node: `npm run test:scenarios` (`node --test tests/scenarios/*.mjs`);
- E2E: `npm run test:e2e:install` (browser), `npm run test:e2e:smoke`, `npm run test:e2e:regression`,
  `npm run test:e2e:mobile`, `npm run test:e2e:pwa`, `npm run test:e2e:all`;
- build: `npm run build`; dev server: `npm run dev` (porta 8080) — **cuidado: o `.env` local pode apontar
  para produção**, ver `docs/agentes/banco.md`;
- integridade das instruções para agentes: `npm run check:agents-md`;
- guards de CI antes do PR: a lista completa está em `docs/agentes/github-ci.md`;
- hooks do husky: `pre-commit` (lint-staged) e `pre-push` (typecheck + lint baseline + vitest). O
  `pre-push` está **sem bit de execução** — rode os comandos à mão.

## Grafo de código (graphify) — detalhes

`npm run graph:setup` → `scripts/graphify/setup.sh`; precisa de `uv` ou `pipx`. `graphify-out/` fica no
`.gitignore`: cada clone gera o seu, e hoje ele **não existe neste checkout**. Frescor: compare
`git rev-parse --short HEAD` com a linha "Built from commit" de `graphify-out/GRAPH_REPORT.md`; se
divergir, `npm run graph:update` (só AST, sem custo de API). Os hooks `PreToolUse` em
`.claude/settings.json` chamam `graphify hook-guard` e não fazem nada onde o graphify não estiver
instalado. Em sessão de nuvem, `.claude/hooks/session-start.sh` instala o graphify e gera o grafo em
segundo plano (log em `graphify-out/.session-start.log`; pula se o grafo já é do commit atual). Versão
fixada: `0.9.73`, a mesma de `.devin/skills/graphify/.graphify_version`.

## Divergências doc↔realidade conhecidas (não confie nesses números)

- `README.md:173` diz "106 Edge Functions" e `:266` diz "104"; o real é **106 diretórios com `index.ts`**
  (109 entradas em `supabase/functions/`, descontando `_shared`, `tests` e `graphify-out`).
- `README.md:178,252` dizem "534 migrations" e `README.md:349` diz "529"; há **590** arquivos.
- `README.md:251` diz "35+ tabelas"; `docs/DATA_DICTIONARY.md:3` diz 63.
- `README.md:271,274` lista edges `fetch-product-details`, `generate-pdf`, `send-email`, `tts-*` — nenhuma
  existe.
- `docs/MODULES.md` aponta para memória `mem://` da Lovable, não resolvível no repo.
- `infra/README.md:6-8` lista dois módulos Terraform inexistentes.
