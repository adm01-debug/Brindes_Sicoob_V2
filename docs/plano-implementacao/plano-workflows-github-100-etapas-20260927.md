# Plano de correções e melhorias — GitHub Actions (100 etapas)

**Repositório:** `adm01-debug/Brindes_Sicoob_V2` · **Data da análise:** 27/09/2026 · **Estado:** plano, nada executado.

Fontes: os 12 arquivos em `.github/workflows/`, `dependabot.yml`, `codeql-config.yml`, `.lighthouserc.cjs`, `.gitleaksignore`, `CODEOWNERS`, `docs/CI_CD.md`, `docs/BRANCH_PROTECTION.md`, `docs/secrets.md`, `playwright.config.ts`, `package.json`, mais a API do GitHub (4.037 runs, branch protection, secrets, environments, permissões de Actions).

---

## 1. Diagnóstico — o que está acontecendo de verdade

| # | Fato observado | Evidência |
|---|---|---|
| F1 | **Nenhum workflow roda desde 16/09/2026 17:40 UTC.** Os 100 runs mais recentes falharam (100%). Cada job termina em 2–3 s, com zero steps e `runner_id: 0`. | Runs 36343255xxx (27/09). Última run verde: `ci.yml` #188 em 16/09. |
| F2 | Causa: **orçamento de minutos do GitHub Actions esgotado** na conta pessoal `adm01-debug` (repo privado, plano gratuito = 2.000 min/mês). Nenhum runner é alocado. | `docs/CI_CD.md` e `docs/BRANCH_PROTECTION.md` (22/09) já registram o bloqueio. |
| F3 | **50 PRs foram mescladas em `main` desde 16/09 com CI 100% vermelha**, e todas foram para produção (Vercel e Lovable publicam `main` sem gate). | `git log --since=2026-09-16` = 50 commits; `homepage: brindes-sicoob-v2.vercel.app`. |
| F4 | Branch protection de `main` **não exige nenhum status check**; `enforce_admins: false`; sem resolução de conversas; sem rulesets. | API `branches/main/protection`. |
| F5 | Custo por push em PR quando tudo roda: `ci` ~8 min + `codeql` ~7 + `lighthouse` ~3 + `bundle` ~2 + `sicoob` 3–20 + `e2e` até 15 + 4×25 = 115 + `gitleaks` <1 → **140–160 min por push**, repetidos no push em `main` → ~300 min por PR mesclada. O plano gratuito esgota com ~7 PRs. | Durações das runs de 16/09; `e2e.yml` (4 shards × 25 min). |
| F6 | **11 secrets que os workflows exigem não existem**: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `RLS_TEST_USER_A_EMAIL`, `RLS_TEST_USER_A_PASSWORD`, `RLS_TEST_USER_B_EMAIL`, `RLS_TEST_USER_B_PASSWORD`, `RLS_TEST_PRIVATE_QUOTE_B_ID` (+ `LHCI_GITHUB_APP_TOKEN` opcional). Existem só 5 (`SUPABASE_ACCESS_TOKEN`, `VITE_SUPABASE_*`). Variável `CODEQL_UPLOAD_ENABLED` ausente. Environment `construction` sem secrets e sem regra de proteção. | API `actions/secrets`, `actions/variables`, `environments`. |
| F7 | Histórico de sucesso por workflow: `e2e.yml` **2 sucessos / 502 falhas**; `security-compliance.yml` **0 sucessos na vida**; `migration-ledger-drift.yml` 0/6; `db-performance-audit.yml` 0/4 (falhava por secret ausente já em jul/ago, antes do bloqueio); `deploy-sicoob-functions.yml` 0/1; `branch-protection-sentinel.yml` 6 sucessos / 139 runs. | API `runs?status=success`. |
| F8 | `security-compliance.yml` copia 4 arquivos que **não existem** no repo (`DOSSIA_AUDITORIA_ENTERPRISE_V5.md`, `ENTERPRISE_AUDIT_REPORT_V6.md`, `FINAL_ENTERPRISE_AUDIT_REPORT.md`, `AUDIT_EXPORT_FILTERED.md`) — falha garantida mesmo com secrets. | `ls` na raiz. |
| F9 | `branch-protection-sentinel.yml` aceita `lovable-dev[bot]`, mas os commits do Lovable são de **`gpt-engineer-app[bot]`** → 133 falsos positivos. | Autor dos commits de jun–ago. |
| F10 | `ci.yml` roda `deno check` em **27 de 108** Edge Functions; 81 nunca são tipadas no CI (lista hard-coded). | `ls supabase/functions` vs. `ci.yml`. |
| F11 | `playwright.config.ts` sobe o servidor com `source .env.production`, arquivo que **não existe no runner** (só `.env.production.example`) → E2E quebra antes do 1º teste mesmo com credenciais. O job de E2E não define nenhum `VITE_SUPABASE_URL`: não está claro contra qual banco ele roda. | `playwright.config.ts:221`; `e2e.yml`. |
| F12 | `lighthouse.yml` publica o relatório do build em **`temporary-public-storage`** (URL pública) e faz build **sem `VITE_*`**; `bundle-check.yml` idem. São **4 builds do Vite por PR** (`ci`, `bundle`, `lighthouse`, `sicoob` PWA). | `.lighthouserc.cjs`; workflows. |
| F13 | `codeql.yml` roda com `upload: never` → SARIF vira artifact que ninguém lê; sem Code scanning no plano atual. 7 min por PR sem resultado consumível. | `codeql.yml`. |
| F14 | Sem `permissions:` em `e2e`, `lighthouse`, `bundle-check`, `security-compliance`, `db-performance-audit`. Sem `timeout-minutes` em `security-compliance`, `db-audit`, `bundle`, `lighthouse`, `gitleaks`, `deploy`. Sem `concurrency` em `security-compliance` e `db-audit`. | Workflows. |
| F15 | Versões de actions misturadas (`checkout@v4` vs `@v6`, `upload-artifact@v4` vs `@v7`), nenhuma fixada por SHA; `allowed_actions: all`; `sha_pinning_required: false`. | API `actions/permissions`. |
| F16 | Gatilhos para branches inexistentes: `ci.yml` em `develop`, `security-compliance.yml` em `master`. Só existe `main`. | `git branch -r`. |
| F17 | Dois templates de PR divergentes (`PULL_REQUEST_TEMPLATE.md` e `pull_request_template.md`); dois revisores de IA (Copilot PR reviewer + CodeRabbit); labels do `dependabot.yml` (`dependencies`, `automated`, `ci`) **não existem**; Dependabot alerts **desativados**. | API `labels`, `dependabot/alerts` (403). |
| F18 | `.gitleaksignore` suprime 31 achados, incluindo `.env:jwt` em 2 commits e JWT dentro de migration; o próprio arquivo diz "presença aqui não comprova rotação". | `.gitleaksignore`. |
| F19 | Não existe pipeline de entrega: migrations vão por SQL Editor manual (549 migrations locais, ledger em drift), funções Sicoob só por `workflow_dispatch` (6 de 108 funções), Vercel/Lovable publicam `main` sem esperar CI. | `deploy-sicoob-functions.yml`; `docs/CI_CD.md`. |
| F20 | CODEOWNERS aponta só para `@adm01-debug`, autor de todas as PRs → a revisão obrigatória vira auto-aprovação; `require_code_owner_reviews: false`. | `CODEOWNERS`; branch protection. |

