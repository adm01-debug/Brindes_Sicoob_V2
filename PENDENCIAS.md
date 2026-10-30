# Pendências de CI — adm01-debug/Brindes_Sicoob_V2

Atualizado em: 2026-10-30

## Snapshot atual da `main` — consulta 30/10/2026

Conta somente a execução mais recente de cada workflow com `head_branch=main`.
Os fixes preparados estão na PR #176; não foram mesclados porque E2E seguro e a
revisão humana ainda estão pendentes.

| Workflow | Último status em `main` | Causa / situação exata | Run |
|---|---|---|---|
| Publicar funções Sicoob | `failure` (28/10) | O Supabase CLI informou `No change found` para `sicoob-approval-reconciliation`, que ficou na versão 5; o verificador antigo exigia incremento mesmo sem mudança. A PR #176 agora aceita versão igual somente quando ela existe e não regrediu. O deploy remoto não foi repetido porque o run em main ocultou o project ref e o secret explícito de construção ainda não foi confirmado. | [40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102) |
| Security Scan | `failure` (27/10) | `npm audit` encontrou `undici@8.10.2` e `zod@3.25.76` em severidade alta. A correção em #176 — `undici@8.12.2`, Zod `4.6.7` com compatibilizações — passou audit e Gitleaks no SHA atual da PR. `main` aguarda merge e novo run. | [40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) |
| Qualidade contínua | `failure` (27/10) | A etapa `npm run check:npm-audit` falhou pelos mesmos dois pacotes vulneráveis. O SHA atual de #176 passou typecheck, lint, suíte completa, simulações PostgreSQL e build. | [40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) |
| CodeQL | `failure` (27/10) | `init` v4.39.1 misturado com `autobuild/analyze` v4.38.2; erro de configuração impediu SARIF. #176 alinha os três componentes e o check `Analyze (javascript-typescript)` passou. | [40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) |
| Running Copilot Code Review | `failure` (22/10) | O log apresenta HTTP 402 `errorType: quota`, “You've reached your additional usage limit”. Bloqueio do plano/serviço gerenciado pelo GitHub; não é corrigível no código. A execução mais recente na PR #176 também falha por quota/ambiente do Copilot. | [39785094125](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39785094125) |
| Dependabot — `@vitest/mocker` | `failure` (22/10, evento dinâmico na `main`) | `security_update_not_possible`: o updater resolvia `4.1.11`, mas a versão não vulnerável era `4.1.12`. O código atual da `main` já contém `@vitest/mocker@4.1.12` desde PR #139; a falha é de uma tentativa histórica e a correção não deve ser desfeita. | [39775463512](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39775463512) |
| E2E (Playwright) | `startup_failure` (08/10) | O run na `main` não iniciou jobs e não tem logs que revelem a causa. O preflight mais recente em PR #176 falhou antes de chamadas remotas porque falta o ref E2E. O workflow da #176 agora exige o environment `e2e-staging`, credenciais com prefixo `E2E_STAGING_`, ref correspondente e bloqueia os dois projetos não graváveis. | [37775702358](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/37775702358) |
| Bundle Size Check | `failure` (27/09) | Logs do run expiraram (HTTP 404); não é possível provar a causa histórica. No SHA atual de #176, o orçamento passou. | [36353765911](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765911) |
| Lighthouse Performance Audit | `failure` (27/09) | Logs do run expiraram (HTTP 404); não é possível provar a causa histórica. No SHA atual de #176, Lighthouse passou no runner Ubuntu. | [36353765910](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765910) |

### Checks verdes observados

Migration ledger drift [41013281253](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41013281253), Branch Protection Sentinel [40602983038](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983038), Enterprise Compliance [40602982958](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982958), Dependabot `undici` [40603001428](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40603001428), Dependabot `zod` [40603001197](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40603001197) e Portal Sicoob [39868499315](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39868499315). Esses verdes são da `main`; os checks do SHA da PR são listados separadamente abaixo.

### PR #176 — estado remoto verificado no SHA `43b2f9f3`

