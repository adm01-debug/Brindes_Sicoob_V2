# Planos intermediários e auditorias de setembro (melhorias, reconciliação, correções, workflows, roadmap) — o que não foi feito

> Fatia PLC · Repositório `adm01-debug/Brindes_Sicoob_V2` · HEAD `dc08200` (main, 08/10/2026) · Conferência em 11/10/2026.
> Método: cada etapa prometida nos planos e auditorias desta fatia foi conferida contra o código de HEAD (grep/leitura), contra a configuração real do GitHub (API: branch protection, environments, secrets, rulesets, runs) e contra o domínio publicado (`curl` em `brindes-sicoob-v2.vercel.app`).
> **Limite de evidência:** o MCP administrativo do banco canônico `cfmzkthhgliqelozlmwu` respondeu `Management API 401: Invalid access token` nesta sessão (o mesmo bloqueio registrado em 01/10). Nada do que depende de leitura ao vivo do banco (cron.job, ledger, Vault, segredos de Edge) pôde ser revalidado. Nesses casos a classificação usa só o repositório e as evidências datadas.

## Resumo

### Contagem por status (65 itens não concluídos)

| Status | Itens |
|---|---:|
| NAO_INICIADA | 25 |
| PARCIAL | 21 |
| STUB/MOCK | 3 |
| ORFA | 6 |
| BLOQUEADA_EXTERNA | 10 |
| **Total de itens listados** | **65** |

Vários itens agrupam etapas equivalentes de planos diferentes. Por exemplo, a "proteção da main" junta as etapas 7 das melhorias, 2 e 46 da reconciliação e W069–W075 dos workflows. Por isso a lista tem 65 itens, mas ela cobre cerca de 190 etapas abertas.

### Conferidos como concluídos em HEAD (fora da lista)

| Plano / documento | Concluídas (aprox.) | Exemplos verificados |
|---|---:|---|
| `plano-melhorias-50-etapas.md` | 29 de 50 | etapas 8–11, 14–20, 24–27, 29, 33, 34, 38–40, 42–44, 49: TS sem diagnósticos, `any` reduzido a 8 ocorrências, 1 `console.log` restante, painel de conexões lazy e `pptxgenjs` justificado em `vendor/pptxgenjs-browser/README.md` |
| `plano-reconciliacao-50-etapas.md` | 23 de 50 | 4, 7, 10, 18–20, 22, 24–33, 38, 40–42, 44, 45 (11 tabelas Sicoob, buckets, RLS, partições, retenção, `untypedFrom` fora dos serviços Sicoob) |
| `plano-correcoes-auditoria-50-etapas-20260917.md` | 28 de 50 | 1–8, 10–20, 29, 32–37, 39, 42–44, 50 (buckets corrigidos, `set_config` removido, `error_logs` substituído por `telemetry_events`, `product-webhook` → 410, `check-runtime-refs` no CI, runbook MCP_DDL) |
| `plano-workflows-github-100-etapas-20260927.md` | ~30 de 100 | W008, W009, W018, W019, W022, W025, W031 (`sicoob-gate`), W032, W033, W036, W039, W043/W044 (resumo SARIF), W045, W046, W051, W054, W057, W065, W079, W081/W082 (SHA pinning + `allowed_actions=selected`), W085; S: W001, W002, W021, W090, W095, W098 |
| Revisões 24/09, 27/09 e 28/09 (F01–F12, A01–A15, A01–A13) | ~22 | 5 Edge Sicoob publicadas; `save_quote_atomic` com versão esperada e idempotência; identidade de `quote_items`; logística paginada no servidor; status com autorização antes do retorno idempotente (`20260928182000`); notificação de status por trigger; chave de previsão do kit inclui unidades; `getBudgetByPa` por competência; autosave por usuário com envelope e retenção |
| `05_ROADMAP_PROXIMOS_PASSOS.md` | maioria das Fases 1–7 | OrganizationContext/Switcher, dashboard, catálogo, orçamentos, pedidos, mockups IA (via `generate-mockup`, não Replicate), aprovação pública `/approve/:token`, PWA, tour, templates, error boundaries |
| Auditorias e execuções de 22/09 e 23/09 | maioria | aprovação pública transacional, outbox durável, ACL, conversão atômica e quarentena de documentos (código) |

### Os 10 achados mais graves

1. **PLC-01: a CI hospedada não roda na `main`.** O push do merge #98 (`dc08200`) terminou em `startup_failure` sem criar job (run 37775844412). O próprio commit admite que foi mesclado sem certificação hospedada.
2. **PLC-02 e PLC-03: nada impede código quebrado de ir ao ar.** A `main` não exige nenhum status check e tem `enforce_admins=false`. A Vercel publica `main` sem esperar CI, e o README aponta a produção para `criar-together-now.lovable.app`, que hoje serve outro produto ("Promo Gifts").
3. **PLC-40: o scanner antimalware não está configurado.** O upload de nota fiscal e de comprovante é recusado com HTTP 503, e o fluxo financeiro e logístico de documentos não opera.
4. **PLC-34 e PLC-35: a produção está "cega".** O chunk publicado `assets/sentry-2jhnaSZh.js` tem 78 bytes de funções vazias, ou seja, o Sentry está inativo. Não existe alerta operacional ligado: `health-check` não notifica e `error-monitor` não está publicado.
5. **PLC-47: as telas de cadastro e edição de catálogo não salvam nada.** `/admin/cadastros`, técnicas, fornecedores, variantes e galerias gravam no catálogo externo somente leitura, e o bridge responde `403 CATALOG_READ_ONLY`.
6. **PLC-24: a paridade GitHub × banco tem 491 divergências históricas.** São 462 migrations sem ledger, 19 com conteúdo não verificado, 9 com nome divergente e 1 com conteúdo divergente (ledger com 110 versões contra 592 arquivos locais). O banco não pôde ser consultado hoje.
7. **PLC-26 e PLC-27: não há staging, preview de banco nem restore testado.** O E2E e as correções rodam direto no banco canônico.
8. **PLC-29: rotinas prometidas como cron não estão agendadas.** Faltam follow-up de orçamento, relatórios agendados, digest, fila, watchers de preço, ownership-audit e connections-health-check. A tela `/dashboard` permite criar relatórios agendados que nunca serão enviados.
9. **PLC-38: o rate limiting cobre só 21 das 108 Edge Functions.** As RPCs públicas chamadas direto no PostgREST não têm limitação.
10. **PLC-39: a raiz `/` do domínio Vercel é servida sem CSP e sem os demais cabeçalhos de segurança.** `/login` e `/index.html` têm CSP, e o `script-src` ainda usa `'unsafe-inline'`.

Também são relevantes: PLC-64 (homologação integral e piloto bloqueados pelo negócio), PLC-33 (rotação de credenciais históricas não comprovada) e PLC-32 (limite de 100 Edge Functions do plano Supabase, já esgotado).

---

## Itens

### A. CI/CD, GitHub e governança de entrega
(origem principal: `docs/plano-implementacao/plano-workflows-github-100-etapas-20260927.md`, `docs/plano-melhorias-50-etapas.md`, `docs/plano-implementacao/plano-reconciliacao-50-etapas.md`)

### PLC-01  CI hospedada não executa na `main` (startup_failure)
- Status: BLOQUEADA_EXTERNA (conta/Actions do GitHub; causa não diagnosticada no repo)
- Origem do plano: plano-workflows:48 (W001 "Restabelecer orçamento do Actions… Sem isso nenhuma outra etapa é verificável"); plano-workflows:53 (W006 "registrar a primeira run verde como baseline"); plano-reconciliacao:635 (Etapa 46 "HEAD de `main` totalmente verde"); fechamento-tecnico-2026-10-08.md:52 ("condicionado ao CI do PR #98").
- Evidência no código: API GitHub — run 37775844412 (push `dc08200`, `path: BuildFailed`, `conclusion: startup_failure`). As runs de 06/10 em `main` (Qualidade contínua, CodeQL, Security Scan, Sentinel) foram `cancelled`. A mensagem do commit `dc08200` diz: "O GitHub Actions da conta passou a retornar startup_failure antes da criação de jobs… impedindo certificação hospedada". Só os workflows `schedule` (drift, compliance) rodaram verdes em 09–11/10. Todas as actions usadas estão na allowlist (`github_get_selected_actions`), então a causa provável é a conta ou o billing.
- O que falta: restabelecer a execução de push e PR (billing/plano), rodar `ci.yml`, `sicoob-ci`, `e2e`, `codeql` e `security` no SHA `dc08200` e registrar a baseline verde.
- Impacto no negócio: a versão que está no ar foi mesclada sem nenhum teste automático rodando no GitHub.
- Esforço: P (técnico), mas depende de decisão de custo.
- Prioridade: P0

### PLC-02  Proteção da `main` sem checks obrigatórios, com bypass de admin e ajustes de repositório pendentes
- Status: NAO_INICIADA
- Origem do plano: plano-melhorias:40 (etapa 7 "checks obrigatórios, sem force-push"), :70 (etapa 31 "Promover checks de RLS/escopo… a required"); plano-reconciliacao:69 (Etapa 2 ação 1 "`required_status_checks.strict=true`… `enforce_admins=true`") e :635 (Etapa 46); plano-workflows:136–143 (W069–W076); plano-correcoes:281 (Etapa 30).
- Evidência no código: `github_get_branch_protection(main)` não traz `required_status_checks`. Também mostra `enforce_admins.enabled=false`, `required_conversation_resolution=false`, `require_last_push_approval=false`, `require_code_owner_reviews=false` e `required_signatures=false`. `github_get_repo` mostra `allow_merge_commit=true`, `allow_rebase_merge=true`, `delete_branch_on_merge=false` e `allow_update_branch=false`. `github_list_rulesets` retorna `[]`. `.github/CODEOWNERS` tem só `@adm01-debug`.
- O que falta: exigir os checks (`Segurança, contratos e build`, `sicoob-gate`, `e2e`, `Gitleaks`, `bundle-stats`), ativar `enforce_admins`, resolução de conversas, última aprovação após push e "branch atualizada", deixar só squash, apagar a branch no merge, migrar para ruleset e decidir sobre um segundo revisor humano.
- Impacto no negócio: qualquer merge, inclusive de administrador, chega à produção sem passar pelos testes.
- Esforço: P
- Prioridade: P0