**Resumo executivo:** a esteira está tecnicamente bem desenhada (gates de migration, RLS, simulações SQL, smoke E2E), mas está **desligada por falta de orçamento**, **nunca foi obrigatória** para mesclar, e **metade dos workflows nunca ficou verde** por secrets ausentes e bugs próprios. Produção recebe tudo que entra em `main`, sem validação.

**Decisões que só você pode tomar** (marcadas 💰 ou ⚠️ nas etapas): 1 (orçamento), 34 (banco de homologação para E2E), 43 (CodeQL vs. alternativa gratuita), 61 (gate de deploy no Vercel), 76 (segundo revisor humano).

---

## 2. As 100 etapas

Legenda: **Esf.** = esforço (P ≤ 1 h · M ≤ ½ dia · G > ½ dia) · 💰 custo · 🔐 segredo · ⚠️ toca produção · **Dep.** = depende de.

### Fase 0 — Desbloqueio imediato (1–6)

| # | Etapa | Onde | Esf. | Dep. |
|---|---|---|---|---|
| 1 | 💰 **Restabelecer orçamento do Actions**: definir spending limit > 0 em Settings → Billing, ou migrar o repo para uma organização com plano Team. Sem isso nenhuma outra etapa é verificável. | GitHub Billing | P | — |
| 2 | Enquanto o orçamento estiver zerado, **desativar os 9 workflows automáticos** (`github_disable_workflow`) para parar 9 falhas por push e o ruído de notificações; reativar após a etapa 1. | Actions | P | — |
| 3 | 🔐 Criar os 4 secrets do E2E (`E2E_USER_EMAIL/PASSWORD`, `E2E_ADMIN_EMAIL/PASSWORD`) com contas de homologação dedicadas. | Secrets | P | 34 |
| 4 | 🔐 Criar environment `compliance` e nele `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_DB_URL` (TLS verificado); nunca como secret de repo. | Environments | P | — |
| 5 | 🔐 Criar `RLS_TEST_USER_A/B_EMAIL/PASSWORD` e `RLS_TEST_PRIVATE_QUOTE_B_ID` (2 personas em cooperativas distintas + 1 orçamento privado) no environment `compliance`. | Environments | M | 4 |
| 6 | Após a etapa 1, disparar `ci.yml` por `workflow_dispatch` em `main` e registrar a primeira run verde como baseline (nomes exatos dos jobs alimentam a etapa 69). | Actions | P | 1 |

