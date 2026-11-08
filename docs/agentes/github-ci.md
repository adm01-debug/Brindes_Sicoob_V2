# GitHub (perímetro, CI, workflows) — referência para agentes

Ler quando mexer em branch protection, settings do repo, `.github/workflows/`, ou quando um merge ou um
workflow falhar de forma estranha.

## Escrita no GitHub

- Repo `adm01-debug/Brindes_Sicoob_V2`, branch `main`, **público** (`visibility: public` na API —
  `AGENTS.md` antigo e vários docs diziam "privado"; está errado).
- **Escrita: MCP `GITHUB - MCP - FOREVER`** (`github_push_files`). O MCP padrão do GitHub retorna 403 em
  write. `github_push_files` sobrescreve o arquivo — mande o conteúdo integral com apenas a mudança
  semântica e confira depois que o remoto bate com o que você testou. Aceita `files` e `delete` no mesmo
  commit (1 commit atômico). Em sessão da nuvem com este repo entre as fontes autorizadas, `git push`
  também funciona.
- Para listar PRs abertas com os arquivos que tocam numa chamada só, use `github_graphql`
  (`pullRequests(states:OPEN){ nodes { number files { nodes { path } } } }`):
  `github_list_pull_requests` devolve o repositório inteiro em cada nó e estoura o contexto.
- Commits: Conventional Commits em PT-BR (`CONTRIBUTING.md:28-39`). **Não há hook `commit-msg` nem
  commitlint neste repo** (`.husky/` só tem `pre-commit` e `pre-push`); nenhum step de CI valida mensagem
  de commit. Siga o padrão mesmo assim.
- O que a `main` aceita depois do merge: o `branch-protection-sentinel.yml:38-58` reprova commit na `main`
  que não termine em `(#NNN)`, não comece com `Merge pull request #NNN` ou `chore(release):`, e não seja de
  bot conhecido (`github-actions[bot]`, `dependabot[bot]`, `lovable-dev[bot]`, `gpt-engineer-app[bot]`,
  `renovate[bot]`). O squash do GitHub já põe o `(#NNN)`.

## Perímetro do GitHub — estado canônico

**Regra:** qualquer mudança nos campos abaixo atualiza **esta tabela** no mesmo PR. Lido ao vivo da API em
2026-11-08 (`github_get_branch_protection`, `github_get_repo`, `github_list_environments`,
`github_list_rulesets`).

| Campo | Estado canônico (ao vivo) |
|---|---|
| Branch protection — required checks | **10**: `Gitleaks — Secret Scan` · `npm audit — CVE Scan` · `Analyze (javascript-typescript)` · `Segurança, contratos e build` · `e2e` · `bundle-stats` · `lighthouse` · `Verba e aprovação transacionais` · `Entrada e demonstração responsivas` · `Validar origem confiável` |
| Branch protection — `strict` | **`true`** (branch tem de estar atualizada) |
| Branch protection — `enforce_admins` | `true` |
| Branch protection — histórico linear | `true` |
| Branch protection — review obrigatório | **`required_approving_review_count: 0`**, `require_last_push_approval: false`, `require_code_owner_reviews: false`, `dismiss_stale_reviews: true` (deliberado: um único colaborador humano; ver `docs/BRANCH_PROTECTION.md`) |
| Branch protection — conversas | **`required_conversation_resolution: true`** — comentário de bot não resolvido **bloqueia** o merge |
| Force push / deleção / assinatura | `allow_force_pushes: false` · `allow_deletions: false` · `required_signatures: false` · `lock_branch: false` |
| Rulesets | **nenhum** (`GET /rulesets` → `[]`) — a proteção é só o branch protection clássico |
| Merge | `allow_squash_merge: true` · `allow_merge_commit: true` · `allow_rebase_merge: true` · `allow_auto_merge: true` · `delete_branch_on_merge: true`. **Não é squash-only**; com histórico linear exigido, merge-commit falha na prática — use squash |
| Squash | `squash_merge_commit_title: COMMIT_OR_PR_TITLE` · `squash_merge_commit_message: COMMIT_MESSAGES` · `use_squash_pr_title_as_default: false` |
| Environments | **6**: `construction` (branch policy = só branches protegidas, sem revisor) · `copilot` · `e2e-staging` (revisor obrigatório `adm01-debug`, `can_admins_bypass: false`) · `Preview` · `Production` · `Production – sicoob-csp-…` |
| Segurança | secret scanning **on**, push protection **on**, dependabot security updates **on**, `secret_scanning_non_provider_patterns` **off** |