### PLC-03  Publicação em produção sem gate de CI e "quem é produção" indefinido
- Status: NAO_INICIADA
- Origem do plano: plano-workflows:123 (W061 "Vercel publica `main` sem esperar CI"), :124 (W062 "Definir em `docs/DEPLOYMENT.md` quem é produção: Vercel ou Lovable"), :125 (W063 gate E2E via `deployment_status`).
- Evidência no código: `vercel.json` não tem `ignoreCommand`/"Ignored Build Step". O `homepage` do repositório é `https://brindes-sicoob-v2.vercel.app`. Já `README.md:317` e `docs/DEPLOYMENT.md:317–326` dizem que "O deploy é gerenciado… pelo Lovable Cloud" com "Produção: `https://criar-together-now.lovable.app`", e esse domínio hoje responde com `<title>Promo Gifts | Catálogo Inteligente…` (outro produto). `e2e.yml` não tem gatilho `deployment_status`.
- O que falta: decidir um único publicador, condicionar o build da Vercel ao status do commit e corrigir README e DEPLOYMENT.
- Impacto no negócio: a equipe pode estar olhando ou divulgando o endereço de outro produto, e o código entra no ar sem validação.
- Esforço: M
- Prioridade: P1

### PLC-04  Ambientes e segredos do GitHub sem segregação nem inventário completo
- Status: PARCIAL
- Origem do plano: plano-reconciliacao:78–90 (Etapa 3 "Environments `preview`, `staging`, `production` com reviewers… service role **apenas** no environment de auditoria"); plano-melhorias:35 (etapa 4) e :92 (etapa 47); plano-workflows:51–52 (W004/W005), :115 (W053), :117 (W055), :118 (W056), :126 (W064), :128 (W066), :130 (W068).
- Evidência no código: `github_list_environments` mostra que `construction` tem só `branch_policy`, sem `required_reviewers` e com `can_admins_bypass=true`. `Production` e `Preview` não têm regras. O ambiente órfão `Production – sicoob-csp-202635-1790202890178-XEua` continua existindo. Não há ambiente `staging` nem `compliance`. `github_list_actions_secrets` mostra `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_DB_URL` como segredos **de repositório**, e `VITE_SUPABASE_ANON_KEY` e `VITE_SUPABASE_PUBLISHABLE_KEY` coexistindo. `deploy-sicoob-functions.yml:23` mapeia `secrets.VITE_SUPABASE_PROJECT_ID` (sem `SUPABASE_PROJECT_REF`) e a lista de 5 funções aparece repetida nas linhas 45–49 e 61–65. `docs/secrets.md` tem 20 ocorrências de "preencher". Já concluído: `SUPABASE_ACCESS_TOKEN` saiu do repositório (W054).
- O que falta: criar `staging`/`compliance` com reviewers, mover service role e DB URL para esses ambientes, remover a chave duplicada e o ambiente órfão e completar `docs/secrets.md`.
- Impacto no negócio: a credencial mestre do banco fica disponível para qualquer workflow do repositório.
- Esforço: P
- Prioridade: P2

### PLC-05  Pipeline de entrega de migrations e Edge Functions incompleto
- Status: PARCIAL
- Origem do plano: plano-reconciliacao:519 (Etapa 35 "Deploy via CI com aprovação", "Testes 200/401 anexados"); plano-workflows:120 (W058 `deploy-migrations.yml` com `db push --dry-run` em PR), :121 (W059 todas as funções), :122 (W060 smoke pós-deploy).
- Evidência no código: existe `.github/workflows/apply-sicoob-migrations.yml` (só `workflow_dispatch`, ambiente sem reviewers). Não há dry-run em PR que toque `supabase/migrations/**`. `deploy-sicoob-functions.yml` publica só 5 funções (linhas 45–49) e, depois do deploy, apenas lista os slugs; não chama `health-check`. As outras 95 funções foram publicadas manualmente (reconciliacao-online-2026-09-28.md:21).
- O que falta: dry-run por PR, publicação de todas as funções por workflow aprovado e smoke HTTP pós-deploy.
- Impacto no negócio: atualizações de banco e de backend dependem de passos manuais, sem trilha e sem verificação automática.
- Esforço: M
- Prioridade: P2

### PLC-06  Comparador "código publicado × repositório" das Edge Functions não está ligado
- Status: ORFA
- Origem do plano: plano-reconciliacao:528 (Etapa 36 "Diff automático deploy ↔ repositório… Job criado; Teste de falha induzida").
- Evidência no código: `scripts/compare-edge-functions.mjs` existe, mas `grep -rn "compare-edge-functions" .github/workflows package.json` não tem resultado. A paridade de 142 arquivos foi provada só manualmente em 28/09 (reconciliacao-online-2026-09-28.md:21).
- O que falta: job agendado que baixe as funções publicadas e falhe quando houver divergência.
- Impacto no negócio: uma função alterada direto no Supabase passa despercebida.
- Esforço: P
- Prioridade: P2

### PLC-07  Custo e eficiência da esteira em runners hospedados
- Status: PARCIAL
- Origem do plano: plano-workflows:59 (W007), :62 (W010 "Regressão E2E… sai do PR"), :63 (W011), :64 (W012 "Um build por PR"), :66 (W014), :67 (W015), :68 (W016), :69 (W017), :72 (W020), :75 (W023), :76 (W024), :169 (W092); plano-melhorias:78 (etapa 37 "Consolidar os 10 workflows em ~4").
- Evidência no código: `e2e.yml:207–220`: `e2e-regression` com 3 shards de 40 min em série (`max-parallel: 1`) roda em **todo PR** depois do smoke. Não há `schedule` nem label `e2e-full`, e `e2e.yml` não tem `paths-ignore`. `e2e.yml:263` instala `chromium webkit` nos shards. `ci.yml:22` tem um único job `qualidade`, enquanto bundle, lighthouse e sicoob compilam cada um o seu build. As simulações estão duplicadas: `simular-verba-atomica.py` e `simular-logistica-canonica.py` aparecem em `ci.yml:84,111` e em `sicoob-ci.yml:49,59`. `codeql.yml:11` ainda roda em `pull_request`. `.github/dependabot.yml:9,13` está `weekly` com limite 3. `fetch-depth: 0` aparece em `sicoob-ci.yml:46,70` e `security-compliance.yml:28`. Não existe `.github/actions/`. São 13 workflows em `.github/workflows/`. `docs/CI_CD.md` não traz a meta "≤ 30 min/PR" e não há `actions-usage-report.yml`. Desde PR #97/#98 todos os jobs usam `ubuntu-latest`, que consome minutos pagos.
- O que falta: tirar a regressão do PR (noturno ou por label), build único compartilhado, jobs paralelos, composite action, deduplicar simulações, CodeQL só em main e semanal, e relatório mensal de minutos.
- Impacto no negócio: cada PR pode consumir mais de 2 horas de Actions, o que repete o risco de bloqueio por orçamento de setembro.
- Esforço: M
- Prioridade: P2

### PLC-08  Defeitos residuais nos workflows e cobertura de performance só em `/login`
- Status: PARCIAL
- Origem do plano: plano-workflows:83 (W026 "`deno test supabase/functions/_shared/` inteiro"), :84 (W027), :85 (W028), :87 (W030), :92 (W035), :98 (W041), :99 (W042), :104 (W047 "adicionar rota `/`"), :105 (W048), :106 (W049), :107 (W050); plano-melhorias:88 (etapa 45); revisao-plano-20260927/benchmark-32.json (B24 "Medir Core Web Vitals no domínio de homologação").
- Evidência no código: `ci.yml:75` roda só `deno test …/internal-service-auth.test.ts`. A checagem de dist continua inline no `ci.yml` (sem `scripts/qa/check-dist-clean.mjs`). `sicoob-ci.yml:94` usa loop de `curl`. `e2e.yml:133,167` mantém `continue-on-error: true` no passo de teste. `security-compliance.yml:4–5` continua em `push: main` sem `environment:`. Não há criação de issue em falha de compliance, db-audit ou drift (`grep "gh issue\|issues: write"` sem resultado). `.lighthouserc.cjs:6–7` tem só `/login` com `numberOfRuns: 3`. `scripts/qa/check-bundle-budget.mjs:8` usa teto por chunk, sem comparação com main. `db-performance-audit.yml` não sobe artifact.
- O que falta: as correções listadas e medição de CWV nas jornadas reais (catálogo, orçamento, pedido).
- Impacto no negócio: regressões de desempenho nas telas de compra e falhas de compliance não são percebidas.
- Esforço: M
- Prioridade: P2

### PLC-09  Endurecimento da cadeia de suprimentos dos workflows
- Status: NAO_INICIADA
- Origem do plano: plano-workflows:147 (W080 `dependency-review-action`), :155 (W083 actionlint), :156 (W084 zizmor), :158 (W086 gitleaks `--redact`), :159 (W087 `retention-days` ≤ 7), :160 (W088 harden-runner), :161 (W089 guarda `head.repo.full_name`).
- Evidência no código: `grep -n "dependency-review\|actionlint\|zizmor\|harden-runner\|head.repo.full_name\|redact" .github/workflows/*.yml` não retorna nada. Há retenções de 30 dias (`e2e.yml:193,310`) e de 14 dias (`codeql.yml:81`, `lighthouse.yml:60`). Já concluídos: alertas do Dependabot ativos (`github_get_vulnerability_alerts_status` = 204) e SHA pinning.
- O que falta: adicionar os jobs e as guardas e reduzir a retenção.
- Impacto no negócio: um workflow mal configurado ou uma action comprometida pode vazar segredos de produção.
- Esforço: P
- Prioridade: P3