### Fase 1 — Cortar consumo de minutos (7–24)

| # | Etapa | Onde | Esf. | Dep. |
|---|---|---|---|---|
| 7 | `paths-ignore` (`docs/**`, `**/*.md`, `graphify-out/**`, `reports/**`, `.lovable/**`) em `ci`, `e2e`, `bundle`, `lighthouse`, `codeql`. PR só de doc não pode custar 150 min. | 5 workflows | P | — |
| 8 | Remover gatilho `push: main` de `bundle-check`, `lighthouse` e `e2e` (já validados no PR; com "branch atualizada" obrigatória — etapa 72 — a rerodada em `main` é redundante). Corta ~50% dos minutos. | 3 workflows | P | 72 |
| 9 | Remover `develop` de `ci.yml` e `master` de `security-compliance.yml` (branches inexistentes). | 2 workflows | P | — |
| 10 | Regressão E2E (4 shards × 25 min) **sai do PR**: rodar em `schedule` noturno + `workflow_dispatch` + label `e2e-full` no PR. O smoke gate (≤ 15 min) continua no PR. | `e2e.yml` | M | — |
| 11 | Instalar `webkit` só no shard que executa projetos mobile; `chromium` nos demais (hoje 4 shards instalam os dois). | `e2e.yml` | P | 10 |
| 12 | **Um build por PR**: job `build` em `ci.yml` publica `dist/` como artifact; `bundle-check` e `lighthouse` viram jobs que baixam o artifact (elimina 3 `npm ci` + 3 `vite build`). | `ci`, `bundle`, `lighthouse` | M | — |
| 13 | Cache do Playwright também em `sicoob-ci` (instala Chromium do zero a cada run) e cache do Deno (`~/.cache/deno`) em `ci`. | 2 workflows | P | — |
| 14 | CodeQL sai de `pull_request`; fica `push: main` + semanal (7 min/PR sem resultado consumível — ver F13). | `codeql.yml` | P | 43 |
| 15 | Dividir `ci.yml` em jobs paralelos com `needs`: `lint-type`, `unit`, `edge-deno`, `sql-sim`, `build`. Hoje é um único job serial de até 25 min; falhar cedo economiza minutos. | `ci.yml` | M | — |
| 16 | Simulações Python: 11 em `ci` + 11 em `sicoob-ci`, 3 duplicadas (`verba-atomica`, `logistica-canonica`, `consolidacao-*`). Concentrar todas em `sicoob-ci/transacoes` (com `paths`) e remover de `ci.yml`. | 2 workflows | P | — |
| 17 | Dependabot npm: `weekly` → `monthly`, `open-pull-requests-limit: 5 → 2`. Cada PR de dependência custa uma rodada inteira de CI. | `dependabot.yml` | P | — |
| 18 | `timeout-minutes` em todos os jobs sem limite (`security-compliance`, `db-audit`, `bundle`, `lighthouse`, `gitleaks`, `deploy`). | 6 workflows | P | — |
| 19 | `concurrency` + `cancel-in-progress` em `security-compliance` e `db-performance-audit`. | 2 workflows | P | — |
| 20 | `fetch-depth: 0` só onde é necessário (`ci.yml` para migration-immutability; `gitleaks`). `sicoob-ci` e `security-compliance` voltam ao clone raso. | 2 workflows | P | — |
| 21 | `migration-ledger-drift`: de diário para semanal até o secret existir (etapa 4); depois reavaliar diário. | workflow | P | 4 |
| 22 | `npm ci --no-audit --no-fund` uniforme (o audit já roda via `check:npm-audit`). | 7 workflows | P | — |
| 23 | Composite action `.github/actions/setup-node-deps` (checkout + setup-node 24 + cache + `npm ci`) usada pelos 7 workflows Node — elimina drift de versões (F15). | `.github/actions/` | M | — |
| 24 | Registrar em `docs/CI_CD.md` a meta de custo: **≤ 30 min de Actions por PR** e o procedimento de leitura mensal de uso (automatizado na etapa 92). | docs | P | — |