Fatos do perímetro que já custaram retrabalho:

- **PR só de docs/`*.md` nunca fica mergeável.** `codeql.yml:11-17` e `lighthouse.yml:4-9` têm
  `paths-ignore` **no gatilho `pull_request`**, mas `Analyze (javascript-typescript)` e `lighthouse` são
  required checks: os jobs não iniciam, os checks ficam pendentes para sempre e `strict: true` não libera.
  `ci.yml` e `security.yml` não têm esse problema (filtro só no `push`). Ao mexer em doc, inclua algum
  arquivo fora de `docs/**`/`*.md` ou combine o destravamento com o dono.
- **`environment: e2e-qa` não existe.** `e2e.yml:83`, `e2e.yml:271` e `security-compliance.yml:86`
  apontam para ele; os 6 environments reais estão na tabela acima. Resultado: E2E autenticado fica
  `skipped`, nunca "aprovado" (`PENDENCIAS.md:316`). O `e2e-staging`, criado em 30/10, não é referenciado
  por workflow nenhum.
- **O required check `e2e` não cobre jornada autenticada.** Ele roda só
  `--project=chromium-public --project=routes-public` contra Supabase placeholder
  `https://e2e-public.invalid` (`e2e.yml:43-45,62-68`). O job `e2e-authenticated` e os shards de regressão
  só rodam por `workflow_dispatch` e **não** são gate de PR.
- **`sicoob-ci.yml` roda em toda PR.** O `paths` longo (`:4-27`) vale só para `push`; o `pull_request`
  (`:28-29`) não tem filtro — ~30 simulações Postgres + Playwright/PWA rodam mesmo em PR que não toca
  Sicoob.
- **Dívida de lint e de tipagem é zero** (`.eslint-baseline.json` `totalErrors: 0`,
  `.typecheck-baseline.json` `total: 0`): não há margem, qualquer erro novo quebra o gate.
- **`SKIP_E2E` é escape hatch morto**: usado em `e2e.yml:189,216,224,233` e nunca definido em lugar algum.
  Não serve para pular o gate.
- **CodeQL não publica no Code Scanning** (`codeql.yml:67` `upload: never`, justificado como
  "repositório privado" — o repo hoje é público, a justificativa caducou). O bloqueio vem de
  `scripts/check-codeql-sarif.mjs` sobre o artefato.
- **CodeQL não analisa os gates**: `paths-ignore` de `vendor/**`, `e2e/**`, `tests/**`, `scripts/**`
  (`.github/codeql/codeql-config.yml:3-7`) — os ~40 scripts `check-*.mjs` ficam fora da análise.
- **Não existe baseline versionado de settings do GitHub** (nada equivalente ao
  `scripts/ci/github-settings-baseline.json` do Zapp Web V2). Os snapshots em
  `docs/execucao/*/github*.json` são **históricos e desatualizados** (mostram `enforce_admins: false`,
  `checks: null`, 1 review, e check `E2E regression — shard …/2` quando hoje a matriz é `/3`) — não use
  como fonte de nome de check.
- `docs/BRANCH_PROTECTION.md:5-8` ainda afirma que a `main` "não possui status checks obrigatórios e
  permite bypass administrativo": **falso hoje**. Corrigir o doc no mesmo PR em que mexer no perímetro.