### PLC-10  Alertas de falha de CI e de "commit sem PR"
- Status: NAO_INICIADA
- Origem do plano: plano-correcoes:288 (Etapa 31 "job periódico listando commits… sem PR… acima de um limiar"); plano-workflows:109 (W052 "converter em auditoria semanal… e abre issue"), :168 (W091 job `notify` com WhatsApp ou issue).
- Evidência no código: `branch-protection-sentinel.yml:3–6` roda só em `push: main` e `workflow_dispatch` e escreve apenas em `$GITHUB_STEP_SUMMARY`. Não existe `_notify.yml`. `github_list_issues` não tem nenhuma issue aberta por automação.
- O que falta: auditoria semanal de commits sem PR e notificação automática de falhas em main e nos agendamentos.
- Impacto no negócio: falhas de CI e merges fora do fluxo ficam sem ninguém sabendo.
- Esforço: P
- Prioridade: P2

### PLC-11  Higiene e documentação da esteira
- Status: NAO_INICIADA
- Origem do plano: plano-workflows:144 (W077 dois templates de PR), :171 (W094 atualizar `CI_CD.md`/`BRANCH_PROTECTION.md`), :173 (W096 tirar `reports/` do Git), :174 (W097 pre-push com `vitest related`), :176 (W099 runbook "CI vermelha em main"), :177 (W100 30 dias de main verde).
- Evidência no código: `.github/PULL_REQUEST_TEMPLATE.md` e `.github/pull_request_template.md` coexistem. `docs/CI_CD.md:3` ainda diz "Estado comprovado em 22/09/2026 … orçamento do GitHub Actions está bloqueando". `reports/AUDIT_REPORT_631165be8.md` e `reports/AUDIT_REPORT_733ce6c62.md` estão versionados e `.gitignore` não ignora `reports/`. `.husky/pre-push` roda `typecheck:baseline && lint:baseline && npm run test -- --run`. Não há seção de "CI vermelha" em `docs/RUNBOOK.md`.
- O que falta: unificar o template, atualizar os documentos, ignorar `reports/`, aliviar o pre-push, escrever o runbook e registrar os 30 dias verdes.
- Impacto no negócio: a documentação descreve um estado de três semanas atrás e confunde quem opera.
- Esforço: P
- Prioridade: P3

### PLC-12  PRs absorvidos pelo #98 continuam abertos
- Status: PARCIAL
- Origem do plano: plano-melhorias:37 (etapa 6 "Fechar PRs cujo conteúdo já foi absorvido… apagando as branches"); fechamento-tecnico-2026-10-08.md:39 ("Os reparos úteis dos PRs #92, #93, #94 e #97 foram incorporados ao PR #98").
- Evidência no código: `github_list_pull_requests(state=open)` traz os #94 (`fix/hermes-h206502-e2e-codeql`) e #97 (`fix/hermes-h301937-e2e-hosted`) abertos, e o #98 já está mesclado.
- O que falta: fechar #94 e #97 como substituídos e apagar as branches.
- Impacto no negócio: há risco de alguém mesclar uma versão antiga por engano.
- Esforço: P
- Prioridade: P3

### PLC-13  Convenção de commits (commitlint) e isolamento das edições do Lovable
- Status: NAO_INICIADA
- Origem do plano: plano-melhorias:45 (etapa 12 "Convenção de commits aplicada por hook + isolar edições automáticas (Lovable)"); correcoes-validacao-2026-09-13.md:68 ("Hook `commit-msg` com commitlint… Adiar").
- Evidência no código: `.husky/` tem só `pre-commit` e `pre-push`. `ls commitlint.config.*` não existe e `grep commitlint package.json` não tem resultado. O sentinel ainda aceita `gpt-engineer-app[bot]`/`lovable-dev[bot]` diretamente em main (`branch-protection-sentinel.yml:49`).
- O que falta: hook `commit-msg` testado e uma regra para edições automáticas passarem por PR.
- Impacto no negócio: o histórico fica sem padrão e a ferramenta de IA pode alterar a main sem revisão.
- Esforço: P
- Prioridade: P3

### PLC-14  Versionamento semântico e CHANGELOG automático
- Status: NAO_INICIADA
- Origem do plano: plano-melhorias:91 (etapa 46 "Tags semver + CHANGELOG automático (release-please/changesets)"); plano-correcoes:387 (Etapa 45 CHANGELOG).
- Evidência no código: `git tag -l` vazio, e não há `release-please-config.json` nem `.changeset/`. `CHANGELOG.md:9` tem só `## [Unreleased]` com entradas manuais "Hardening 10/10".
- O que falta: automação de release e tags por versão.
- Impacto no negócio: não dá para saber qual versão está em produção nem voltar a uma versão conhecida.
- Esforço: P
- Prioridade: P3

---

### B. Qualidade de código e testes
(origem: `docs/plano-melhorias-50-etapas.md`, reconciliação e correções)

### PLC-15  Cobertura de testes medida só em 9 arquivos
- Status: PARCIAL
- Origem do plano: plano-melhorias:76 (etapa 35 "Verificar se os thresholds de cobertura (80%/75%) refletem a realidade"); 05_ROADMAP_PROXIMOS_PASSOS.md:418 ("[x] Coverage > 80%").
- Evidência no código: `vitest.config.ts:38–48` (`coverage.include`) lista só 9 arquivos (aprovação pública, `fulfillmentService`, `documentIngestService`, `orderFinancials`, scanner…), com thresholds de 80% (linhas 50–55).
- O que falta: medir a cobertura global (ou por módulo crítico) e fixar metas reais.
- Impacto no negócio: o "80% de cobertura" do roadmap não vale para o sistema, só para 9 arquivos.
- Esforço: M
- Prioridade: P2

### PLC-16  Três diretórios de teste em paralelo
- Status: NAO_INICIADA
- Origem do plano: plano-melhorias:46 (etapa 13 "Consolidar os três diretórios de teste (`tests/`, `src/tests/`, `src/test/`)").
- Evidência no código: `ls -d tests src/tests src/test` mostra que os três existem.
- O que falta: adotar uma convenção única.
- Impacto no negócio: custo de manutenção e risco de suítes esquecidas.
- Esforço: M
- Prioridade: P3

### PLC-17  Política de testes instáveis (flaky) com quarentena e prazo
- Status: NAO_INICIADA
- Origem do plano: plano-melhorias:77 (etapa 36 "quarentena com prazo de 14 dias, não supressão silenciosa").
- Evidência no código: existe só o orçamento de skips (`package.json:61` `check:critical-test-skips`). `grep -rli "quarentena\|quarantine\|flaky" docs/TESTING.md docs/testing` não traz nenhuma política.
- O que falta: registro de quarentena com dono e data de expiração.
- Impacto no negócio: testes desligados ficam desligados para sempre.
- Esforço: P
- Prioridade: P3

### PLC-18  `eslint-disable` sem justificativa e arquivos acima de 700 linhas
- Status: PARCIAL
- Origem do plano: plano-melhorias:56 (etapa 21 "Auditar cada `eslint-disable`/`ts-ignore` — exigir motivo"), :58 (etapa 23 "Quebrar os arquivos acima de 700 linhas").
- Evidência no código: 17 `eslint-disable` em `src`, e 16 deles sem `-- motivo`. `@ts-ignore` está zerado. Arquivos com mais de 700 linhas: `src/pages/sicoob/SicoobInvitationsPage.tsx` (755), `src/components/security/SecurityDashboardSections.tsx` (736), `src/pages/magic-up/MagicUpConfigPanel.tsx` (722), `src/pages/TrendsPage.tsx` (711), `src/pages/Auth.tsx` (710), `src/components/admin/connections/SecretField.tsx` (920).
- O que falta: regra `eslint-comments/require-description` e quebra desses arquivos.
- Impacto no negócio: baixo; dívida de manutenção.
- Esforço: M
- Prioridade: P3

### PLC-19  Drift de `types.ts` e inventário vivo do banco fora do CI
- Status: PARCIAL
- Origem do plano: plano-melhorias:57 (etapa 22 "Tratar `types.ts` gerado com detecção de drift em CI"); plano-reconciliacao:535 (Etapa 37 "Job de diff de tipos no CI"); plano-correcoes:402 (Etapa 47 "Agendar `check-runtime-refs.mjs` semanalmente… contra o banco ao vivo"); revisao-do-plano-2026-09-24.md:44 (A09 "passou usando cache de 22/09").
- Evidência no código: `scripts/db/compare-types-api.mjs` existe, mas `grep compare-types-api .github/workflows` não tem resultado. `ci.yml:52` roda `check-runtime-refs.mjs` contra o cache versionado `scripts/db/.inventory-cache.json`. O inventário vivo (`check-live-api-inventory.mjs`) só roda no `db-performance-audit.yml:45`, que é **mensal** (`cron: '0 0 1 * *'`).
- O que falta: job semanal autenticado que regenere tipos e inventário e falhe quando houver divergência.
- Impacto no negócio: uma tabela ou função removida do banco quebra telas sem que o CI perceba.
- Esforço: M
- Prioridade: P2

### PLC-20  Painel de dívida técnica com tendência semanal
- Status: NAO_INICIADA
- Origem do plano: plano-melhorias:95 (etapa 50 "typecheck, eslint, `any`, cobertura, bundle").
- Evidência no código: `grep -rli "painel de dívida\|debt-dashboard" scripts .github docs` traz só o próprio plano.
- O que falta: coletar as métricas por semana e publicá-las.
- Impacto no negócio: não há como ver se a qualidade melhora ou piora.
- Esforço: P
- Prioridade: P3

### PLC-21  Varredura de segredos no pre-commit
- Status: PARCIAL
- Origem do plano: plano-melhorias:69 (etapa 30 "Secret scanning no pre-commit e no GitHub (gitleaks)").
- Evidência no código: o GitHub tem Gitleaks em `security.yml`. `.husky/pre-commit` roda só `npx lint-staged`, e o `lint-staged` (`package.json:75–83`) não inclui gitleaks.
- O que falta: gitleaks no pre-commit (modo `protect --staged`).
- Impacto no negócio: um segredo pode ser commitado e só ser detectado depois do push.
- Esforço: P
- Prioridade: P3