### Fase 2 — Corrigir defeitos de cada workflow (25–52)

| # | Etapa | Onde | Esf. | Dep. |
|---|---|---|---|---|
| 25 | `deno check` gerado por `for f in supabase/functions/*/index.ts` — hoje cobre 27 de 108 funções (F10). | `ci.yml` | P | — |
| 26 | `deno test supabase/functions/_shared/` inteiro (hoje só `internal-service-auth.test.ts`; `credentials.test.ts` é ignorado). | `ci.yml` | P | — |
| 27 | Mover a checagem "demo não vai para produção" (grep em `dist/`) para `scripts/qa/check-dist-clean.mjs`, reutilizada pelo job `build` único. | `ci.yml`, `scripts/qa` | P | 12 |
| 28 | Baselines de lint/typecheck (111 KB JSON): step que falha se o baseline **cresceu** sem justificativa no PR, e rotina documentada de "queimar baseline" mensal. | `ci.yml`, `scripts/` | M | — |
| 29 | `sicoob-ci/experiencia` mede WCAG/responsividade em `npm run dev` (sem minificação, sem SW). Trocar por `vite preview` do artifact da etapa 12. | `sicoob-ci.yml` | P | 12 |
| 30 | Substituir o loop `for tentativa in {1..45}` por `npx wait-on`; usar `E2E_BASE_URL` no teste PWA em vez de subir um segundo servidor. | `sicoob-ci.yml` | P | — |
| 31 | `paths` filter + check obrigatório = PR sem arquivo Sicoob fica bloqueado para sempre. Criar job `sicoob-gate` sem `paths` que conclui "skipped OK" (padrão `dorny/paths-filter`) antes de tornar obrigatório (etapa 69). | `sicoob-ci.yml` | M | — |
| 32 | `permissions: contents: read` em `e2e.yml` (único workflow de teste sem bloco). | `e2e.yml` | P | — |
| 33 | Criar `.env.ci` versionado (sem segredos) e apontar o `webServer` do Playwright para ele — `.env.production` não existe no runner (F11). | `playwright.config.ts` | P | — |
| 34 | ⚠️ **Decidir contra qual Supabase o E2E roda**: projeto de homologação dedicado (recomendado) e nunca produção. Definir `VITE_SUPABASE_URL/KEY` do job a partir de secrets `E2E_SUPABASE_*`. | `e2e.yml` | M | 3 |
| 35 | Regressão: remover `continue-on-error: true` + step final de fail; usar `if: always()` só nos uploads e deixar o step de teste falhar naturalmente. | `e2e.yml` | P | 10 |
| 36 | Alinhar majors de `checkout`, `setup-node`, `cache`, `upload-artifact` entre todos os workflows (v4/v6/v7 misturados). | todos | P | 23 |
| 37 | 🔐 `.gitleaksignore`: para cada um dos 31 fingerprints confirmar rotação (registrar em `docs/RUNBOOKS/CREDENTIAL_ROTATION.md`) e remover do ignore o que já foi rotacionado. | `.gitleaksignore` | M | 90 |
| 38 | Gitleaks: manter em `pull_request` e `push: main`; schedule semanal → mensal (histórico não muda). | `security.yml` | P | — |
| 39 | Remover o `cp` dos 4 arquivos inexistentes e limpá-los da lista de upload (F8). | `security-compliance.yml` | P | — |
| 40 | `permissions: contents: read`, `concurrency`, `timeout-minutes: 15` em `security-compliance`. | `security-compliance.yml` | P | 18, 19 |
| 41 | Tirar `security-compliance` de `push: main` (usa service role de produção a cada merge) → só `schedule` semanal + `workflow_dispatch`, com `environment: compliance`. | `security-compliance.yml` | P | 4 |
| 42 | Persistir `reports/*.txt` como artifact e abrir issue automática quando `test-rls-compliance` reprovar (hoje o resultado morre no log). | `security-compliance.yml` | M | 41 |
| 43 | 💰 **CodeQL**: sem GitHub Advanced Security no plano atual, `upload: never` gera SARIF que ninguém lê. Opção A: habilitar Code scanning (se o plano permitir) e `vars.CODEQL_UPLOAD_ENABLED=true`. Opção B (recomendada, custo zero): substituir por `eslint-plugin-security` + `semgrep` OSS com anotação no PR. | `codeql.yml` | M | — |
| 44 | Enquanto 43 não é decidida: publicar resumo do SARIF (contagem por severidade) no `$GITHUB_STEP_SUMMARY`. | `codeql.yml` | P | — |
| 45 | Lighthouse: `upload.target: temporary-public-storage` → `filesystem` + artifact. Hoje o relatório do build (rotas, chunks, HTML) vai para URL pública (F12). | `.lighthouserc.cjs` | P | — |
| 46 | Lighthouse e bundle-check buildam sem `VITE_SUPABASE_URL` → usar o artifact da etapa 12. | 2 workflows | P | 12 |
| 47 | Lighthouse: `numberOfRuns: 3 → 2` e adicionar rota `/` além de `/login`. | `.lighthouserc.cjs` | P | — |
| 48 | Bundle-check: `permissions`, `timeout`, `if-no-files-found: error` e **comparação com baseline de `main`** (hoje só orçamento absoluto; regressão de 20% dentro do orçamento passa). | `bundle-check.yml`, `scripts/qa` | M | 12 |
| 49 | `db-performance-audit`: além do secret (etapa 4), salvar saída como artifact e abrir issue com resumo. Falhou 4/4 desde julho e, mesmo verde, ninguém veria. | workflow | M | 4 |
| 50 | `migration-ledger-drift`: `::error` com a lista de pendências e issue "Drift de migrations" criada/atualizada automaticamente. | workflow | M | 4 |
| 51 | Sentinel: corrigir allowlist para `gpt-engineer-app[bot]` (F9). | `branch-protection-sentinel.yml` | P | — |
| 52 | Sentinel é post-hoc (não impede nada). Após a etapa 70, converter em auditoria semanal que lista commits em `main` sem PR e abre issue. | `branch-protection-sentinel.yml` | P | 70 |