PR [#176](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/176) segue aberta, sem merge e `mergeable_state=blocked`.

| Check | Run / resultado | Evidência |
|---|---|---|
| Qualidade contínua | [41113333321](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41113333321) — success | Build, typecheck, lint, testes e verificações do job passaram. |
| Security Scan | [41113334024](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41113334024) — success | Audit sem vulnerabilidades altas e Gitleaks passaram. |
| CodeQL | [41113333520](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41113333520) — success | `Analyze (javascript-typescript)` passou após alinhar os pins. |
| Bundle / Lighthouse / Portal Sicoob | [41113333135](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41113333135), [41113333262](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41113333262), [41113333515](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41113333515) — success | Todos os checks da UI/infra consultados passaram. |
| E2E Playwright | [41113333292](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41113333292) — failure fechada | `E2E_SUPABASE_PROJECT_ID` vazio; o preflight parou antes de acessar qualquer Supabase. A workflow foi endurecida para não herdar credenciais genéricas e exigir ambiente exclusivo. |
| Copilot Review | [41113347228](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41113347228) — failure | Serviço gerenciado respondeu HTTP 402/quota e/ou bloqueou `api.github.com`; depende do GitHub/owner. |

O PR só pode executar E2E depois que o owner configurar `e2e-staging` com a variável
`E2E_SUPABASE_PROJECT_ID` e os secrets `E2E_STAGING_*` inventariados em
[`docs/secrets.md`](docs/secrets.md). A URL, project ref e chaves devem ser do mesmo
projeto isolado; o workflow bloqueia `cfmzkthhgliqelozlmwu` e
`doufsxqlfjyuvxuezpln`. Nenhum valor de secret foi lido. Também falta aprovação
humana exigida pela proteção de `main`.

No worktree desta PR, o contrato de cleanup foi endurecido: a configuração é
obrigatória no CI, a limpeza de todas as cinco personas falha se ausente, parcial ou
em dry-run, erros HTTP não são reinterpretados como sucesso, e setup/teardown limpam
em passadas sequenciais os prefixos literais `[E2E]` e `[E2E:` para cobrir nomes
atuais e legados sem casar `[E2Evil]`. Cleanup por teste foi removido porque a Edge
Function também apaga carrinhos por persona e poderia atingir outro teste concorrente;
as execuções compartilham um único grupo; HTTP 402 já não conta como validação
authz/RLS. Essas mudanças ainda não têm novo run remoto. Antes de
cadastrar secrets, configure reviewers e política de branches no Environment e
confirme positivamente a ref descartável; negar dois refs conhecidos não prova, por si
só, que uma terceira ref seja staging.

### E2E interrompido na PR #177 — risco de dados a verificar

A PR [#177](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/177), SHA
`141d7ae`, foi criada sobre um SHA antigo de `main`, sem o preflight de isolamento
que já estava na #176. Executei o cancelamento quando percebi que o run usava
secrets genéricos e não comprovava o projeto de destino:

- Run [41118082692](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41118082692) terminou `cancelled` durante o smoke; 13 testes Playwright tinham passado antes da interrupção.
- O passo RLS remoto [124278629131](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41118082692/job/124278629131) terminou `success`; o teste inseriu um canário UUID e tentou removê-lo em `afterAll`, mas não verifica o resultado da remoção. Portanto, não posso provar que a linha temporária foi removida.
- Antes do smoke, o cleanup remoto rejeitou uma conta com `403 email_not_in_allow_list`; outra chamada reportou `DELETED 0`. O log não comprova exclusões.
- Como os valores dos secrets não foram lidos e o workflow antigo não validava o project ref, não é possível afirmar se o destino era staging ou um dos bancos protegidos, nem certificar ausência de outras alterações da jornada interrompida. Não consultei nem corrigi dados remotos.

A ação segura pendente é o owner confirmar o destino e, se a execução tiver usado algum
projeto não descartável, revisar as tabelas técnicas `e2e_cleanup_rate_limit` e
`user_onboarding` por um canal administrativo independente. A PR #176 agora direciona
futuras execuções somente ao environment isolado; o teste canário exige confirmação da
remoção e execuções concorrentes não cancelam umas às outras.

### Deploy remoto de funções

A correção idempotente do pós-check está na PR #176. A simulação local deve confirmar
que versão igual (CLI `No change found`) passa, enquanto função ausente/versão zero ou
regressão falham. O dispatch de publicação não foi repetido: `CONSTRUCTION_SUPABASE_PROJECT_REF`
e credenciais de ambiente de construção precisam ser confirmados sem revelar valores,
e a execução deve ficar restrita a um projeto descartável que não seja nenhum dos dois
refs bloqueados. O run antigo no SHA `e9d5902` ocultou o alvo real e publicou seis
funções antes de falhar na verificação; esse destino não pode ser identificado pelos
logs consultados.

### Dependências externas / históricos

O resumo antigo do Dependabot para `@vitest/mocker` continua com conclusion failure,
mas a versão vulnerável já foi atualizada na `main`; não existe correção segura a fazer
nesse SHA concluído. As falhas antigas de Bundle e Lighthouse têm logs expirados, porém
os checks atuais correspondentes da PR #176 passaram. O Copilot depende de cota e
configuração do serviço do GitHub, não de alteração de código.

### PR #176 — snapshot histórico, SHA `e540dfb`

A PR está aberta e bloqueada (`merged=false`), com head `e540dfbd0e61c124dfeba314cb735a9733cdb48f` e base `main` `e9d59026793b84fabeaeec9da890a068f64d49c3`.

| Workflow | Run/conclusão | Evidência |
|---|---|---|
| Qualidade contínua | [41096929659](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41096929659) — success | Typecheck, lint, testes, simulações e compilação de produção concluíram sem falha. |
| Security Scan | [41096929643](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41096929643) — success | Audit e Gitleaks passaram. |
| E2E (Playwright) | [41096929852](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41096929852) — falhou no preflight | `E2E_SUPABASE_PROJECT_ID` chegou vazio; o gate parou antes do Playwright, os shards foram skipped e não houve jornada autenticada. O resumo sem `results.json` foi skipped como esperado. |
| Copilot Code Review | [41096943447](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41096943447) — falhou | A etapa de processamento/limpeza do agente falhou no ambiente gerenciado; a execução anterior também reportou HTTP 402 e bloqueio de rede a `api.github.com`. Dependência externa ao código deste PR. |
| Bundle Size | [41096929698](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41096929698) — success | Orçamento de bundle passou. |
| Portal Sicoob | [41096929702](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41096929702) — success | Checks de portal/responsividade e aprovação passaram. |
| CodeQL | [41096929662](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41096929662) — success | Análise concluída. |
| Lighthouse | [41096929795](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41096929795) — success | Auditoria de performance concluída. |

**Pendências que precisam de ação/decisão do owner:**

1. Configurar environment `e2e-staging`, variável `E2E_SUPABASE_PROJECT_ID` e os secrets `E2E_STAGING_*` listados em `docs/secrets.md`. Os jobs novos não reutilizam chaves genéricas `VITE_SUPABASE_*`/`SUPABASE_SERVICE_ROLE_KEY`; o preflight exige URL/ref coincidentes e recusa os dois projetos protegidos. Environment ausente foi confirmado por API 404; nenhum valor secreto foi lido.
2. Ajustar a allowlist do firewall do Copilot Actions para liberar `api.github.com` (ou configurar os setup steps do agente antes da ativação do firewall, conforme a mensagem do run). O workflow Copilot é gerenciado pelo GitHub e não é um YAML versionado no repositório.
3. Aguardar revisão obrigatória e resolver os dois bloqueios acima antes do merge da PR #176. Ela permanece aberta e sem merge.
4. O run de deploy Sicoob na `main` permanece falho/sem alvo de homologação comprovado. Antes de qualquer execução futura, configurar `CONSTRUCTION_SUPABASE_PROJECT_REF` e credenciais somente do projeto `construction`; não aplicar migrations nem publicar funções no banco canônico.
5. As migrations candidatas `20261030174645_redact_public_quote_approval_costs.sql` e `20261030190000_bind_sicoob_scan_evidence_hash.sql` estão versionadas e autorizadas somente na allowlist de construção. Foram validadas em PostgreSQL descartável; não foram aplicadas a Supabase remoto. O executor agora confere os corpos, search paths e privilégios das três funções alteradas, além da expressão e do estado `NOT VALID` da constraint. Antes de qualquer aplicação, confirmar o projeto `construction`, executar o preflight de ledger e auditar os registros anteriores: `NOT VALID` protege gravações novas, mas não declara consistência histórica.
6. O scanner segue sem provedor homologado. Faltam configurar URL/token no ambiente de construção, testar EICAR e timeout contra esse provedor e verificar limpeza de objetos órfãos no Storage. Não usar o mock `scanner-sintetico` como prova de integração real.

**Validação local daquele snapshot:** suíte completa 5.854 passou, 68 skipped, 0 falhou; build e typecheck passaram; lint passou (0 erros, 874 avisos); `npm audit --audit-level=high` passou com 0 vulnerabilidades. A validação candidata posterior registra 5.856 aprovados em `RELATORIO_CI.md`. Os números acima refletem o snapshot antigo `e540dfb`; `main` permanece sem as alterações. Nenhuma migration, Edge Function ou dado remoto foi alterado.

### PR #176 — snapshot consultado para o SHA `37db9f1e3f6dc8a4a7a8772145099d2a61ef46ca`

Snapshot consultado após o lote documental. Status `in_progress`/`queued` não é falha e ainda não é aceite de CI.

| Workflow | Status no último snapshot | Evidência / bloqueio | Run |
|---|---|---|---|
| Lighthouse Performance Audit | `success` | Auditoria concluída. | [41105885359](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41105885359) |
| Bundle Size Check | `success` | Orçamento de bundle passou. | [41105885325](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41105885325) |
| Security Scan | `success` | Verificações de segurança passaram. | [41105885304](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41105885304) |
| E2E (Playwright) | `failure` | Preflight falhou antes do Playwright: `E2E_SUPABASE_PROJECT_ID` vazio; jornadas autenticadas não rodaram. | [41105885406](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41105885406) |
| Running Copilot Code Review | `failure` | Limite adicional de uso do Copilot (HTTP 402); também houve bloqueio de firewall para `api.github.com`. Depende do owner/GitHub. | [41105901369](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41105901369) |
| Qualidade contínua | `in_progress` | Ainda executando no momento da consulta. | [41105885328](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41105885328) |
| Portal Sicoob | `in_progress` | O job de entrada responsiva ainda executava; aprovação transacional passou. | [41105885550](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41105885550) |
| CodeQL | `in_progress` | A análise JavaScript/TypeScript ainda executava. | [41105885357](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41105885357) |

A PR permanece aberta e sem merge. O E2E depende de projeto Supabase isolado e personas de teste configuradas como secrets acessíveis ao job. O canônico está bloqueado pelo workflow.

### Snapshot consultado do SHA `3441b830ffedfbc12d78a8b82f3d32b1e88e1ac5` — 30/10/2026, 18:39 UTC

| Check | Estado | Evidência / motivo |
|---|---|---|
| Sicoob Gate | success | [41107963136](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41107963136). |
| Portal Sicoob | success | Jobs de aprovação transacional e entrada responsiva passaram em [41107963136](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41107963136). |
| Lighthouse | success | [41107963568](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41107963568). |
| CodeQL | success | [41107963621](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41107963621). |
| Gitleaks e npm audit | success | [41107963302](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41107963302). |
| Bundle | success | [41107963479](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41107963479). |
| E2E | failure | [41107963427](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41107963427): preflight falhou. O inventário dos nomes confirma ausência do secret `E2E_SUPABASE_PROJECT_ID`; os nomes `VITE_SUPABASE_PROJECT_ID` e `VITE_SUPABASE_URL` existem, mas valores e alinhamento com homologação não foram lidos. Nenhum shard autenticado rodou. |
| Copilot Review | failure | [41107976457](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41107976457): HTTP 402 por limite de uso e firewall bloqueando `api.github.com`; requer ação do owner/GitHub. |
| Segurança, contratos e build | in_progress | [41107963268](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41107963268) ainda executava; não é aprovação até terminar. |

A PR #176 continua aberta e sem merge. Não alterei o Supabase remoto.

### Snapshot consultado do SHA `2575f1ea7bc0bd05c91e25f31eddeca51fbc8f73` — 30/10/2026

| Workflow / check | Resultado mais recente | Evidência / causa |
|---|---|---|
| Qualidade contínua | success na attempt 2 | [41109622961](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41109622961). A primeira tentativa falhou ao baixar `public.ecr.aws/supabase/postgres:17.6.1.063` (`toomanyrequests: Data limit exceeded`); somente o job falho foi reexecutado e a segunda attempt concluiu verde. |
| Security Scan | success | [41109623120](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41109623120). |
| Bundle Size Check | success | [41109623142](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41109623142). |
| Lighthouse Performance Audit | success | [41109623131](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41109623131). |
| CodeQL | success | [41109623220](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41109623220). |
| Portal Sicoob | success | [41109623171](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41109623171). |
| E2E (Playwright) | failure no preflight | [41109623268](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41109623268): `E2E_SUPABASE_PROJECT_ID` vazio. Os shards foram skipped; nenhum teste Playwright autenticado rodou. O nome do secret não existe no repositório; nenhum valor de secret foi lido. |
| Running Copilot Code Review | failure | [41109639994](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41109639994): limite de uso HTTP 402 no ambiente gerenciado. |

A proteção da `main` também exige uma aprovação humana por alguém diferente do autor. A PR segue aberta, sem merge e bloqueada até configurar e validar o projeto isolado de E2E, resolver o bloqueio externo do Copilot e obter a aprovação requerida. Não houve alteração no Supabase remoto. A tentativa 2 da Qualidade contínua passou; a falha de ECR na tentativa 1 permanece registrada no histórico.

**Correções adicionais pós-auditoria:** mensagens de erro de enums Zod agora distinguem ausência de valor inválido, com testes para os dois casos; o resolver do formulário mantém um adaptador tipado porque a entrada genérica de `z.coerce.number` não representa os defaults e controles numéricos concretos da tela. O cliente SQL do Supabase aceita project refs alfanuméricos de 20 caracteres, alinhado ao guard de migrations, com cenário cobrindo dígitos. Os commits após `729c3e2` foram validados localmente e remotamente no SHA `90e12ae`; a `main` permanece sem merge.

**Verificação de integridade do CI:** removidos do conjunto de workflows os usos de `continue-on-error` e `|| true`; etapas de resumo pós-falha seguem com `if: always()` e o job continua falhando quando o teste/report falha. `actionlint .github/workflows/*.yml` passou após corrigir quoting e escrita do step summary no Branch Protection Sentinel.

## Arquivo histórico — snapshots anteriores a 30/10/2026

As seções abaixo preservam diagnósticos de runs antigos e não descrevem o bloqueio
atual da PR #176. Use o snapshot atualizado no início deste arquivo para o estado
vigente; em particular, a antiga falha de quota do E2E foi substituída pelo bloqueio
seguro do preflight por ausência de `e2e-staging`.

---

~~## Workflow: `npm_and_yarn` — Dependabot `@vitest/mocker` Update~~

> ✅ **RESOLVIDO em 2026-10-22** — `vitest` e todos `@vitest/*` atualizados para 4.1.12 no commit `b32e5e4`. CVEs GHSA-qxg6-89mg-rqv8 e GHSA-xp26-3454-mjgp corrigidas.

---

## Workflow: Enterprise Compliance & Audit Reporting

**Run atual:** `39780447872` · Job `119830039718`  
**Step:** "Database RLS Scan"  
**Erro exato:**

```
check_tables_rls falhou: Service for this project is restricted due to the following violations:
exceed_edge_functions_invocations_quota, exceed_egress_quota.
The project owner must upgrade their plan or remove spend caps to restore service.
```

**Causa raiz:** Quota de edge functions e egress do projeto Supabase esgotada — o workflow
chama funções via Management API e o projeto rejeita por billing.

**O que você precisa fazer:**

1. Acesse o painel do Supabase do projeto em uso pelos testes.
2. Verifique se há spend caps ativos e remova-os, ou adicione créditos ao plano.
3. Após restaurar a quota, o workflow deve passar sem nenhuma mudança de código.

---

## Histórico: workflow `e2e` — Smoke gate Playwright bloqueado por quota Supabase

**Situação:** Duas partes distintas neste workflow:

### Parte 1 — Testes vitest (authz + RLS) ✅ Resolvido

> **Histórico (2026-10-22):** o PR #141 aceitava HTTP 402 como infraestrutura e pulava
> asserções remotas de authz/RLS. Na rodada atual, esses testes foram endurecidos para
> falhar quando quota impede a validação; um skip não conta como prova de autorização.

### Parte 2 — Smoke gate Playwright ⚠️ Externo

**Causa raiz:** A quota Supabase esgotada (`exceed_edge_functions_invocations_quota`,
`exceed_egress_quota`) faz com que o endpoint de autenticação retorne HTTP 402. A fixture
global do Playwright (`tests/e2e/fixtures/auth.ts`) não consegue criar sessão → todos os
39 testes são pulados em 0ms → o job detecta 0 testes passando e falha com:

```
🛑 Fail-fast se smoke falhou (gate)
::error title=Smoke gate failed::...
Process completed with exit code 1.
```

**Contexto histórico:** esse diagnóstico pertence aos runs antigos da PR #141 e não
explica o status atual da PR #176. O gate atualizado da #176 para antes de qualquer
chamada remota quando falta `e2e-staging`; consulte o snapshot atual no início deste
arquivo. Naquele run antigo, a quota Supabase esgotada era a causa observada.

**Ação histórica:** restaurar quota era necessário para aquele run. Para a execução
atual também é necessário provisionar e proteger `e2e-staging`, conforme o snapshot
vigente no início deste arquivo.

---

## Workflow: `copilot-pull-request-reviewer`

**Run atual:** `39785094125` · SHA `4f5de103`  
**Erro exato:**

```
SessionModelError: You've reached your additional usage limit for your plan.
Go to https://github.com/settings/copilot/features for more details.
(Request ID: E01C:2B4931:27FA876:2E0CFAE:6AD9FDF4)
errorType: 'quota', statusCode: 402
```

**Causa raiz:** Quota mensal do GitHub Copilot esgotada.

**O que você precisa fazer:**

1. Acesse `github.com/settings/billing` e verifique o uso do Copilot.
2. Atualize o plano ou aguarde o reset do ciclo de faturamento.

---

## Workflow: `lighthouse` (Lighthouse Performance Audit)

**Trigger:** `on: pull_request` com `paths-ignore: ['docs/**', '*.md', '.github/CODEOWNERS']` — **não dispara em push à main**.  
**Run mais recente disponível:** `36353765910` · Job `108717316857` · SHA `99dd8778` · 2026-09-27  
**Log:** expirado (HTTP 404 — run de 25 dias; steps retornados vazios pela API).  
**Estado em PR #136:** SKIPPED corretamente (mudanças apenas em `*.md`).

**Causa provável da falha de Set/27:** O workflow executa `npx @lhci/cli@0.13.0 autorun` e usa o secret `LHCI_GITHUB_APP_TOKEN` para integração com GitHub Checks. Sem o token configurado (ou com token expirado), o LHCI retorna erro de autenticação mas ainda gera relatório; a falha pode ser de orçamento de performance ou de token. Logs indisponíveis para confirmar.

**Impacto:** Zero em push à main — workflow só corre em PRs. Em PRs com mudanças de código, pode falhar por:
1. `LHCI_GITHUB_APP_TOKEN` ausente/expirado no repositório.
2. Orçamento de performance configurado em `.lighthouserc.*` não sendo atingido.

**O que você precisa fazer:**
1. Verifique se o secret `LHCI_GITHUB_APP_TOKEN` está configurado em Settings → Secrets and variables → Actions.
2. Na próxima abertura de PR com mudanças de código, observe o log do job `lighthouse` para confirmar a causa raiz.
3. Sem ação imediata necessária — não bloqueia push à main.

---

## Workflow: `bundle-stats` (Bundle Size Check)

**Trigger:** `on: pull_request` — **não dispara em push à main**.  
**Run mais recente disponível em main:** `36353765911` · Job `108717316864` · SHA `99dd8778` · 2026-09-27  
**Log:** expirado (HTTP 404).  
**Estado em PR #136:** **success** ✅ · Run `39787553405` · Job `119854596437`.

**Causa da falha de Set/27:** Logs indisponíveis. Possível causa: script `scripts/qa/check-bundle-budget.mjs` com limite de orçamento ultrapassado no código daquele PR.  
**Estado atual:** Não é um bloqueio — no código atual (PR #136) o check PASSOU.

---

## Workflow: `Aplicar migrations Sicoob` (`apply-sicoob-migrations.yml`)

**Trigger:** `workflow_dispatch` apenas (manual) — requer input `confirmar: "APLICAR"` e branch `main`.  
**Não há runs automáticos.** Workflow só executa quando o owner aciona manualmente via GitHub UI ou API.  
**Último run:** não disponível (nenhum run automático indexado em `branch=main`).  
**Status histórico:** Esse snapshot não certifica o estado atual do alvo. A aplicação permanece manual e bloqueada até confirmar que o environment `construction` aponta para projeto isolado, reconciliar o ledger remoto e concluir a auditoria dos dados históricos; consulte [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#migrations-sicoob).

---

## Workflow: `Monthly DB Audit` (`db-performance-audit.yml`)

**Trigger:** Cron `0 0 1 * *` (dia 1 de cada mês às 00:00 UTC) + `workflow_dispatch`.  
**Próxima execução automática:** 2026-11-01 00:00 UTC.  
**Estado:** Não avaliável até 2026-11-01. O workflow requer secrets `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` — se ausentes, o job falha com `::error::Secrets ausentes`.  
**O que verificar em Nov/01:**
1. Se o run falhar por secrets ausentes: configure `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` em Settings → Secrets and variables → Actions.
2. Se falhar por Supabase quota: mesma ação da seção Enterprise Compliance.

---

## Workflow: `Segurança, contratos e build` (`ci.yml`) — ECR Rate Limit

**Commits afetados:** `5b34841` e `7211e12` (branch `claude/hopeful-mccarthy-8rqrqw`)
**Runs:** `39850827027` · `39852468612`
**Step:** "Simular controles de auditoria" / "Simular ACL efetiva"
**Erro exato:**

```
RuntimeError: docker run falhou após 3 tentativas:
Unable to find image 'public.ecr.aws/supabase/postgres:17.6.1.063' locally
docker: Error response from daemon: toomanyrequests: Data limit exceeded
```

**Causa raiz:** Rate limit do ECR Public da AWS ao puxar a imagem Docker `public.ecr.aws/supabase/postgres:17.6.1.063` nos scripts `simular-controles-auditoria.py` e `simular-acl-efetiva.py`. Não é um bug no código do PR — é throttling de infraestrutura externa. Em execuções posteriores (ex: run `39780447863`) o rate limit se dissipar naturalmente e o workflow retornou **success**.

**O que você precisa fazer:** Nenhuma ação imediata. Se a falha persistir em execuções futuras:
1. Habilitar o Amazon ECR pull-through cache ou autenticar no ECR antes do pull.
2. Alternativa: migrar os scripts para usar a imagem via GHCR ou Docker Hub se disponível.

---

## Gaps de banco de dados identificados em auditoria (2026-10-22)

### Gap 1 — CRÍTICO: Migration `20261022120000` ausente de `supabase_migrations.schema_migrations`

**Status:** ✅ RESOLVIDO — migration de reparo aplicada no commit `48ee07f`.

A migration `20261022120000_add_public_favorites_to_security_definer_allowlist.sql` foi aplicada ao banco fora do Supabase CLI (via Management API), portanto nunca foi registrada em `supabase_migrations.schema_migrations`. O schema estava correto, mas o ledger do Supabase ficou dessincronizado. Inserção de reparo realizada no commit acima.

### Gap 2 — MÉDIO: `e2e_cleanup_check_rate_limit` com `search_path` incompleto

**Status:** ✅ RESOLVIDO — migration de reparo aplicada no mesmo commit.

A função SECURITY DEFINER `e2e_cleanup_check_rate_limit` tinha `SET search_path TO 'public'` sem o `pg_catalog` explicitamente como primeiro elemento, diferentemente das outras funções SECURITY DEFINER do projeto (`get_public_favorite_list` e `get_public_favorite_reactions`). Corrigido para `pg_catalog, public` por consistência com o padrão de hardening do projeto.

### Gap 3 — MÉDIO: `relforcerowsecurity = false` em `e2e_cleanup_rate_limit`

**Status:** ⚠️ Não corrigido — avaliação: risco aceitável pelo design atual.

A tabela `e2e_cleanup_rate_limit` tem `FORCE ROW LEVEL SECURITY` desabilitado, o que permite à role `postgres` (dono) acessar diretamente sem passar pelo RLS. Em produção isso é aceitável: a única escrita legítima é via RPC SECURITY DEFINER `e2e_cleanup_check_rate_limit` que roda como `postgres` por design. Adicionar `FORCE ROW LEVEL SECURITY` quebraria a RPC.

---

## Inventário completo de falhas — main (status=failure, consultado em 2026-10-22 19:30 UTC)

Lista lida via API (`branch=main`, 50 runs, último run de cada workflow).

| Workflow | Run mais recente | Conclusão | Causa | Status |
|---|---|---|---|---|
| Security Scan | `39835755469` (SHA `82262c4`) | failure | dompurify CVE (CRITICAL) | ✅ Resolvido por PR #141 (pending merge) |
| Qualidade contínua | `39835755495` (SHA `82262c4`) | failure | dompurify CVE (CRITICAL) | ✅ Resolvido por PR #141 (pending merge) |
| Enterprise Compliance & Audit Reporting | `39835755339` (SHA `82262c4`) | failure | Supabase quota esgotada | ⚠️ Externo — ver seção acima |
| Running Copilot Code Review | `39785094125` (SHA `4f5de103`) | failure | Quota GitHub Copilot 402 | ⚠️ Externo — ver seção acima |
| npm_and_yarn @vitest/mocker | `39775463512` (SHA `ae1b92b3`) | failure | `security_update_not_possible` Dependabot | ✅ Resolvido por PR #139 |

**Workflows verdes (última execução = success):**
Branch Protection Sentinel, CodeQL, Migration Ledger Drift, Portal Sicoob, Dependabot updates gerais.

---

~~## Gap de Segurança: Ausência de `npm audit` no CI~~

> ✅ **RESOLVIDO em 2026-10-22** — Job `npm-audit` adicionado ao `security.yml` no commit `b32e5e4`. Roda em PRs, push para main e schedule semanal com `--audit-level=high`.

---

## Workflows corrigidos (resolvidos em PRs anteriores)

| Workflow | Causa | Correção | PR |
|---|---|---|---|
| Branch Protection Sentinel | Squash merge com mensagem customizada sem `(#NNN)` | PR mergeado sem `commit_message` custom (GitHub gera título com `(#NNN)`) | #128 |
| Enterprise Compliance — Security Definer ACL | `audit_security_definer_acl()` sem `get_public_favorite_list` e `get_public_favorite_reactions` | Migration `20261022120000_add_public_favorites_to_security_definer_allowlist.sql` | #126 |
| Migration Ledger Drift | Fingerprint de `20261022120000` calculado com `local_sha256` incorreto; novo digest correto: `e2815b0...` | Corrigido fingerprint no `migration-ledger-baseline.json` | #129 |
| 5 CVEs high (vite ≤6.4.3) | GHSA-698v, GHSA-r825, GHSA-587h, GHSA-9jrq, GHSA-rq7h | `vite` 6.4.3 → 6.4.5 | #126 |
| Qualidade contínua (`ci.yml`) — ECR rate limit | `toomanyrequests: Data limit exceeded` ao puxar `public.ecr.aws/supabase/postgres:17.6.1.063` em dois steps (scripts `simular-controles-auditoria.py` e `simular-acl-efetiva.py`) | Rate limit do ECR Public se dissipou naturalmente; run `39780447863` → **success** | automático |