### PLC-22  Lint de SQL das migrations no CI
- Status: NAO_INICIADA
- Origem do plano: plano-reconciliacao:643–650 (Etapa 47 "lint SQL (`squawk` ou `sqlfluff`)… sem `CREATE INDEX` não concorrente… PR com migration inválida é bloqueado").
- Evidência no código: `grep -rn "squawk\|sqlfluff\|db lint" .github/workflows package.json` não tem resultado. O `supabase db lint --linked` foi rodado só manualmente (fechamento-tecnico-2026-10-08.md:22). Existem apenas o gate de imutabilidade (`scripts/check-migration-immutability.mjs`) e `--verify-files`.
- O que falta: lint de SQL que bloqueie PR.
- Impacto no negócio: uma migration perigosa (lock longo, DROP) pode chegar ao banco.
- Esforço: P
- Prioridade: P3

### PLC-23  Orçamento de bundle só por chunk
- Status: PARCIAL
- Origem do plano: plano-melhorias:84 (etapa 41); auditoria-validacao-2026-09-22.md (Gaps: "estabelecer orçamento total/por rota do bundle"); plano-workflows:105 (W048 "comparação com baseline de `main`").
- Evidência no código: `scripts/qa/check-bundle-budget.mjs:8–9` tem teto de 800 KB por arquivo e aviso aos 500 KB. Não há teto total nem por rota, nem comparação com main.
- O que falta: orçamento total/por rota e diferença contra main.
- Impacto no negócio: o portal pode ficar mais lento aos poucos sem alarme.
- Esforço: P
- Prioridade: P3

---

### C. Banco de dados e paridade GitHub × Supabase
(origem: `plano-reconciliacao-50-etapas.md`, `plano-correcoes-auditoria-50-etapas-20260917.md`, `paridade-github-banco-20260927.md`, `reconciliacao-online-2026-09-28.md`, `auditoria-paridade-local-github-supabase-2026-09-24.md`, `retomada-mcp-20260922.md`, `auditoria-20260922/`, `auditoria-api-20260922/`)

### PLC-24  Paridade GitHub × banco: 491 divergências históricas de migrations
- Status: PARCIAL
- Origem do plano: plano-reconciliacao:169 (Etapa 9 "cada arquivo recebe exatamente um rótulo"), :200 (Etapa 11), :214 (Etapa 12 "`migration list` alinhado"), :228 (Etapa 13 "`db diff` vazio… Job de drift ativo no CI"); retomada-mcp-20260922.md:63 ("Revisar semanticamente as 468 classificações… 18 versões sem corpo"); reconciliacao-online-2026-09-28.md:13 ("As 462 migrations históricas exigem reconciliação por objeto").
- Evidência no código: `scripts/db/migration-ledger-baseline.json` (captured_at 2026-10-07) tem `ledger_count: 110`, `local_count: 592` e `finding_count: 491`, com `status_counts = {local_sem_ledger: 462, conteudo_nao_verificado: 19, nome_divergente: 9, conteudo_divergente: 1}`. `supabase/migrations/` tem 577 arquivos, e `migrations_archive` só 20. O workflow `migration-ledger-drift.yml` está verde porque compara contra essa baseline congelada, sem `supabase db diff`. O banco não pôde ser consultado nesta sessão (MCP 401).
- O que falta: revisão semântica objeto a objeto das 462 migrations (arquivar as superadas, registrar as aplicadas, descartar as nunca aplicadas), conferir as 19 sem corpo e um job de `db diff` de schema.
- Impacto no negócio: ninguém consegue reconstruir o banco a partir do Git; uma recuperação de desastre ou um novo ambiente fica imprevisível.
- Esforço: G
- Prioridade: P1

### PLC-25  Schema baseline versionado, tag e documento de baseline
- Status: NAO_INICIADA
- Origem do plano: plano-reconciliacao:122–135 (Etapa 6 "`baseline-<data>.md`… Tag git `baseline/reconciliacao-2026-09`"), :156–168 (Etapa 8 "`supabase/baseline/20260916_schema_baseline.sql`… README do baseline").
- Evidência no código: `ls supabase/baseline` não existe, `ls docs/execucao/baseline-*` também não, e `git tag -l` está vazio.
- O que falta: `schema_baseline.sql` e `reference_data.sql` normalizados, o README e a tag.
- Impacto no negócio: sem uma fotografia oficial do banco, não dá para comparar nem restaurar com confiança.
- Esforço: M
- Prioridade: P2

### PLC-26  Ambiente de homologação (staging), preview de banco por PR e E2E fora do banco canônico
- Status: NAO_INICIADA
- Origem do plano: plano-reconciliacao:244 (Etapa 14 "Criar ambiente de staging"), :257 (Etapa 15 "Pipeline Supabase Preview por PR"), :281 (Etapa 17), :551 (Etapa 39 "Testes de contrato… contra staging"); plano-correcoes:408 (Etapa 48 "Reforçar a prioridade da Fase 2 (staging)"); plano-workflows:92 (W034 "projeto de homologação dedicado… e nunca produção"); preflight-reconciliacao-sicoob.md:14 (passo 1 "branch Supabase de homologação").
- Evidência no código: não há workflow de preview (`grep -n "branches create" .github/workflows` sem resultado) e o ambiente `staging` não existe. `e2e.yml` usa `secrets.VITE_SUPABASE_URL`/`PUBLISHABLE_KEY` (o projeto canônico) e não tem `E2E_SUPABASE_*`. O `e2e-cleanup` limpa dados nesse mesmo projeto.
- O que falta: projeto ou branch Supabase de homologação, pipeline de preview por PR e E2E apontado para ele.
- Impacto no negócio: toda correção e todo teste automatizado mexem no único banco real do portal.
- Esforço: G
- Prioridade: P1

### PLC-27  Backup lógico e teste de restauração nunca executados
- Status: NAO_INICIADA
- Origem do plano: plano-reconciliacao:106–121 (Etapa 5 "Restore de teste executado… PITR confirmado ativo"); 05_ROADMAP_PROXIMOS_PASSOS.md:456 ("[x] Backups automáticos"); preflight-reconciliacao-sicoob.md:24 (passo 7 "Testar restauração do backup"); docs/DR.md:35 ("Simulação semestral de restauração… em `staging`").
- Evidência no código: não existe evidência de dump nem de restore em `docs/execucao/evidencias/` (`ls` sem `backup`/`restore`). Não há staging (PLC-26), e a revisão de 28/09 lista "ensaiar restauração" como pendente (revisao-do-plano-2026-09-28.md:95).
- O que falta: dump com hash, restore em projeto descartável com contagens conferidas e confirmação de PITR.
- Impacto no negócio: se o banco for corrompido, não há prova de que dá para recuperar pedidos, verbas e aprovações.
- Esforço: M
- Prioridade: P1

### PLC-28  Congelamento e caminho único de escrita no banco
- Status: NAO_INICIADA
- Origem do plano: plano-reconciliacao:49–62 (Etapa 1 "Revogar ou restringir tokens com escrita usados por ferramentas externas (Lovable, MCPs com `db_query` de escrita…)… Manter apenas um caminho de escrita: CI").
- Evidência no código: não há documento de congelamento em `docs/execucao/` (`grep -rli "congelamento" docs/execucao` só traz o plano). As migrations são aplicadas por MCP administrativo (aplicacao-migrations-20260923.md:40), e o MCP configurado nesta sessão se descreve com "acesso total ao banco". Não há `secret_rotation_log` documentando revogações.
- O que falta: revogar e restringir tokens de escrita externos e aplicar migrations só via workflow aprovado.
- Impacto no negócio: ferramentas externas podem alterar o banco de produção fora do controle de versão.
- Esforço: M
- Prioridade: P2

### PLC-29  Rotinas declaradas como cron sem agendamento no repositório
- Status: PARCIAL
- Origem do plano: plano-reconciliacao:601–610 (Etapa 43 "As que só existem como Edge Function (`cleanup-notifications`, `quote-followup-reminders`, `process-scheduled-reports`, `connections-auto-test`, `monthly-health-report`) continuam pendentes"); `supabase/functions/_shared/edge-authz-manifest.ts:93–109` (rationale "pg_cron" para cada função).
- Evidência no código: nenhuma migration agenda `quote-followup-reminders`, `process-scheduled-reports`, `send-scheduled-reports`, `send-digest`, `process-queue`, `cleanup-notifications` (Edge), `monthly-health-report`, `collections-watcher`, `favorites-watcher`, `comparison-price-watcher`, `connections-health-check` nem `ownership-audit` (`grep -l "<nome>" supabase/migrations/*.sql` vazio). Só `connections-auto-test`, `process-export-queue` e o worker de aprovações têm `cron.schedule`. `supabase/cron/cron-config.sql` é um script manual fora das migrations, que lê `current_setting('app.supabase_service_role_key')`. A tela `ScheduledReportsManager` (em `/dashboard`, `src/App.tsx:102`) deixa criar relatórios agendados que nenhum job processa. O estado do `cron.job` remoto não pôde ser consultado (MCP 401).
- O que falta: migrations com `cron.schedule` via wrappers lendo o Vault (padrão de `20260923140000`) para cada rotina, ou retirar as telas e funções sem uso.
- Impacto no negócio: lembretes de follow-up de orçamento, relatórios agendados e alertas de queda de preço não são enviados, e vendas podem ser perdidas sem que ninguém perceba.
- Esforço: M
- Prioridade: P1

### PLC-30  Seed determinístico de homologação bloqueado
- Status: BLOQUEADA_EXTERNA (falta o segredo `SICOOB_QA_USER_PASSWORD` no projeto)
- Origem do plano: plano-reconciliacao:269–280 (Etapa 16 "Seed idempotente… 5 papéis com usuários e vínculos").
- Evidência no código: reconciliacao-online-2026-09-28.md:30 ("`SICOOB_QA_USER_PASSWORD` também não existe: o seed QA atualizado falha fechado com HTTP 503"). `supabase/functions/sicoob-seed-qa/` existe. Avanço parcial: personas E2E criadas em 08/10 (segredos `E2E_*` no GitHub).
- O que falta: configurar o segredo e rodar o seed duas vezes, com evidência de idempotência.
- Impacto no negócio: sem massa de teste reprodutível, a homologação depende de dados montados à mão.
- Esforço: P
- Prioridade: P2