### Fase 3 — Segredos, ambientes e entrega (53–68)

| # | Etapa | Onde | Esf. | Dep. |
|---|---|---|---|---|
| 53 | Environment `construction` sem regra: adicionar `required_reviewers` (Joaquim) e `deployment_branch_policy: main`. Hoje qualquer push dispara publicação de funções. | Environments | P | — |
| 54 | 🔐 Mover `SUPABASE_ACCESS_TOKEN` do repo para o environment `construction` (escopo mínimo). | Environments | P | 53 |
| 55 | Renomear o uso de `VITE_SUPABASE_PROJECT_ID` no deploy para `SUPABASE_PROJECT_REF` (VITE_* é variável de front, não credencial de deploy). | `deploy-sicoob-functions.yml` | P | — |
| 56 | Lista de 6 funções duplicada em 2 steps → `env: FUNCTIONS`; `--no-verify-jwt` só onde a função exige. | `deploy-sicoob-functions.yml` | P | — |
| 57 | ⚠️ `migrate-helper` está na lista de deploy — função de migração exposta como Edge Function. Validar que `authorize.ts` a protege ou retirar do deploy. | `deploy-sicoob-functions.yml`, `supabase/functions/migrate-helper` | M | — |
| 58 | ⚠️ Criar `deploy-migrations.yml`: `supabase db push --dry-run` em PR que toca `supabase/migrations/**`; `db push` real por `workflow_dispatch` com environment protegido. Hoje migrations vão via SQL Editor e o ledger diverge (F19). | novo workflow | G | 53 |
| 59 | ⚠️ Environment `production` para **todas** as 108 funções (não só 6 Sicoob), com lista gerada e aprovação obrigatória. | novo workflow | M | 53 |
| 60 | Pós-deploy smoke: chamar `health-check` e `system-healthcheck` após publicar e falhar o job se ≠ 200. | deploy workflows | P | 58, 59 |
| 61 | ⚠️ **Vercel publica `main` sem esperar CI**: ativar Deployment Protection / "Ignored Build Step" condicionado ao status do commit. 50 merges com CI vermelha já foram para produção (F3). | Vercel | M | 69 |
| 62 | Definir em `docs/DEPLOYMENT.md` quem é produção: Vercel ou Lovable. Hoje dois publicadores para o mesmo branch. | docs, Lovable | P | — |
| 63 | Usar `deployment_status` do preview do Vercel como gate do E2E autenticado (elimina subir servidor no runner; environment `Preview` já existe). | `e2e.yml` | G | 34, 61 |
| 64 | Preencher a coluna "Configurado em" de `docs/secrets.md` para cada secret de CI, com data (hoje 90% "preencher"). | docs | P | 3–5 |
| 65 | Agendar rotação semestral de `SUPABASE_ACCESS_TOKEN` (criado 23/09) e chaves `VITE_*` (08/09) no runbook. | docs/RUNBOOKS | P | — |
| 66 | Remover environment órfão `Production – sicoob-csp-202635-1790202890178-XEua` (deploy avulso do Vercel). | Environments | P | — |
| 67 | 🔐 `E2E_CLEANUP_TOKEN` + job pós-E2E chamando `e2e-cleanup` (dados de teste acumulam no projeto de homologação). | `e2e.yml` | P | 34 |
| 68 | Eliminar duplicidade `VITE_SUPABASE_ANON_KEY` × `VITE_SUPABASE_PUBLISHABLE_KEY` (coexistem nos secrets e no código). | Secrets, `src/` | P | — |