- **Dois templates de PR no mesmo diretório** (`.github/PULL_REQUEST_TEMPLATE.md`, 50 linhas, herdado de
  outro projeto com Bitrix/n8n/Bling; `.github/pull_request_template.md`, 26 linhas, com "Evidência
  verificada" e imutabilidade de migration). O GitHub escolhe um só. O segundo é o que casa com a postura
  deste repo.
- `.github/CODEOWNERS` cobre `/.github/`, `/supabase/migrations/`, `/supabase/functions/`, `*.yml`,
  `package.json` e lockfiles, mas **não tem efeito de gate** (`require_code_owner_reviews: false`).
- `.github/dependabot.yml`: npm semanal (segunda 06:00 America/Sao_Paulo, 3 PRs, prefixo `chore(deps)`),
  grupos `production-minor-patch` e `development-all`, e `ignore` global de majors (`:34-37`) —
  o grupo `development-all` declara `major` (`:33`) mas o `ignore` barra tudo, então major de dev nunca
  abre PR.

## Workflows

**13 arquivos** em `.github/workflows/` (mais os dinâmicos do GitHub no remoto: `Copilot`,
`Copilot cloud agent`, `Dependabot Updates`):

| Arquivo | `name:` | Gatilhos | Environment |
|---|---|---|---|
| `ci.yml` | Qualidade contínua | push `main` (com `paths-ignore`) + PR `main` (sem filtro) | — |
| `sicoob-ci.yml` | Portal Sicoob | push `main` (com `paths`) + PR `main` (sem filtro) | — |
| `security.yml` | Security Scan | PR `main` + push `main` + `schedule 30 6 * * 1` | — |
| `codeql.yml` | CodeQL | push/PR `main` (ambos com `paths-ignore`) + `schedule 0 9 * * 1` | — |
| `e2e.yml` | E2E (Playwright) | PR `main` + dispatch | `e2e-qa` (**inexistente**) |
| `bundle-check.yml` | Bundle Size Check | PR `main` | — |
| `lighthouse.yml` | Lighthouse Performance Audit | PR `main` (com `paths-ignore`) | — |
| `branch-protection-sentinel.yml` | Branch Protection Sentinel | push `main` + dispatch | — |
| `migration-ledger-drift.yml` | Migration ledger drift | `schedule 0 6 * * *` + dispatch | `construction` |
| `apply-sicoob-migrations.yml` | Aplicar migrations Sicoob | **só dispatch** (`confirmar = APLICAR`) | `construction` |
| `deploy-sicoob-functions.yml` | Publicar funções Sicoob | **só dispatch** (`confirmar = PUBLICAR`) | `construction` |
| `security-compliance.yml` | Enterprise Compliance & Audit Reporting | push `main` + `schedule 0 0 * * 0` + dispatch | `e2e-qa` no 2º job |
| `db-performance-audit.yml` | Monthly DB Audit | `schedule 0 0 1 * *` + dispatch | — |

- **Agendamentos (UTC):** `migration-ledger-drift` `0 6 * * *` · `security` `30 6 * * 1` ·
  `codeql` `0 9 * * 1` · `security-compliance` `0 0 * * 0` · `db-performance-audit` `0 0 1 * *`.
- **Todas as actions estão pinadas por SHA de 40 hex** — ao bumpar, troque o SHA **e** o comentário da
  versão.
- **`permissions` default `contents: read` nos 13 arquivos**; exceções: `codeql.yml:21-24`
  (`security-events: write`, `actions: read`) e `security.yml:17-20` (`pull-requests: read`,
  `security-events: write`). Nenhum workflow tem `contents: write` — nenhum job de CI commita.
- **Nenhum `continue-on-error` em nenhum workflow**: não há job decorativo por essa via.
- `concurrency` existe em 10 dos 13 (faltam `branch-protection-sentinel`, `deploy-sicoob-functions`,
  `migration-ledger-drift`); só `apply-sicoob-migrations.yml:16` usa `cancel-in-progress: false`, correto
  para DDL.
- **`npm ci`, nunca bun** (`ci.yml:37`, `security.yml:42`, `apply-sicoob-migrations.yml:36`, todos com
  `cache: npm`), Node 24 em todos.
- Checks que rodam e **não** bloqueiam merge: `sicoob-gate` (o consolidador está fora da lista obrigatória;
  os dois jobs-pai estão dentro), `Branch Protection Sentinel`, `Migration ledger drift`,
  `Monthly DB Audit`, `Enterprise Compliance & Audit Reporting`, `e2e-authenticated`,
  `E2E regression — shard N/3`.
- **Simulações órfãs** (existem em `scripts/qa/` e nenhum workflow roda):
  `simular-aprovacao-desconto-atomica.py`, `simular-convites-sicoob.py`,
  `simular-identidade-itens-orcamento.py`, `simular-salvamento-orcamento-atomico.py`,
  `simular-taxonomia-marketing.py`, `simular-verba-legada.py`, `postgres_ready.py`.
- `.coderabbit.yaml:13,23-28`: auto review ligado na `main`, `request_changes_workflow: false`. Como
  `required_conversation_resolution: true`, thread do CodeRabbit/Copilot em aberto segura o merge.

## Guards do CI que você pode rodar antes do PR

Mínimo que cobre os checks obrigatórios reproduzíveis localmente:

```bash
npm ci --no-audit --no-fund
npm run typecheck:baseline
npm run lint:baseline
npm run test:coverage:ci
npm run check:npm-audit
npm run build
```

Mapa comando → job que o roda:

| Comando | Job |
|---|---|
| `npm run typecheck:baseline` | `ci.yml:40` (`qualidade`) |
| `npm run lint:baseline` | `ci.yml:43` |
| `node scripts/check-migration-immutability.mjs` | `ci.yml:49` |
| `node scripts/db/apply-sicoob-migrations.mjs --verify-files` | `ci.yml:50` |
| `node scripts/db/check-runtime-refs.mjs` | `ci.yml:53` |
| `npm run check:npm-audit` | `ci.yml:57` |
| `node scripts/check-edge-authorization.mjs` | `ci.yml:58` |
| `npm run check:seller-scope` | `ci.yml:59` |
| `npm run check:critical-test-skips` | `ci.yml:63` |
| `npm run test:scenarios` | `ci.yml:64` |
| `npm run test:coverage:ci` (gate 80% statements/branches) | `ci.yml:67` |
| `node scripts/check-edge-structured-logging.mjs` | `ci.yml:102` |
| `npm run build` | `ci.yml:139`, `bundle-check.yml:33`, `lighthouse.yml:44`, `sicoob-ci.yml:91` |
| `python3 scripts/qa/simular-*.py` | `ci.yml:89-132` (16) e `sicoob-ci.yml:47-62` (14) |
| `node scripts/qa/check-bundle-budget.mjs` | `bundle-check.yml:36` |
| `npm run qa:visual:login` / `qa:visual:demo` | `sicoob-ci.yml:105-106` |
| `npm run test:e2e:pwa` | `sicoob-ci.yml:111` |
| `node scripts/check-codeql-sarif.mjs` | `codeql.yml:72` |
| `npm run check:security-definer-acl` | `security-compliance.yml:55` (precisa de service_role) |
| `npm run check:agents-md` | **ainda não está em nenhum workflow** — ver "Pendências" |

Rodam em nenhum workflow (não confie neles como gate, mas são úteis): `npm run typecheck` (tsc puro, e é o
único que cobre `tsconfig.node.json`), `lint`/`lint:check`, `format:check`, `check:route-error-element`,
`check:aschild-nesting`, `check:route-ref-usage`, `check:live-api-inventory`, `test:price-freshness`,
`test:fuzzing`, `test:strict-ref`, `smoke`, `test:e2e`, `test:e2e:regression`.

## Baselines / catracas

- `scripts/check-eslint-baseline.mjs` não usa o JSON como referência primária: resolve a base por
  `ESLINT_BASE_REF` → `origin/$GITHUB_BASE_REF` → `origin/main` (`:44-49`), lint-a o conteúdo **da base**
  via `git show` (`:112-124`) e falha só com regressão nos arquivos alterados de `src/**`. Por isso
  `fetch-depth: 0` em `ci.yml:29`. Conta só severidade 2. `.eslint-baseline.json` é fallback para quando
  não há base git.
- `scripts/check-typecheck-baseline.mjs` roda `tsc --noEmit -p tsconfig.app.json`, conta erros por arquivo e
  falha se algum arquivo piorar ou se arquivo fora do baseline passar a ter erro; melhoria só avisa e pede
  `--update`. **Exit 2 = erro de infra** (tsc não concluiu), não aprovação. Cobre só `tsconfig.app.json`.

## Hooks do husky

- `.husky/pre-commit` → `npx lint-staged` (prettier + `eslint --fix --max-warnings=0` em
  `src/**/*.{ts,tsx}`; prettier em `src/**/*.css` — `package.json`).
- `.husky/pre-push` → `npm run typecheck:baseline && npm run lint:baseline && npm run test -- --run --reporter=dot`.
- **`.husky/pre-push` está sem bit de execução** (`-rw-r--r--`, contra `-rwxr-xr-x` do `pre-commit`): na
  prática o git não executa hook sem `+x`. Rode os três comandos à mão antes do push.

## Pendências deste doc

1. `npm run check:agents-md` (`scripts/ci/check-agents-md-integrity.mjs`, guard de integridade das
   instruções para agentes) **não está wired em nenhum workflow** — PRs abertas tocam `.github/workflows/ci.yml`
   (#151, #173, #180), então o step não foi adicionado nesta passagem. Depois que elas fecharem, o passo é:
   `git fetch --no-tags --depth=1 origin main` + `AGENTS_MD_BASE=FETCH_HEAD npm run check:agents-md` no job
   `qualidade`.
2. Required check de doc-only (ver "Fatos do perímetro") e `environment: e2e-qa` inexistente continuam
   abertos.