### PLC-31  Runbooks operacionais previstos não escritos
- Status: NAO_INICIADA
- Origem do plano: plano-reconciliacao:659–665 (Etapa 49 "`MIGRATIONS.md`, `RESTORE_PITR.md`, `EDGE_FUNCTION_DEPLOY.md`, `PARTITION_MAINTENANCE.md`, `RLS_INCIDENT.md`… executado uma vez por alguém que não o escreveu").
- Evidência no código: `ls docs/RUNBOOKS/` mostra só `CREDENTIAL_ROTATION.md` e `MCP_DDL_APPLICATION.md`.
- O que falta: os 5 runbooks e um ensaio feito por terceiro.
- Impacto no negócio: o conhecimento operacional fica na cabeça de quem fez.
- Esforço: M
- Prioridade: P2

### PLC-32  Limite de 100 Edge Functions do plano Supabase esgotado
- Status: BLOQUEADA_EXTERNA (plano ou contratação Supabase)
- Origem do plano: reconciliacao-online-2026-09-28.md:19 ("O deploy inicial… retornou HTTP 402 porque o projeto estava no limite de 100 funções"); fechamento-tecnico-2026-10-08.md:27–28.
- Evidência no código: há 106 fontes executáveis locais e 100 funções `ACTIVE`. Seis ficaram fora por decisão, entre elas os monitores `error-monitor` e `qa-block-monitor` e o stub `generate-mockup-nanobanana`.
- O que falta: ampliar o plano ou consolidar funções antes de qualquer nova Edge Function.
- Impacto no negócio: nenhuma nova funcionalidade de backend pode ser publicada sem antes remover outra.
- Esforço: M
- Prioridade: P2

### PLC-33  Rotação de credenciais históricas não comprovada
- Status: BLOQUEADA_EXTERNA (ação no Supabase, nos provedores e no painel)
- Origem do plano: plano-reconciliacao:507–518 (Etapa 34 "Service role e DB password rotacionados… `secret_rotation_log` atualizado"); plano-workflows:93 (W037 "para cada um dos 31 fingerprints confirmar rotação"), W090; auditoria-validacao-2026-09-22.md (pendência 6 "Confirmar no provedor a rotação da credencial histórica do `migrate-helper`").
- Evidência no código: `.gitleaksignore` tem 52 linhas e mantém os fingerprints históricos (inclusive `.env:jwt`). O checklist de fechamento de `docs/RUNBOOKS/CREDENTIAL_ROTATION.md:142–150` está todo desmarcado, e o calendário (linhas 116–122) registra só "revisão de presença", não rotação.
- O que falta: rotacionar service role, senha do banco e tokens históricos expostos e registrar a evidência sanitizada.
- Impacto no negócio: credenciais que já apareceram no histórico do Git podem continuar válidas.
- Esforço: M
- Prioridade: P1

---

### D. Observabilidade e segurança de borda
(origem: `autorizacao-observabilidade-20260922.md`, `backend-aprovacao-publica-20260922.md`, `plano-melhorias-50-etapas.md`, `plano-correcoes…` Etapa 18, `05_ROADMAP`)

### PLC-34  Sentry inativo na produção publicada
- Status: STUB/MOCK (código pronto, mas inerte por falta de DSN no build; depende da configuração da plataforma)
- Origem do plano: 05_ROADMAP_PROXIMOS_PASSOS.md:457 ("[x] Monitoring (Sentry)"); docs/OBSERVABILITY.md:52–63 ("Alertas Sentry"); plano-correcoes:179–186 (Etapa 18 "confirmar `VITE_SENTRY_DSN` em produção"); docs/execucao/decisoes_pendentes.md:24–27 ("verificar… configuração remota de Sentry").
- Evidência no código: `src/lib/sentry.ts:27–28` só inicializa com `VITE_SENTRY_DSN`. O chunk publicado `https://brindes-sicoob-v2.vercel.app/assets/sentry-2jhnaSZh.js` tem **78 bytes**: `function r(){}function e(t,n){}export{e as captureException,r as initSentry}`. O `error-reporter` publicado grava só em `telemetry_events`. Além disso, a CSP (`vercel.json`, `connect-src`) não libera `*.sentry.io`, então mesmo com DSN o envio seria bloqueado no navegador.
- O que falta: configurar o DSN no build de produção, liberar o domínio de ingestão na CSP e criar as regras de alerta.
- Impacto no negócio: erros de clientes em produção não geram aviso para a equipe.
- Esforço: P
- Prioridade: P1

### PLC-35  Alertas operacionais inexistentes
- Status: NAO_INICIADA
- Origem do plano: plano-melhorias:93 (etapa 48 "Ligar alertas nas functions de monitoramento já existentes (`health-check`, `error-monitor`)"); plano-reconciliacao:651–658 (Etapa 48 "alertas para: … `admin_audit_log_default > 0`; … `rls_denial_log`…; erros 5xx…; `cron.job_run_details` com `status='failed'`… Teste de disparo por regra").
- Evidência no código: `supabase/functions/health-check/index.ts` não chama `send-notification`, Slack nem e-mail (`grep -n "alert\|notify\|slack"` vazio). `error-monitor` e `qa-block-monitor` não estão publicados (fechamento-tecnico-2026-10-08.md:28). Nenhuma migration cria regra de alerta para partição default, `rls_denial_log` ou falha de cron. A exceção é o monitor da outbox de aprovações (`20260922225500`), que só materializa o problema no painel.
- O que falta: regras de alerta com canal definido e teste de disparo por regra.
- Impacto no negócio: falhas de rotina, de segurança ou de função só são descobertas quando um usuário reclama.
- Esforço: M
- Prioridade: P1

### PLC-36  Logging estruturado ausente em 77 Edge Functions legadas
- Status: PARCIAL
- Origem do plano: autorizacao-observabilidade-20260922.md (Pendências: "Observabilidade: 78 funções permanecem na exceção legada"); backend-aprovacao-publica-20260922.md (tabela de pendências "Observabilidade das funções legadas"); retomada-mcp-20260922.md:65.
- Evidência no código: `scripts/check-edge-structured-logging.mjs:29` tem `LEGACY_ALLOWLIST` com **77** funções (snapshot 84 na linha 55).
- O que falta: migrar as funções restantes para o logger padrão, com `request_id`.
- Impacto no negócio: quando algo falha nessas 77 funções, não há rastro para diagnosticar.
- Esforço: G
- Prioridade: P2

### PLC-37  Analytics de produto (PostHog)
- Status: NAO_INICIADA
- Origem do plano: 05_ROADMAP_PROXIMOS_PASSOS.md:458 ("[x] Analytics (PostHog)").
- Evidência no código: `grep -rli posthog src supabase/functions package.json` não tem resultado.
- O que falta: implementar a ferramenta ou retirar do roadmap (decidir entre PostHog e outra).
- Impacto no negócio: não há dados de uso e funil para orientar melhorias.
- Esforço: P
- Prioridade: P3