### Fase 4 — Proteção de branch e governança (69–80)

| # | Etapa | Onde | Esf. | Dep. |
|---|---|---|---|---|
| 69 | **Status checks obrigatórios** em `main`: `Segurança, contratos e build`, `e2e` (smoke), `Gitleaks — Secret Scan`, `bundle-stats`, `sicoob-gate`. Hoje nenhum é obrigatório (F4). | Branch protection | P | 6, 31 |
| 70 | `enforce_admins: true` — o bypass administrativo é a porta pela qual as 50 PRs vermelhas entraram. | Branch protection | P | 69 |
| 71 | `required_conversation_resolution: true` e `require_last_push_approval: true`. | Branch protection | P | — |
| 72 | `allow_update_branch: true` + "require branches to be up to date" (justifica a etapa 8). | Repo settings | P | — |
| 73 | `delete_branch_on_merge: true` (branches `hermes-*` acumulam). | Repo settings | P | — |
| 74 | Desativar `allow_merge_commit` e `allow_rebase_merge` — `AGENTS.md` exige squash; o sentinel aceita 2 padrões porque a config permite 3. | Repo settings | P | — |
| 75 | Migrar de branch protection clássica para **ruleset** (bypass list explícita para Dependabot, linear history auditável). | Rulesets | M | 69–74 |
| 76 | 💰 CODEOWNERS = `@adm01-debug`, autor de todas as PRs → revisão obrigatória vira auto-aprovação (F20). Decidir: segundo revisor humano, ou trocar exigência de review por "checks verdes + CodeRabbit sem bloqueio". | CODEOWNERS, Branch protection | P | — |
| 77 | Unificar templates: manter `PULL_REQUEST_TEMPLATE.md` (tem plano de rollback) e apagar `pull_request_template.md`. | `.github/` | P | — |
| 78 | Um revisor de IA: manter CodeRabbit (config PT-BR) e desligar o Copilot PR reviewer. | Repo settings | P | — |
| 79 | Criar labels `dependencies`, `automated`, `ci` — o Dependabot ignora labels inexistentes silenciosamente. | Labels | P | — |
| 80 | Habilitar Dependabot alerts + security updates (desativados) e `dependency-review-action` em PR. | Repo settings, `ci.yml` | P | — |

### Fase 5 — Supply chain e hardening (81–90)

| # | Etapa | Onde | Esf. | Dep. |
|---|---|---|---|---|
| 81 | Fixar toda action por SHA completo (`uses: actions/checkout@<sha> # v4.x`) e ativar `sha_pinning_required`. | todos, Actions settings | M | 23 |
| 82 | `allowed_actions: all` → `selected` (GitHub-owned + verified + allowlist: `gitleaks`, `supabase/setup-cli`, `denoland/setup-deno`, `dorny/paths-filter`). | Actions settings | P | 81 |
| 83 | Job `actionlint` em PR que toca `.github/**` — pegaria `master`/`develop` inexistentes e `permissions` faltando. | novo job | P | — |
| 84 | Job `zizmor` (auditoria de segurança de workflows) junto do actionlint. | novo job | P | 83 |
| 85 | `permissions:` explícito nos 5 workflows sem bloco (F14). O default do repo é `read`, mas defaults mudam. | 5 workflows | P | — |
| 86 | Gitleaks com `--redact` e summary habilitado; hoje o log pode ecoar trechos do segredo detectado. | `security.yml` | P | — |
| 87 | `retention-days` explícito ≤ 7 em todos os artifacts (`bundle-stats`, `enterprise-compliance` estão em 90 dias com dados de produção). | workflows | P | — |
| 88 | `step-security/harden-runner` em modo audit nos jobs que tocam segredos de produção (`compliance`, `deploy`). | 3 workflows | P | 81 |
| 89 | `if: github.event.pull_request.head.repo.full_name == github.repository` nos jobs que usam secrets (repo privado hoje; evita acidente se virar público). | workflows com secrets | P | — |
| 90 | 🔐⚠️ `.gitleaksignore` marca `.env:jwt` nos commits `635178b9` e `6b090cca`: se a chave anon de produção foi commitada, **rotacionar a chave anon do projeto Supabase**. | Supabase, `.gitleaksignore` | M | — |