### PLC-38  Rate limiting só em parte das funções e ausente nas RPCs públicas
- Status: PARCIAL
- Origem do plano: plano-melhorias:71 (etapa 32 "Rate limiting real (compartilhado…) nas functions públicas"); 05_ROADMAP_PROXIMOS_PASSOS.md:484 ("[x] Rate limiting"); backend-aprovacao-publica-20260922.md (Limites: "O rate limiter da Edge Function não cobre chamadas diretas às RPCs, nem fornece limitação distribuída"; pendência média "Rate limiting distribuído e proteção das RPCs públicas"); auditoria-tecnica-2026-10-02.md:165 (#6 backlog).
- Evidência no código: `grep -lE 'runBotProtection|checkRateLimit|rateLimit|…' supabase/functions/*/index.ts` encontra **21 de 108** funções. O limitador persistente está em `supabase/functions/_shared/bot-protection.ts:155` (`rpc('check_rate_limit')`). Não há limitação nas RPCs públicas de aprovação expostas via PostgREST.
- O que falta: aplicar o limitador a todas as funções públicas e proteger as RPCs públicas (limitação no banco ou só via Edge).
- Impacto no negócio: o link público de aprovação e as APIs abertas podem ser abusados (força bruta de token, custo de IA).
- Esforço: M
- Prioridade: P1

### PLC-39  CSP e cabeçalhos de segurança ausentes na raiz do domínio publicado
- Status: PARCIAL
- Origem do plano: plano-melhorias:65–67 (etapa 28 "✅ corrigido: … `vercel.json` entrega a mesma política na Vercel"); revisao-do-plano-2026-09-28.md:48 (A09 "GET no domínio… retornou 200 sem header CSP"); auditoria-tecnica-2026-10-02.md:166 (#7 "CSP `script-src` sem unsafe-inline (nonce)").
- Evidência no código: `curl -I https://brindes-sicoob-v2.vercel.app/` (11/10/2026) não traz `content-security-policy`, `x-content-type-options`, `referrer-policy`, `permissions-policy` nem `cross-origin-*`. `curl -I …/login` e `…/index.html` trazem a CSP de `vercel.json`. A regra `"/:path*"` em `vercel.json` não está valendo para `/`. O `script-src` continua com `'unsafe-inline'`.
- O que falta: regra explícita para `/` (ou `source: "/(.*)"`) com teste automatizado da resposta publicada, e CSP com nonce.
- Impacto no negócio: a página de entrada do portal fica sem proteção contra injeção de scripts e clickjacking.
- Esforço: P
- Prioridade: P1

---

### E. Integrações e operação externa
(origem: `notificacoes-duraveis-20260922.md`, `auditoria-validacao-2026-09-22.md`, `reconciliacao-online-2026-09-28.md`, `retomada-mcp-20260922.md`, `decisoes_pendentes.md`, `05_ROADMAP`)

### PLC-40  Scanner antimalware de documentos não configurado: ingestão de NF e comprovante recusa tudo
- Status: BLOQUEADA_EXTERNA (contratar ou configurar o scanner privado e os segredos)
- Origem do plano: auditoria-validacao-2026-09-22.md (Pendências 2 "Configurar `SICOOB_MALWARE_SCANNER_URL` e `SICOOB_MALWARE_SCANNER_TOKEN`… executar arquivos EICAR"); revisao-do-plano-2026-09-28.md:45 (A06); reconciliacao-online-2026-09-28.md:30 ("ainda não existem; a ingestão… recusa o arquivo com HTTP 503").
- Evidência no código: `supabase/functions/sicoob-document-ingest/scanner.ts` falha fechado sem configuração. Não há registro posterior de configuração (revisao-do-plano-2026-10-01.md, P075/P107/P109, "configuração e homologação atuais do scanner não foram verificadas").
- O que falta: provedor de scanner, segredos e homologação com EICAR, timeout e parecer inválido.
- Impacto no negócio: as cooperativas não conseguem anexar nota fiscal nem comprovante de pagamento, e o ciclo financeiro e logístico do pedido não fecha.
- Esforço: M
- Prioridade: P0

### PLC-41  Entrega real de notificações (e-mail e Slack) e reconciliação não homologadas
- Status: BLOQUEADA_EXTERNA (credenciais Resend/Slack e destinos autorizados)
- Origem do plano: notificacoes-duraveis-20260922.md:46–56 ("configurar `RESEND_API_KEY` e `NOTIFICATION_FROM_EMAIL`… homologar Slack/Resend com destinos de teste… verificar o painel, os crons e uma reconciliação real"); auditoria-validacao-2026-09-22.md (Pendência 5 "envio real para provedores de teste e reconciliação de `uncertain`/`failed`").
- Evidência no código: o código está pronto (`supabase/functions/_shared/approval-delivery.ts`, rota `/admin/sicoob/notificacoes` em `src/routes/config/admin.ts:14`). `docs/secrets.md` não registra `RESEND_API_KEY`/`NOTIFICATION_FROM_EMAIL` como configurados. Só `SICOOB_APPROVAL_WORKER_SECRET` aparece como criado (reconciliacao-online:30).
- O que falta: configurar os provedores e ensaiar entrega, falha parcial, retry e reconciliação de `uncertain`.
- Impacto no negócio: aprovadores podem não receber o pedido de aprovação, e as compras ficam paradas.
- Esforço: M
- Prioridade: P1

### PLC-42  Bitrix24: decisão de produto e homologação pendentes
- Status: BLOQUEADA_EXTERNA (decisão de negócio e credenciais)
- Origem do plano: 05_ROADMAP_PROXIMOS_PASSOS.md:327–338 ("[x] Autenticação OAuth… Importar clientes… Criar deals… Webhooks"); plano-correcoes:105–114 (Etapa 9); decisoes_pendentes.md:8–12 ("a sync com Bitrix24 ainda é ativa?"); retomada-mcp-20260922.md:61 ("Homologar `bitrix-sync` publicada…").
- Evidência no código: as tabelas `bitrix_clients`/`bitrix_deals`/`bitrix_sync_logs` existem em `src/integrations/supabase/types.ts:1574,1631`. As funções `bitrix-sync` e `sync-quote-bitrix` existem. `docs/secrets.md:21` (`BITRIX24_WEBHOOK_URL`) está como "**preencher**". Não há fluxo OAuth (o webhook é por URL).
- O que falta: decidir manter ou remover; se manter, configurar, homologar volume e paginação e atualizar o roadmap.
- Impacto no negócio: o roadmap diz que o CRM está integrado, mas não há prova de sincronização real.
- Esforço: M
- Prioridade: P2

### PLC-43  Gateway de pagamento (Mercado Pago), webhooks e conciliação automática
- Status: NAO_INICIADA
- Origem do plano: 05_ROADMAP_PROXIMOS_PASSOS.md:268–279 ("[x] Integração Mercado Pago… [x] Webhooks… [x] Conciliação"), :663.
- Evidência no código: `grep -rli "mercadopago\|mercado_pago\|MercadoPago" src supabase/functions package.json` não tem resultado. Só existe o registro manual de parcelas (`sicoob_order_payments`).
- O que falta: decidir se o Sicoob precisa de cobrança online. Se sim, implementar; se não, retirar formalmente do roadmap.
- Impacto no negócio: o roadmap declara uma cobrança integrada que não existe.
- Esforço: G
- Prioridade: P2

### PLC-44  WhatsApp Business API (envio de link de aprovação, notificações de status, chat)
- Status: NAO_INICIADA
- Origem do plano: 05_ROADMAP_PROXIMOS_PASSOS.md:356–366 ("[x] API WhatsApp Business… Enviar link de aprovação… Notificações de status… Chat com cliente").
- Evidência no código: só há deep links `wa.me` e botões de copiar (`src/components/bi/ChurnRiskBanner.tsx:108`, `ExecutiveSummaryButton.tsx:96`, `BIBriefingMode.tsx:350`). Nenhuma Edge Function chama a API do WhatsApp ou da Evolution (`grep -rli "evolution" supabase/functions` traz só testes de conexão).
- O que falta: integração com a API e o canal na outbox de notificações, ou retirada de escopo.
- Impacto no negócio: o aprovador não recebe o link pelo canal que mais usa.
- Esforço: G
- Prioridade: P2

### PLC-45  Workflows n8n (aprovado → e-mail, pedido → notificação, pagamento → Bitrix)
- Status: PARCIAL
- Origem do plano: 05_ROADMAP_PROXIMOS_PASSOS.md:342–352.
- Evidência no código: só `supabase/functions/quote-sync/index.ts:11` lê `N8N_QUOTE_WEBHOOK_URL` (opcional). Não há workflow n8n versionado nem segredo registrado em `docs/secrets.md`.
- O que falta: versionar e configurar os três fluxos, ou trocá-los pela outbox nativa.
- Impacto no negócio: automações prometidas podem não existir.
- Esforço: M
- Prioridade: P3

### PLC-46  Catálogo externo: credencial somente leitura certificada e semântica de reserva de estoque
- Status: BLOQUEADA_EXTERNA (credencial do projeto `doufsxqlfjyuvxuezpln` e decisão de negócio)
- Origem do plano: revalidacao-corretiva-2026-09-12.md:81 ("[ ] Definir e implementar a semântica de reserva no catálogo externo somente leitura (A05)"); retomada-mcp-20260922.md:60 ("Disponibilizar uma credencial com leitura completa e somente leitura… hoje produtos, imagens e estoque não podem ser homologados"); benchmark-32 B08 ("Confirmar privilégios somente leitura da identidade no banco de catálogo").
- Evidência no código: `supabase/functions/external-db-bridge/index.ts:479–481` recusa escrita (`CATALOG_READ_ONLY`), mas não há certificado de privilégio da identidade. `grep -rli "reserva\|reservation" src/services/sicoob` não traz mecanismo de reserva.
- O que falta: credencial somente leitura auditada e regra de reserva ou compromisso de estoque.
- Impacto no negócio: dois pedidos podem disputar o mesmo estoque sem garantia.
- Esforço: M
- Prioridade: P2

---

### F. Funcionalidades órfãs, stubs e decisões de escopo
(origem: `plano-correcoes-auditoria-50-etapas-20260917.md` Fases D e E, `decisoes_pendentes.md`, `correcoes-validacao-2026-09-14.md`, `correcoes-reconciliacao-20260922.md`, `retomada-mcp-20260922.md`)

### PLC-47  Telas de cadastro e edição de catálogo gravam no catálogo externo somente leitura (403)
- Status: STUB/MOCK (a UI existe e o salvamento falha sempre)
- Origem do plano: correcoes-reconciliacao-20260922.md (seção "Contrato de somente leitura do catálogo": "há interfaces legadas que ainda oferecem edição de produtos, imagens, variantes, fornecedores e técnicas… falharão com `CATALOG_READ_ONLY`. Migrar… ou retirar os controles"); autorizacao-observabilidade-20260922.md ("controles legados de edição exigem adaptação local").
- Evidência no código: `/admin/cadastros` → `src/pages/ProductRegistrationPage.tsx` → `useProductRegistration.ts:171` → `useExternalDatabase.ts:174` `invoke('insert')`. O bridge responde 403 (`external-db-bridge/index.ts:479–481`). Outros 23 arquivos chamam `operation: 'insert'|'update'|'delete'` no bridge, entre eles `src/hooks/tecnicas/useTecnicaMutations.ts:22`, `src/components/admin/products/useProductsManager.ts`, `useProductVariants.ts`, `image-gallery/useProductImageGallery.ts`, `suppliers-manager/useSuppliersManager.ts` e `hooks/gravacao/*`.
- O que falta: decidir o fluxo de cadastro (entidades locais ou edição no sistema de origem) e retirar ou desabilitar os controles que não podem funcionar.
- Impacto no negócio: o administrador preenche formulários de produto e técnica que nunca são salvos.
- Esforço: M
- Prioridade: P1

### PLC-48  Login por passkey/WebAuthn exposto na UI, mas desativado
- Status: STUB/MOCK
- Origem do plano: retomada-mcp-20260922.md:62 ("WebAuthn/passkeys permanecem indisponíveis até haver verificação de assinatura no servidor"); auditoria-20260922/RELATORIO.md:195–240 (`user_passkeys` sem contrato).
- Evidência no código: `src/hooks/useWebAuthn.ts:17–33` retorna `isSupported: false` e funções que respondem `false`/`[]`. A aba "Passkeys" continua renderizada (`src/components/security/SecurityDashboardSections.tsx:681–682,710`) e `src/components/auth/PasskeyLogin.tsx` existe. A tabela `user_passkeys` não está nos tipos.
- O que falta: implementar a verificação no servidor (desafio, origem, RP ID, contador) ou esconder a aba e o botão.
- Impacto no negócio: o usuário vê uma opção de segurança que não funciona.
- Esforço: M
- Prioridade: P2

### PLC-49  Páginas administrativas prontas e não roteadas
- Status: ORFA
- Origem do plano: correcoes-validacao-2026-09-14.md:1030–1034 ("o próprio path da página (`/admin/auditoria`) também não têm rota registrada… só falta religar a rota").
- Evidência no código: `src/pages/admin/AdminAuditPage.tsx` não é referenciada em `src/routes/config/*` nem em `App.tsx` (`grep -rn "AdminAuditPage"` só traz o próprio arquivo). `src/pages/admin/AdminCadastrosPage.tsx`, que carrega `ProductsManager`, também não é referenciada.
- O que falta: rotear com guarda admin e MFA ou remover.
- Impacto no negócio: a trilha de auditoria administrativa construída não pode ser consultada pela interface.
- Esforço: P
- Prioridade: P2

### PLC-50  RPCs e tabelas prontas sem nenhuma tela
- Status: ORFA
- Origem do plano: plano-correcoes:237–244 (Etapa 25 "RPCs Sicoob prontas mas nunca chamadas"); evidencias/etapa25_rpcs_sicoob_nao_ligadas_20260917.md:9–14.
- Evidência no código: `generate_sicoob_performance_report`, `sicoob_performance_reports`, `log_quote_action`, `quote_audit_logs` e `sicoob_approval_policies` têm zero referências em `src/` e `supabase/functions/` fora de `types.ts`.
- O que falta: tela de relatório de performance Sicoob, trilha `quote_audit_logs` e gestão de políticas de aprovação, ou retirada formal.
- Impacto no negócio: um relatório de desempenho das cooperativas já modelado no banco não chega ao gestor.
- Esforço: M
- Prioridade: P2

### PLC-51  Views de auditoria sem painel (`sicoob_budget_audit`, `v_full_scope_grants`)
- Status: ORFA
- Origem do plano: plano-correcoes:245–253 (Etapa 26 "adicionar seção ao dashboard consumindo essas 2 views"); decisoes_pendentes.md:49–53; revisao-do-plano-2026-09-28.md:58 (P127).
- Evidência no código: `grep -rn "sicoob_budget_audit\|v_full_scope_grants" src` só traz `types.ts`. A view foi corrigida em `20260922150000_reconcile_audit_controls.sql:251–279`.
- O que falta: cards em `src/pages/admin/AuditEvidenceDashboard.tsx` (reconciliação de verba por PA e concessões de escopo total).
- Impacto no negócio: divergências entre a verba registrada e a gasta não aparecem para ninguém.
- Esforço: P
- Prioridade: P2

### PLC-52  Magic Up colaborativo (comentários, compartilhamento público, reações)
- Status: ORFA
- Origem do plano: plano-correcoes:230–236 (Etapa 24); decisoes_pendentes.md:46–47; revisao-do-plano-2026-09-28.md:58 (P123).
- Evidência no código: `magic_up_comments`, `magic_up_public_shares` e `magic_up_reactions` estão nos tipos, sem consumidor em `src` nem em `supabase/functions`.
- O que falta: decisão de produto (construir ou remover).
- Impacto no negócio: baixo; schema sem uso.
- Esforço: M
- Prioridade: P3

### PLC-53  Módulo white-label de comparação sem importador
- Status: ORFA
- Origem do plano: plano-correcoes:153 (Etapa 15 item 4 "decidir entre corrigir… ou remover o módulo"); decisoes_pendentes.md:34–35.
- Evidência no código: `src/lib/pdf/whitelabel-comparison.ts` existe e `grep -rln "whitelabel-comparison" src` só traz o próprio arquivo.
- O que falta: decidir se reativa ou remove.
- Impacto no negócio: código morto.
- Esforço: P
- Prioridade: P3

### PLC-54  Objetos candidatos à remoção sem decisão
- Status: BLOQUEADA_EXTERNA (aprovação de quem decide)
- Origem do plano: plano-correcoes:215 (Etapa 22 família `pontos_atendimento`), :223 (Etapa 23 `blog_posts`), :256 (Etapa 27 "Classificar as 43 funções órfãs"), :263 (Etapa 28 buckets `order-documents`, `component-media`); decisoes_pendentes.md:40–44.
- Evidência no código: `pontos_atendimento`, `pa_singularidades` e `blog_posts` estão nos tipos sem consumidor em `src` (grep com 0 usos). Não existe classificação final das 43 funções (correcoes-reconciliacao-20260922.md, linha da Etapa 27: "Aberta").
- O que falta: decisão registrada e migration de remoção ou documentação de reserva.
- Impacto no negócio: um schema confuso aumenta o risco de gravar no lugar errado.
- Esforço: P
- Prioridade: P3

### PLC-55  Decisões pendentes e backlog sem dono, prazo ou rastreio
- Status: NAO_INICIADA
- Origem do plano: plano-correcoes:341 (Etapa 38 "Levar as decisões pendentes para quem decide"), :396 (Etapa 46 "Backlog formal… com dono e prazo"), :414 (Etapa 49 "Prazo de decisão para os órfãos"); revisao-do-plano-2026-09-28.md:58 (P005 "responsáveis nominais").
- Evidência no código: `docs/execucao/decisoes_pendentes.md` (13 seções, sem dono nem prazo). `github_list_issues(state=all)` não retorna nenhuma issue. revisao-do-plano-2026-09-28.md:22 registra "150 estados `Planejada`, 900 checkboxes falsos e responsáveis/revisores nominais não preenchidos".
- O que falta: transformar as decisões em itens rastreáveis com responsável e data.
- Impacto no negócio: as pendências de negócio não andam porque ninguém foi formalmente cobrado.
- Esforço: P
- Prioridade: P2

### PLC-56  Documentação legada contradiz o estado real
- Status: PARCIAL
- Origem do plano: revisao-do-plano-2026-09-27.md:82–84 ("`docs/README.md` ainda aponta para `MELHORIAS_PENDENTES_PLANO_IMPLEMENTACAO.md`, que não existe… Roadmap legado anuncia banco/Auth/Edges prontos"); 05_ROADMAP_PROXIMOS_PASSOS.md:72–88 ("[x] Criar useOrgData() hook… `src/hooks/useOrgData.ts`") e :725 ("✅ Roadmap completo!").
- Evidência no código: `docs/README.md:1` diz "Documentação do Gifts Store", e as linhas 31, 65, 72 e 98 apontam para um arquivo inexistente (`ls docs/MELHORIAS_PENDENTES*` sem resultado). O roadmap marca como ✅ itens sem código: `useOrgData`/`useOrgCreate`/`useOrgUpdate`/`useOrgDelete` (0 ocorrências), Mercado Pago (PLC-43), WhatsApp API (PLC-44), PostHog (PLC-37), Sentry ativo (PLC-34), cobertura > 80% (PLC-15) e backups testados (PLC-27).
- O que falta: rebaixar o roadmap a histórico, corrigir os links de `docs/README.md` e marcar os itens não feitos.
- Impacto no negócio: quem lê a documentação acredita que coisas inexistentes estão prontas.
- Esforço: P
- Prioridade: P2

---

### G. Lacunas de produto Sicoob registradas nas revisões de 24/09, 27/09 e 28/09 que seguem abertas
(origem: `revisao-do-plano-2026-09-24.md`, `revisao-do-plano-2026-09-27.md`, `revisao-do-plano-2026-09-28.md`, `revisao-plano-20260927/benchmark-32.json`, `revisao-plano-20260928/matriz-150.json`. Podem coincidir com a fatia dos planos de produto de 100/150 etapas.)

### PLC-57  Capacidade física da embalagem do kit não validada
- Status: NAO_INICIADA
- Origem do plano: revisao-do-plano-2026-09-24.md:46 (A11); revisao-do-plano-2026-09-27.md:60 (F12); revisao-do-plano-2026-09-28.md:51 (A12, P095/P096); benchmark-32 B19.
- Evidência no código: `supabase/functions/sicoob-kit-quote/catalog.ts:110–160` valida preço, mínimo, variante e "exatamente uma embalagem" (linha 133), mas não volume, peso nem capacidade. `grep -n "capacity\|capacidade\|peso\|weight" supabase/functions/sicoob-kit-quote/*.ts` não tem resultado.
- O que falta: modelo de capacidade e geometria, regra para dado desconhecido e validação no servidor.
- Impacto no negócio: um kit vendido pode não caber na caixa, gerando retrabalho e atraso na entrega.
- Esforço: M
- Prioridade: P2

### PLC-58  Previsão de estoque do kit sem níveis de confiança (buffer fixo de 3 dias)
- Status: PARCIAL
- Origem do plano: revisao-do-plano-2026-09-24.md:45 (A10); revisao-do-plano-2026-09-28.md:50 (A11); benchmark-32 B26 ("Estoque futuro com níveis de confiança").
- Evidência no código: `src/hooks/useKitStockForecast.ts:44` (`const BUFFER_DAYS = 3`) é usado nas linhas 218–220. Não há campo de confiança. Já concluído: a chave de cache inclui as unidades (linhas 36–42).
- O que falta: nível de confiança por entrada e buffer configurável ou derivado.
- Impacto no negócio: a data prometida ao cliente pode ser otimista demais.
- Esforço: M
- Prioridade: P2

### PLC-59  Rascunho automático do orçamento sem controle entre abas e sem limpeza no logout
- Status: PARCIAL
- Origem do plano: revisao-do-plano-2026-09-28.md:43 (A04 "cancelamento de saves atrasados… conflito entre abas") e :58 (P056); revisao-do-plano-2026-09-24.md:37 (A04 "limpar/inutilizar na troca de sessão").
- Evidência no código: `src/hooks/useAutoSave.ts` não tem listener de evento `storage` nem `BroadcastChannel` (grep vazio). `src/contexts/AuthContext.tsx:99–108` (`clearSensitiveBrowserData`) não remove `autosave_*`. Já concluído: escopo por usuário (`QuoteAutoSave.tsx:121–123`) e versão e retenção (`useAutoSave.ts:19–25`).
- O que falta: detectar edição concorrente entre abas, cancelar saves atrasados e limpar os rascunhos no logout.
- Impacto no negócio: em computador compartilhado, rascunhos com dados de cliente ficam no navegador, e duas abas podem sobrescrever uma à outra.
- Esforço: P
- Prioridade: P3

### PLC-60  Cotações institucionais (2–3 propostas de fornecedores) e exceção de fornecedor único
- Status: NAO_INICIADA
- Origem do plano: revisao-do-plano-2026-09-27.md:69 (E060); revisao-do-plano-2026-09-28.md:58 (P087/P088); benchmark-32 B15.
- Evidência no código: `grep -rli "fornecedor único\|single_supplier\|supplier_proposals\|propostas de fornecedor" src supabase/migrations` não tem resultado.
- O que falta: propostas versionadas comparáveis (quantidade, tributos, frete, validade) e autoridade de exceção com trilha.
- Impacto no negócio: a cooperativa não consegue comprovar concorrência de preços, exigência típica de governança de compras.
- Esforço: G
- Prioridade: P2

### PLC-61  Importação assistida da distribuição (destinos e quantidades por planilha)
- Status: NAO_INICIADA
- Origem do plano: revisao-do-plano-2026-09-28.md:58 (P113 "Implementar modelo, validação por linha, prévia e confirmação atômica").
- Evidência no código: não há importação de planilha nos componentes Sicoob de destino e distribuição (o grep de `xlsx|csv` em `src/components/sicoob` só traz exportação em outros módulos).
- O que falta: modelo, validação por linha, prévia e confirmação atômica.
- Impacto no negócio: a distribuição para muitas unidades precisa ser digitada à mão.
- Esforço: M
- Prioridade: P2

### PLC-62  Campanhas: marcos regressivos e modelos salvos por cooperativa
- Status: NAO_INICIADA
- Origem do plano: revisao-do-plano-2026-09-28.md:58 (P122 "marcos regressivos de campanha"); revisao-do-plano-2026-09-27.md:71 (E051/E052); benchmark-32 B28 ("Modelos de campanha salvos pela cooperativa").
- Evidência no código: não há tabela ou tela de marcos de campanha (`grep -rln "campaign_milestones\|marcos" supabase/migrations` vazio). Os marcos existentes são só do fluxo do pedido (`LogisticsCommandCenter.tsx:59`) e do SLA (`SLABadge.tsx:26`).
- O que falta: marcos regressivos com impacto de atraso e modelos institucionais por cooperativa.
- Impacto no negócio: campanhas com data fixa (ex.: Dia do Cooperativismo) não têm alerta de prazo.
- Esforço: M
- Prioridade: P2

### PLC-63  Ciclo pós-venda incompleto (cancelamento por item/destino, avaria, crédito, conciliação, competência)
- Status: PARCIAL
- Origem do plano: revisao-do-plano-2026-09-24.md:49 (A14); revisao-do-plano-2026-09-27.md:72–73 (E017/E062, E069/E072/E077); revisao-do-plano-2026-09-28.md:62.
- Evidência no código: existem eventos, recebimento parcial e parcelas (`sicoob_order_payments`, `20260922225200_materialize_overdue_sicoob_payments.sql`). Não foram localizados fluxo de reposição/crédito/reabertura por avaria nem fechamento de competência de verba (sem RPC de "fechar competência" nas migrations).
- O que falta: completar o caminho contratado → faturado → entregue → pago, com parcialidades, avaria (protocolo, crédito, reposição) e virada de competência.
- Impacto no negócio: problemas de entrega e de estorno de verba são tratados fora do sistema, sem trilha.
- Esforço: G
- Prioridade: P2

### PLC-64  Homologação integral, gate de release e piloto
- Status: BLOQUEADA_EXTERNA (cooperativas piloto, responsáveis nominais, compra real, aceite de marca e acessibilidade)
- Origem do plano: plano-reconciliacao:666–678 (Etapa 50 "82 cenários de negócio verdes… Gate assinado"); plano-correcoes:364 (Etapa 41 "4 fluxos testados com evidência"); revisao-do-plano-2026-09-28.md:95; fechamento-tecnico-2026-10-08.md:44–52 (5 marcos de negócio abertos); revalidacao-corretiva-2026-09-12.md:82–86.
- Evidência no código: não existe `docs/execucao/gate-release-*.md`. O fechamento técnico declara "candidato de construção tecnicamente validado", sem compra real, sem duas cooperativas, sem conciliação e sem 30 dias de estabilidade.
- O que falta: decisão formal do piloto, compra sintética e depois real com duas cooperativas e três destinos, aceites de marca, acessibilidade e usuários, e 30 dias de observação.
- Impacto no negócio: o portal ainda não pode ser declarado pronto para operação real.
- Esforço: G
- Prioridade: P1

### PLC-65  Dados de catálogo incompletos no mapeamento (campos fiscais e materiais)
- Status: PARCIAL
- Origem do plano: correcoes-validacao-2026-09-14.md:2475 ("esses ~30 campos ficam **sempre `undefined` em produção**… NCM, alíquotas fiscais, … SEO… Recomenda-se investigação futura"), :2979 ("`mapLightweightToProduct`… grava `materials: []` sempre… todo produto é filtrado quando esse fallback está ativo").
- Evidência no código: `src/components/admin/products/useProductsManager.ts:21–31` (`PromobrindProductRow` com `ncm_code?`, `ipi_rate?` etc. opcionais). As constantes de SELECT em `src/lib/external-db/product-types.ts` não selecionam `ncm_code`/`icms_rate`/`meta_title` (grep vazio). `src/hooks/useProductsLightweight.ts:77` (`materials: []`) é consumido por `materialTextFilter` em `src/hooks/useCatalogFiltering.ts:113–121`.
- O que falta: selecionar as colunas reais (após confirmar que existem no catálogo) e popular `materials`, ou remover o fallback textual.
- Impacto no negócio: dados fiscais aparecem vazios no admin, e o filtro de material pode esconder todos os produtos.
- Esforço: P
- Prioridade: P3

---

## Fontes lidas

**Planos e roadmap**
- `docs/05_ROADMAP_PROXIMOS_PASSOS.md` (inteiro)
- `docs/plano-melhorias-50-etapas.md` (inteiro; etapa 17 lida pelo cabeçalho e pela conclusão)
- `docs/plano-implementacao/plano-reconciliacao-50-etapas.md` (inteiro)
- `docs/plano-implementacao/plano-correcoes-auditoria-50-etapas-20260917.md` (inteiro)
- `docs/plano-implementacao/plano-workflows-github-100-etapas-20260927.md` (inteiro)

**Validações e auditorias**
- `docs/correcoes-validacao-2026-09-13.md` (inteiro)
- `docs/correcoes-validacao-2026-09-14.md` (cabeçalhos, grep de pendências e notas de risco: linhas 108–138, 1030–1060, 2466–2480, 2977–2982, 3079–3083, 4864–4870)
- `docs/auditoria-validacao-2026-09-22.md` (inteiro)
- `docs/execucao/auditoria-20260922/RELATORIO.md` (seções 2, 5.2, 10) e `docs/execucao/auditoria-api-20260922/RELATORIO.md` (seções 3, 4, 8, 9)

**Revisões de plano**
- `docs/execucao/revisao-do-plano-2026-09-24.md`, `-09-27.md` e `-09-28.md` (inteiros)
- `docs/execucao/revisao-do-plano-2026-10-01.md` (só como referência cruzada de estado)
- `docs/execucao/revisao-plano-20260927/benchmark-32.json`
- `docs/execucao/revisao-plano-20260928/matriz-150.json` (itens N)
- `docs/execucao/revisao-plano-20261001/workflows-100.json` (referência cruzada, revalidada em HEAD)

**Execuções, paridade e evidências**
- `docs/execucao/reconciliacao-online-2026-09-28.md`, `paridade-github-banco-20260927.md`, `auditoria-paridade-local-github-supabase-2026-09-24.md` (tabela), `auditoria-reconciliacao-github-banco-2026-09-15.md` (seções Edge, CI e reconciliação)
- `docs/execucao/notificacoes-duraveis-20260922.md`, `backend-aprovacao-publica-20260922.md`, `autorizacao-observabilidade-20260922.md`, `retomada-mcp-20260922.md` (pendências), `preflight-reconciliacao-sicoob.md`, `correcoes-reconciliacao-20260922.md` (tabela das 50 etapas), `correcoes-revisao-2026-09-12.md` (dependências), `revalidacao-corretiva-2026-09-12.md` (checklist), `aplicacao-migrations-20260923.md` (limites), `validacao-do-plano.md` (critérios e dependências)
- `docs/execucao/decisoes_pendentes.md`, `docs/execucao/fechamento-tecnico-2026-10-08.md`, `docs/execucao/auditoria-tecnica-2026-10-02.md` (top 10 e roadmap, como referência)
- Evidências `etapa22`–`etapa28`, `sentry_check_20260917.md`, `funcoes_orfas_20260917.md`

**Código e configuração conferidos**
- `.github/workflows/*.yml` (13), `.github/dependabot.yml`, `.lighthouserc.cjs`, `.husky/*`, `vitest.config.ts`, `vercel.json`, `package.json`
- `scripts/db/migration-ledger-baseline.json`, `scripts/check-edge-structured-logging.mjs`, `scripts/qa/check-bundle-budget.mjs`
- `supabase/migrations/*` (cron, status, idempotência), `supabase/cron/cron-config.sql`, `supabase/functions/{external-db-bridge,sicoob-kit-quote,product-webhook,health-check,deploy lists}`, `supabase/functions/_shared/edge-authz-manifest.ts`
- `src/services/QuoteService.ts`, `src/hooks/quotes/useQuotes.ts`, `src/components/quotes/QuoteAutoSave.tsx`, `src/hooks/useAutoSave.ts`, `src/contexts/AuthContext.tsx`, `src/services/sicoob/{logisticsReportService,budgetService,statsService}.ts`, `src/hooks/useKitStockForecast.ts`, `src/hooks/useWebAuthn.ts`, `src/hooks/useProductRegistration.ts`, `src/hooks/useExternalDatabase.ts`, `src/lib/sentry.ts`, `src/routes/config/*.ts`, `src/App.tsx`

**Sistemas externos (somente leitura)**
- GitHub API: branch protection, repositório, rulesets, environments, Actions permissions e selected-actions, alertas de vulnerabilidade, nomes de secrets, labels, PRs abertos, issues, runs de `main` e run 37775844412
- HTTP sem sessão: `https://brindes-sicoob-v2.vercel.app/` (`/`, `/login`, `/index.html`, chunks `index-*.js`, `sentry-*.js`, `error-reporter-*.js`) e `https://criar-together-now.lovable.app/`
- MCP Supabase do banco canônico: tentativa respondida com **401** (sem leitura do banco nesta rodada)