### Fase 6 — Observabilidade, higiene e documentação (91–100)

| # | Etapa | Onde | Esf. | Dep. |
|---|---|---|---|---|
| 91 | Job reutilizável `notify`: falha em `main` ou em schedule → mensagem no WhatsApp via Evolution (`wpp2`) ou issue automática. Hoje são 9 falhas por push sem ninguém ver. | `.github/workflows/_notify.yml` | M | 1 |
| 92 | `actions-usage-report.yml` mensal: grava `reports/actions-usage-YYYYMM.md` com minutos por workflow — evita repetir o bloqueio de 16/09. | novo workflow | P | 24 |
| 93 | Apagar em lote as runs falhas de 16/09 → hoje (~1.000 de 4.037) para o painel do Actions voltar a ser legível. | Actions (`delete_workflow_run`) | P | 1 |
| 94 | Atualizar `docs/CI_CD.md` e `docs/BRANCH_PROTECTION.md` ao fim de cada fase (hoje descrevem 22/09). | docs | P | cada fase |
| 95 | README: badges apontam para runs vermelhas; manter só `ci.yml` + `security.yml` depois de verdes. | README | P | 6 |
| 96 | Remover `reports/AUDIT_REPORT_*.md` versionados e adicionar `reports/` ao `.gitignore` (workflows escrevem lá; saída de CI não entra em commit). | `.gitignore`, `reports/` | P | — |
| 97 | Husky pre-push roda a suíte Vitest inteira (igual ao CI): trocar por `vitest related --changed origin/main`. | `.husky/pre-push` | P | — |
| 98 | `AGENTS.md` manda commitar com `--no-verify`, ou seja, o hook é ignorado por regra: alinhar (hook leve, sem `--no-verify`) ou remover o pre-push. | `AGENTS.md`, `.husky` | P | 97 |
| 99 | Runbook "CI vermelha em `main`" em `docs/RUNBOOK.md`: quem re-roda, quando reverter, como usar `github_get_run_failure_summary`. | docs | P | — |
| 100 | **Marco de encerramento**: 30 dias consecutivos com `main` verde, ≤ 30 min de Actions por PR, zero push direto, deploy de produção só via workflow com aprovação. Evidência (links das runs) em `docs/execucao/evidencias/`. | docs | — | todas |

---

## 3. Ordem recomendada de execução

1. **Semana 1** — Fase 0 inteira + etapas 7, 8, 9, 10, 14, 18, 19 (parar a sangria de minutos antes de reabrir o orçamento).
2. **Semana 2** — Fase 2 (bugs que impedem cada workflow de ficar verde) + 12, 15, 23.
3. **Semana 3** — Fase 4 (proteção de branch) e 61 (gate do Vercel). A partir daqui `main` só recebe PR verde.
4. **Semana 4** — Fase 3 (entrega: migrations e funções por workflow com aprovação).
5. **Contínuo** — Fases 5 e 6.

## 4. O que este plano **não** cobre (fora do escopo de workflows)

- Qualidade das 108 Edge Functions em si, RLS e migrations (há planos próprios em `docs/plano-implementacao/`).
- Custos de Vercel, Lovable e Supabase.
- Conteúdo dos testes E2E (128 specs) além do que impede que rodem.
