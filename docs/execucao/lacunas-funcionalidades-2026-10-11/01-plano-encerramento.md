# Plano de encerramento (T001–T100), matriz-150, workflows-100 e decisões pendentes — status real em HEAD dc08200 (11/10/2026)

Escopo desta fatia: `docs/plano-implementacao/plano-encerramento-100-etapas-20261001/` (100 etapas, 1.000 checkboxes), `plano-150-etapas-20260927/`, `docs/execucao/revisao-plano-20261001/` (matriz-150, workflows-100), `fechamento-tecnico-2026-10-08.md`, `auditoria-tecnica-2026-10-02.md`, `execucao-plano-2026-10-01.md`, `decisoes_pendentes.md`.

Método: cada etapa foi conferida contra o código em HEAD `dc08200` (migrations, Edge Functions, `src/`, workflows), contra a API REST do GitHub (configuração do repositório e PRs, consultada em 11/10) e contra o domínio publicado (`curl` somente leitura em 11/10). O acesso administrativo ao banco canônico **falhou hoje** (`supabase_db_connection_info` → `Management API 401: Invalid access token`). Por isso, o estado remoto do banco vem do fechamento de 08/10 (`fechamento-tecnico-2026-10-08.md:27`, com "as 18 migrations autorizadas constam no ledger"). Ele não foi reconsultado.

Observação de acompanhamento: `etapas.csv` e `checklist-1000.csv` continuam com **100/100 etapas "Planejada", 0/1.000 checkboxes marcados, 0 responsáveis nominais e 0 datas de conclusão**. O último commit nesses arquivos é `aec946a` (PR #87). Assim, até as etapas tecnicamente concluídas abaixo não têm aceite formal registrado.

---

## Resumo

### Contagem por status

**Etapas T001–T100:**

| Status | Qtde | Etapas |
|---|---:|---|
| Concluída tecnicamente (fora da lista; sem aceite formal) | 8 | T025, T027, T029, T031, T032, T034, T062, T068 |
| PARCIAL | 63 | demais (ver itens) |
| NAO_INICIADA | 19 | T004, T008, T019, T045, T050, T054, T055, T057, T063, T064, T070, T076, T078, T080, T082, T085, T088, T090, T096 |
| BLOQUEADA_EXTERNA | 10 | T002, T006, T048, T071, T075, T079, T091, T098, T099, T100 |
| STUB/MOCK | 0 | (o achado de STUB aparece como item adicional) |
| ORFA | 0 | (os achados órfãos aparecem como itens adicionais) |

**Itens adicionais descobertos na verificação (PLA-X):**
- 1 STUB/MOCK: X01
- 3 ORFA: X02, X03, X04
- 1 PARCIAL: X05

**Decisões pendentes (PLA-D):**
- 10 BLOQUEADA_EXTERNA.
- 2 decisões conferidas como resolvidas (D02 e D12), apenas contadas.

**Total de itens listados:** 92 etapas + 5 adicionais + 10 decisões = **107**.

**Conferidos como concluídos:** 8 etapas + 2 decisões (D02 e D12) + 3 workflows antes "N" (W031, W044, W081) + vários P1 da matriz-150 (tabela da seção "Reconciliação da matriz-150").

### Os 10 achados mais graves

1. **PLA-T075 — scanner antimalware real nunca configurado (BLOQUEADA_EXTERNA, P0).**
   - `sicoob-document-ingest` recusa todo arquivo com 503 enquanto `SICOOB_MALWARE_SCANNER_URL/TOKEN` não existirem (`scanner.ts:24-26`).
   - Arte aprovada é pré-requisito de produção, então o fluxo documental e de produção Sicoob não funciona de ponta a ponta.
   - O parecer do scanner também não é correlacionado ao hash do arquivo (`scanner.ts:52-59`).
2. **PLA-T019 — `main` sem nenhum check obrigatório (NAO_INICIADA, P1).** Conferido via API em 11/10:
   - `required_status_checks.checks=[]` e `enforcement_level=off`;
   - merge commit e rebase continuam permitidos;
   - `delete_branch_on_merge=false`, `allow_update_branch=false`;
   - zero rulesets.
   - Na prática, código vermelho pode entrar na `main`.
3. **PLA-T095 — a raiz do domínio de produção é servida sem CSP e sem `nosniff` (PARCIAL, P1).**
   - `https://brindes-sicoob-v2.vercel.app/` devolve só HSTS, enquanto `/login` recebe a CSP. A regra `"/:path*"` (`vercel.json:11`) não cobre `/`.
   - A CSP ainda usa `'unsafe-inline'` e domínios Lovable (`vercel.json:43`).
   - O rate limiter cobre apenas 7 de 108 funções.
4. **PLA-T008 — backup e restauração nunca ensaiados (NAO_INICIADA, P1).** `docs/DR.md:16` afirma PITR de 7 dias sem verificação. Não existe relatório de restore medido.
5. **PLA-T006 — acesso administrativo ao banco canônico não é reproduzível (BLOQUEADA_EXTERNA, P1).** O MCP retornou `401 Invalid access token` hoje, como em 01/10. Sem acesso, ninguém comprova drift, ledger, RLS ou ACL atuais fora do PR #98.
6. **PLA-T087 / PLA-T088 — ciclo financeiro da verba incompleto (P1).**
   - Não há fechamento de competência, nem estados planejado/reservado/comprometido.
   - Não há conciliação contratado × faturado × pago.
   - Busca por `fechar_competencia|period_closed|verba_reservada|...` não retornou nada.
7. **PLA-T037 — o servidor aceita do navegador o preço unitário e o custo total de personalização (PARCIAL, P1).**
   - Veja `20261002160000_quote_items_id_format_validation.sql:83,101,110`.
   - `total_cost` da personalização é somado ao subtotal sem conferência com `setup_cost + unit_cost × qtd`.
   - Não existe `docs/regras-orcamento.md`.
8. **PLA-T004 — plano sem donos (NAO_INICIADA, P1).** As 100 etapas têm responsável e revisor nulos. As decisões de negócio continuam abertas (`decisoes_pendentes.md` está datado de 22/09).
9. **PLA-X01 — cerca de 75 pontos de escrita na UI administrativa contra o catálogo externo, que agora é somente leitura (STUB/MOCK, P2).** As telas de produtos, fornecedores, técnicas, gravação, galerias e coleções mostram botões de salvar que sempre recebem `403 CATALOG_READ_ONLY` do bridge.
10. **PLA-T054 / PLA-T055 — propostas institucionais comparáveis e justificativa de fornecedor único não existem (NAO_INICIADA, P2).** Faltam a governança de compra entre cooperativas e a trilha de auditoria da escolha de fornecedor.

Menções obrigatórias:
- **T098–T100** (piloto, compra real e estabilidade de 30 dias): BLOQUEADA_EXTERNA. O próprio fechamento (`fechamento-tecnico-2026-10-08.md:66-76`) reconhece que o estado é "candidato de construção tecnicamente validado", não produção com tráfego real.
- **PLA-T009:** os simuladores **ainda copiam `producao_verificada=true` de JSON histórico** (`simular-rls-cruzada-sicoob.py:131-135`, `simular-delegacao-aprovacao-sicoob.py:322-328`). Uma evidência local pode se passar por evidência remota.

---

## Reconciliação da matriz-150 (revisão de 01/10) com o fechamento de 08/10 (PR #98 já mergeado)

Os itens P1 da tabela `revisao-do-plano-2026-10-01.md:36-50` foram reconferidos no código.

| Origem (matriz-150) | Constatação em 01/10 | Situação em HEAD dc08200 | Evidência | Item desta lista |
|---|---|---|---|---|
| P034/P036/P037/P143: `sent→sent` fora do escopo | RPC aceitava repetição de status por ator de outra Singular | **RESOLVIDA**: escopo autorizado antes do retorno idempotente; retry não grava versão nem histórico; regressão na CI | `20260928182000_idempotent_quote_status_notifications.sql:46-59`; `scripts/qa/simular-governanca-orcamento.sql:161`; `ci.yml:119-120`; nenhuma redefinição posterior (grep em `2026100*`) | concluída (T031/T034) |
| P042/P048: `quote_save_idempotency` mutável pelo cliente | INSERT/UPDATE/DELETE pelo próprio ator | **PARCIAL**: UPDATE/DELETE revogados; INSERT direto ainda permitido; a chave do editor vive só em `useRef`; a edição usa `save_quote_atomic` sem chave | `20260928173500_harden_quote_save_idempotency.sql:24-34,107`; `useQuoteBuilderState.ts:283,394,603`; `QuoteService.ts:223` | PLA-T035, PLA-T044 |
| P044/P102: IDs dos itens recriados | DELETE e recriação de todos os `quote_items` | **RESOLVIDA** (PR #88): upsert por `id`; id desconhecido gera 40001 | `20261002160000_...sql:200-331`; `quoteHelpers.ts:204-206` | resta parte em PLA-T036 / PLA-T072 |
| P045: totais e parcelas do payload | unit_price e personalization total do cliente | **NÃO RESOLVIDA** | `20261002160000_...sql:83,101,110` | PLA-T037 |
| P089/P124/P125: verba por `clientId` sem competência | editor e serviço errados | **PARCIAL**: editor e serviço usam `profile.pa_id` + ano/mês e falham fechados. `updateBudget` (escrita cliente de `verba_consumida`) ficou órfão. Ciclo e fechamento de competência inexistentes | `useQuoteBuilderState.ts:191-211`; `budgetService.ts:41-66`; `usePaBudget.ts:26-33` | PLA-T056, PLA-T087, PLA-T088, PLA-X03 |
| P077/P099: `randomUUID` por chamada na recompra | chave nova a cada retry | **RESOLVIDA** (PR #87): intenção em `sessionStorage` por intenção | `src/services/sicoob/reorderIdempotency.ts:27-59`; `QuoteService.ts:252,273` | concluída (T068) |
| P014/P141: 179 diagnósticos TS / 3.265 erros ESLint | gates vermelhos | **RESOLVIDA**: baseline TS 0 e ESLint 0 erros (872 avisos sem destino) | `.typecheck-baseline.json` (`total: 0`); `.eslint-baseline.json` (`totalErrors: 0`) | resto em PLA-T013 |
| P021–P028: SQL remoto indisponível; drift `ENOTFOUND` | sem paridade | **PARCIAL**: drift usa Management API; 18 migrations no ledger em 08/10; 491 diferenças históricas catalogadas; acesso **novamente 401 em 11/10** | `migration-ledger-drift.yml:38-47`; `scripts/db/migration-ledger-baseline.json` (`status_counts`) | PLA-T006, PLA-T021, PLA-T022 |
| P015/P143/P144: sem checks obrigatórios; domínio sem CSP | proteção fraca | **NÃO RESOLVIDA**: API em 11/10 com `enforcement_level=off`; raiz `/` sem CSP | `gh api .../branches/main`; `curl` na raiz | PLA-T019, PLA-T095 |
| P075/P107/P109: scanner | sem configuração | **NÃO RESOLVIDA** | `scanner.ts:24-59`; `reconciliacao-online-2026-09-28.md:28` | PLA-T075 |
| P061–P070: notificação de orçamento escrita pelo navegador | sem outbox | **PARCIAL**: o envio para a Singular virou trigger transacional (cobre individual e lote). Comentários e desconto ainda inserem pelo cliente; não há deduplicação nem filtro de perfil ativo | `20260928182000_...sql:94-127`; `useDiscountApproval.ts:99`; `useQuoteComments.ts:172-175` | PLA-T046, PLA-T047 |
| P051–P060: autosave | conflito entre abas etc. | **NÃO ALTERADO** desde 01/10 | `useAutoSave.ts:14-27,101-109`; `QuoteAutoSave.tsx:58,99-104` | PLA-T041…T045 |
| P111/P120: paginação logística | remessas sem paginação | **PARCIAL**: pedidos paginados com desempate por id; remessas ainda em um único `.in()` sem paginação | `logisticsReportService.ts:58-61`; `orderService.ts:159` | PLA-T081 |
| P116: UI prometia "tempo real" | promessa falsa | **RESOLVIDA** no texto | `LogisticsCommandCenter.tsx:119` | integração real em PLA-T084 |

As 10 etapas "N" da matriz-150 (P005, P056, P087, P088, P095, P096, P113, P122, P123, P127) **continuam todas não localizadas** em HEAD. Estão em PLA-T004, T042, T054, T055, T063, T064, T082, T086, T078 e T089.

As 25 "V" continuam sem homologação remota nova. As 4 "F" (P147–P150) seguem futuras: PLA-T098 a T100.

---

## Workflows-100: as 47 etapas "N" de 01/10, reconferidas em 11/10

**Resolvidas (3):**
- **W031:** job `sicoob-gate` sempre emitido (`sicoob-ci.yml:119-135`).
- **W044:** resumo SARIF publicado no `$GITHUB_STEP_SUMMARY` (`codeql.yml:69-72`).
- **W081:** 100% das `uses:` fixadas por SHA de 40 caracteres (grep sem exceções). A configuração `sha_pinning_required` não pôde ser consultada (API 403).

**Continuam não localizadas (44):**

| ID | Pendência | Evidência em 11/10 |
|---|---|---|
| W005 | personas RLS_TEST_* (2 cooperativas + orçamento privado) | nenhuma referência em `.github/`, `scripts/`, `tests/`; só em docs. O E2E não tem persona de segunda cooperativa |
| W011 | webkit só no shard mobile | `e2e.yml:262-263` instala `chromium webkit` nos 3 shards |
| W012 | build único compartilhado | ci, bundle-check, lighthouse, sicoob-ci e e2e compilam cada um |
| W014 | CodeQL fora de `pull_request` | `codeql.yml:11-17` mantém PR |
| W015 | ci.yml em jobs paralelos | `ci.yml:22-25`: job único `qualidade`, 25 min, serial |
| W016 | concentrar as simulações | duplicadas `simular-verba-atomica` (`ci.yml:84` e `sicoob-ci.yml:49`) e `simular-logistica-canonica` (`ci.yml:111` e `sicoob-ci.yml:59`); o `continue-on-error` foi removido |
| W020 | clone raso | `fetch-depth: 0` em `sicoob-ci.yml:46,70` e `security-compliance.yml:28` |
| W023 | composite action setup-node-deps | `.github/actions/` não existe |
| W024 | meta de 30 min/PR em CI_CD.md | `docs/CI_CD.md:3` ainda diz "Estado comprovado em 22/09/2026" |
| W026 | `deno test` de toda a `_shared` | `ci.yml:75` testa só `internal-service-auth.test.ts` |
| W030 | readiness com wait-on / servidor único no PWA | `sicoob-ci.yml:93-100` usa loop curl; `playwright.pwa.config.ts:17` faz build e preview próprios |
| W033 | `.env.ci` versionado | não existe; `playwright.config.ts:311` ainda lê `.env.production` |
| W035 | regressão sem `continue-on-error` | `e2e.yml:278` mantém |
| W041 | compliance fora de push na main e com environment | `security-compliance.yml:4-12`, sem `environment` |
| W047 | Lighthouse com `/` e 2 execuções | `.lighthouserc.cjs:6-7`: só `/login` e 3 execuções |
| W052 | sentinel virar auditoria semanal | `branch-protection-sentinel.yml` inalterado (heurística de mensagem) |
| W054 | `SUPABASE_ACCESS_TOKEN` no environment `construction` | não verificável (API de secrets 403); o drift já usa `environment: construction` |
| W055 | `SUPABASE_PROJECT_REF` no deploy | `deploy-sicoob-functions.yml:23` usa `secrets.VITE_SUPABASE_PROJECT_ID` |
| W058 | dry-run de migrations em PR | não existe. Substituído em parte pelo aplicador allowlisted `apply-sicoob-migrations.yml` (só despacho manual) |
| W059 | publicação protegida de todas as funções | deploy cobre 7 de 108 (`deploy-sicoob-functions.yml:42-49`) |
| W060 | smoke HTTP pós-deploy | só confere incremento de versão (`:54-73`) |
| W063 | E2E por `deployment_status` do preview | ausente |
| W065 | calendário de rotação semestral | `docs/RUNBOOK.md:56` sem calendário |
| W066 | environment Vercel órfão | não verificável (API 403) |
| W069 | checks obrigatórios | confirmado 11/10: `checks=[]`, `enforcement_level=off` |
| W070 | `enforce_admins` | não verificável (403); 01/10 = false |
| W071 | resolução de conversa / aprovação do último push | não verificável (403); 01/10 = false |
| W072 | `allow_update_branch` + strict | `allow_update_branch=false` (API 11/10) |
| W073 | `delete_branch_on_merge` | `false` (API 11/10) |
| W074 | só squash | `allow_merge_commit=true`, `allow_rebase_merge=true` (API 11/10) |
| W075 | rulesets | `[]` (API 11/10) |
| W077 | template único de PR | `.github/PULL_REQUEST_TEMPLATE.md` e `.github/pull_request_template.md` coexistem |
| W080 | dependency-review e alertas | `dependabot.yml` só faz updates de versão; sem `dependency-review-action`; alertas não verificáveis |
| W082 | `allowed_actions` selecionadas | não verificável (403) |
| W083 | actionlint | ausente |
| W084 | zizmor | ausente |
| W088 | harden-runner | ausente (a premissa mudou: runners hospedados) |
| W089 | guarda de fork nos jobs com secrets | ausente |
| W091 | notificação de falha (`_notify`) | ausente |
| W092 | relatório mensal de uso de Actions | ausente. **Risco novo:** workflows voltaram ao `ubuntu-latest` hospedado (cobrado em repositório privado), com E2E de 1 + 3 shards seriais de até 40 min |
| W094 | CI_CD.md e BRANCH_PROTECTION.md atualizados | `docs/CI_CD.md:3` (22/09) |
| W096 | `reports/` fora do git | `reports/AUDIT_REPORT_631165be8.md` e `..._733ce6c62.md` versionados; `.gitignore` não ignora `reports/` |
| W097 | pre-push enxuto | `.husky/pre-push`: typecheck + lint + suíte Vitest inteira |
| W099 | runbook "CI vermelha em main" | ausente em `docs/RUNBOOK.md` |

Esses W foram absorvidos pelos itens PLA-T011, T012, T015, T016, T017, T019 e T020, que citam os W correspondentes.

---

## Itens

### Fase 1 — Governança, ambientes e evidências

### PLA-T001  Manifesto de referência e ambientes
- Status: PARCIAL
- Origem do plano: `etapas.csv:2` (T001: "Manifesto versionado identifica cada ambiente…"); origens P001, P011, W062, W066
- Evidência no código:
  - Nenhum manifesto versionado (grep `manifest|manifesto` em `docs/execucao/*.md` e `scripts/` sem artefato de ambiente).
  - O fechamento (`fechamento-tecnico-2026-10-08.md:25`) cita só o projeto `cfmzkthhgliqelozlmwu`.
  - O domínio `brindes-sicoob-v2.vercel.app` serve CSP com domínios Lovable (`vercel.json:43`), mas o publicador canônico (Vercel × Lovable) não está registrado.
- O que falta: manifesto com SHA da `main`, artefato servido, domínio, publicador, banco canônico, catálogo somente leitura e data. Também a regra que invalide evidência por mudança de SHA.
- Impacto no negócio: ninguém consegue afirmar com certeza qual versão do portal o cliente está usando.
- Esforço: P
- Prioridade: P1

### PLA-T002  Preservar e reconciliar trabalhos locais (worktrees)
- Status: BLOQUEADA_EXTERNA. Depende do dono da estação `/home/joaquim_ataides/...` e de quem fecha PRs.
- Origem do plano: `etapas.csv:3`; P002, W066, W073
- Evidência no código:
  - `revisao-plano-20261001/inventario-planos.json` (campo `worktrees`) lista mais de 20 worktrees `hermes-workspaces/*` com destino não decidido.
  - `AUDITORIA.md` e `PLANO_100.md` estão fora do repositório.
  - PRs #94 e #97 continuam abertos (API em 11/10), embora o fechamento (`:60`) diga que devem ser encerrados como substituídos após o #98, que já foi mergeado.
- O que falta: decidir o destino de cada worktree e branch (incorporar, arquivar ou descartar), fechar #94 e #97 e registrar hashes.
- Impacto no negócio: trabalho feito pode se perder ou voltar por engano.
- Esforço: P
- Prioridade: P3

### PLA-T003  Rastreabilidade integral com aceite
- Status: PARCIAL
- Origem do plano: `etapas.csv:4`; P003
- Evidência no código: `rastreabilidade-250.csv`, `origens-historicas.json` e `subitens-legados-1000.*` existem. Porém `checklist-1000.csv` tem 1.000/1.000 `concluido=False` e `evidencia` vazia, e `etapas.csv` tem 100/100 "Planejada".
- O que falta: preencher evidência, estado e data por etapa e subitem, incluindo as 8 etapas já entregues tecnicamente.
- Impacto no negócio: não dá para mostrar a um auditor ou cliente o que está pronto e com qual prova.
- Esforço: M
- Prioridade: P2

### PLA-T004  Atribuir responsáveis e resolver decisões
- Status: NAO_INICIADA
- Origem do plano: `etapas.csv:5`; P005, P006, P007, P010, W062, W076, W078, W098; matriz P005 = "N" (`matriz-150.csv:6`)
- Evidência no código:
  - `etapas.csv`: 0 de 100 `responsavel_nominal`/`revisor_nominal`.
  - `plano.json`: `"responsavel_nominal": null` em todas.
  - `decisoes_pendentes.md:1` continua datado de 22/09.
- O que falta: nomear executor e revisor por etapa; nomear donos de negócio (compras, financeiro, marca, operação e segurança); registrar decisões de custo, alçadas, fornecedor único, retenção e publicador.
- Impacto no negócio: sem dono, nada é aceito nem cobrado; o plano não anda.
- Esforço: P
- Prioridade: P1

### PLA-T005  Homologação segregada e personas de duas cooperativas
- Status: PARCIAL
- Origem do plano: `etapas.csv:6`; P009, P011, P017, P018, W003, W005, W033, W034, W041, W067
- Evidência no código:
  - As personas existem no **próprio banco de construção canônico** (`fechamento-tecnico-2026-10-08.md:37`: vendedor, gestor, admin, dev e gerente de PA).
  - Nenhuma persona de segunda cooperativa (grep `segunda cooperativa|cooperativa_b|COOP_B|singular_b` em `e2e/` e `tests/` sem resultado).
  - Não há projeto de homologação separado (grep `staging|homologa` em `docs/secrets.md` e `DEPLOYMENT.md` sem resultado).
  - Não há RLS_TEST_* (W005).
- O que falta: ambiente segregado (ou allowlist de `project_ref`), dados sintéticos de 2 cooperativas, PAs, delegados e 3 destinos, e rotina de limpeza.
- Impacto no negócio: testes rodam no mesmo banco que vai virar produção e não provam que uma cooperativa não vê a outra.
- Esforço: M
- Prioridade: P1

### PLA-T006  Acesso administrativo verificável ao banco canônico
- Status: BLOQUEADA_EXTERNA. Depende de token válido da Management API e de quem administra o projeto Supabase.
- Origem do plano: `etapas.csv:7`; P012, W021, W050; `revisao-do-plano-2026-10-01.md:93`
- Evidência: o MCP `SUPABASE_Brindes_Sicoob_-_V2` retornou em 11/10 `Management API 401: Invalid access token` (o mesmo erro de 01/10). O fechamento de 08/10 usou acesso que não está documentado nem reproduzível.
- O que falta: usuário técnico com escopo mínimo, dono, validade e revogação registrados; teste somente leitura reproduzível.
- Impacto no negócio: ninguém de fora do lote de 08/10 consegue confirmar o estado real do banco nem aplicar correções.
- Esforço: P
- Prioridade: P1

### PLA-T007  Inventário de credenciais e configuração pública
- Status: PARCIAL
- Origem do plano: `etapas.csv:8`; P013, W003, W004, W005, W037, W041, W054, W055, W064, W065, W068, W090
- Evidência no código:
  - `docs/secrets.md` foi gerado em 13/09 e está obsoleto:
    - `:80` diz E2E_* "❌ ausente", mas o fechamento diz que estão configurados;
    - não lista `SICOOB_MALWARE_SCANNER_URL/TOKEN`, `SICOOB_APPROVAL_WORKER_SECRET` nem os E2E de admin/dev;
    - mais de 20 linhas ainda dizem "**preencher**".
  - `scripts/check-secrets-inventory.mjs` está "a criar" (`:96`) e não existe.
  - Rotação não tem calendário (W065).
  - O deploy usa `VITE_SUPABASE_PROJECT_ID` como ref de deploy (`deploy-sicoob-functions.yml:23`, W055).
  - Rotação da credencial histórica do `migrate-helper` "ainda precisa ser comprovada" (`docs/auditoria-validacao-2026-09-22.md:207,220`).
- O que falta: inventário atual por ambiente e consumidor, script de verificação na CI, calendário de rotação e rotação comprovada do que vazou.
- Impacto no negócio: segredo esquecido ou vencido derruba integrações ou fica exposto sem ninguém perceber.
- Esforço: M
- Prioridade: P1

### PLA-T008  Ensaiar backup e recuperação
- Status: NAO_INICIADA
- Origem do plano: `etapas.csv:9`; P008, P020
- Evidência:
  - `docs/DR.md:16` ("Snapshots PITR ativos para os últimos 7 dias") e `:35` ("Simulação semestral") sem nenhuma evidência.
  - Nenhum relatório de restore em `docs/execucao/evidencias/` (listagem com 67 entradas, nenhuma de restore).
  - O fechamento (`:66-76`) não trata disso.
- O que falta: confirmar se o plano Supabase contratado tem PITR; restaurar em projeto isolado (banco, Auth e Storage); medir RTO/RPO e validar vínculos banco × anexos.
- Impacto no negócio: se o banco corromper, não há prova de que dá para voltar, nem de quanto tempo levaria.
- Esforço: M
- Prioridade: P1

### PLA-T009  Proveniência das evidências (herança de `producao_verificada`)
- Status: PARCIAL
- Origem do plano: `etapas.csv:10`; P004, W096; `revisao-do-plano-2026-10-01.md:83`
- Evidência no código:
  - `scripts/qa/simular-rls-cruzada-sicoob.py:130-135` ainda copia `producao_verificada`, `projeto_canonico`, `postgres_remoto` e `aplicacao_remota` do JSON anterior para a execução local.
  - `simular-delegacao-aprovacao-sicoob.py:322-328` faz o mesmo com `banco_canonico_verificado`.
- O que falta: separar campos de execução local, remota e histórica; registrar SHA, data e comando; não herdar flag remota.
- Impacto no negócio: um teste local pode ser apresentado como "verificado em produção" sem ser.
- Esforço: P
- Prioridade: P1

### PLA-T010  Reconciliação de PRs pendentes
- Status: PARCIAL
- Origem do plano: `etapas.csv:11`; P016
- Evidência:
  - PR #75 fechado sem merge (API: `merged=null`); correções reaplicadas em #87, #88 e #98.
  - #94 e #97 continuam abertos, embora o próprio fechamento diga que devem ser encerrados como substituídos (`fechamento-tecnico-2026-10-08.md:60`).
- O que falta: fechar #94 e #97 com referência ao #98 e confirmar que nada exclusivo deles se perdeu.
- Impacto no negócio: PR velho pode ser mergeado por engano e reintroduzir defeito.
- Esforço: P
- Prioridade: P3

### Fase 2 — CI/CD

### PLA-T011  Runners, cotas, custo e artefatos
- Status: PARCIAL
- Origem do plano: `etapas.csv:12`; P014, W001, W002, W024, W087, W092, W093
- Evidência:
  - Todos os workflows usam `runs-on: ubuntu-latest` (hospedado, cobrado em repositório privado).
  - E2E: gate de 35 min + regressão de 3 shards **seriais** (`max-parallel: 1`) de 40 min (`e2e.yml:38,214-221`).
  - Sem relatório de uso (W092) e sem meta registrada (W024; `docs/CI_CD.md:3` desatualizado).
  - Retenção 7–30 dias já existe nos uploads.
- O que falta: medir minutos e custo por PR, decidir orçamento e revisitar a meta de ≤30 min/PR.
- Impacto no negócio: a conta de GitHub Actions pode estourar ou bloquear a CI de novo, como em 16/09.
- Esforço: P
- Prioridade: P2

### PLA-T012  Gates honestos e obrigatórios
- Status: PARCIAL
- Origem do plano: `etapas.csv:13`; P014, W006, W031, W035, W039, W069
- Evidência:
  - Avançou: E2E exige credenciais (`e2e.yml:76-82`); `sicoob-gate` agrega resultados; o step de simulação Sicoob não usa mais `continue-on-error`.
  - Persistem:
    - `scripts/db-performance-audit.mjs:28-36` engole erro de RPC e sai com 0, com consulta genérica `SELECT * … LIMIT 100`;
    - regressão E2E com `continue-on-error` (`e2e.yml:278`, W035);
    - sem checks obrigatórios (ver T019).
- O que falta: fazer os scripts de auditoria falharem quando houver erro; registrar os checks agregadores como obrigatórios.
- Impacto no negócio: um "verde" na CI ainda pode esconder auditoria que não rodou.
- Esforço: P
- Prioridade: P1

### PLA-T013  Dívida técnica residual
- Status: PARCIAL
- Origem do plano: `etapas.csv:14`; P141, W028
- Evidência:
  - Erros zerados: `.typecheck-baseline.json` (`total: 0`) e `.eslint-baseline.json` (`totalErrors: 0`).
  - Restam **872 avisos ESLint** sem plano de redução (`fechamento-tecnico-2026-10-08.md:14,21`).
  - Páginas monolíticas apontadas na auditoria de 02/10 (`auditoria-tecnica-2026-10-02.md:24-25`) continuam sem tratamento.
- O que falta: destino e aceite de cada classe de aviso, com meta de redução.
- Impacto no negócio: custo de manutenção alto; mudanças demoram e quebram mais.
- Esforço: M
- Prioridade: P3

### PLA-T014  Testes ignorados e cobertura real
- Status: PARCIAL
- Origem do plano: `etapas.csv:15`; P142
- Evidência:
  - A cobertura obrigatória mede **só 9 arquivos** (`vitest.config.ts:39-49`).
  - Ainda há 68 testes e 4 arquivos ignorados (`fechamento-tecnico-2026-10-08.md:16`).
  - Não há classificação por dono, motivo e prazo.
- O que falta: ampliar a cobertura por risco (orçamento, verba, RLS, Edge) e classificar cada skip.
- Impacto no negócio: o número de cobertura dá falsa segurança; áreas de dinheiro não são medidas.
- Esforço: M
- Prioridade: P2

### PLA-T015  Reorganizar execução e custo da CI
- Status: PARCIAL
- Origem do plano: `etapas.csv:16`; P019, W007…W023
- Evidência:
  - `ci.yml:22-135` continua um job serial único (W015).
  - Simulações duplicadas (W016).
  - `fetch-depth: 0` desnecessário (W020).
  - Sem composite action (W023).
  - `deno test` só de 1 arquivo (W026).
  - Loop curl e PWA com servidor próprio (W030).
- O que falta: jobs paralelos com `needs`, deduplicação e clone raso, sem perder cobertura.
- Impacto no negócio: CI lenta e cara; o desenvolvedor espera mais por cada entrega.
- Esforço: M
- Prioridade: P2

### PLA-T016  Artefato único e reproduzível
- Status: PARCIAL
- Origem do plano: `etapas.csv:17`; W012, W027, W029, W033, W046, W048, W063
- Evidência:
  - Já existe gate contra conteúdo demo no build (`ci.yml:122-135`).
  - Não há build único com checksum consumido por bundle, Lighthouse e E2E (W012): cada workflow roda `npm run build`.
  - Não há `.env.ci` (W033).
  - Não há E2E sobre preview (W063).
- O que falta: publicar o `dist` por SHA com hash e consumi-lo em todos os testes.
- Impacto no negócio: o que é testado pode não ser exatamente o que vai ao ar.
- Esforço: M
- Prioridade: P2

### PLA-T017  Endurecer Actions e dependências
- Status: PARCIAL
- Origem do plano: `etapas.csv:18`; W014, W017, W032, W036…W044, W079…W089
- Evidência:
  - Feito: actions fixadas por SHA (W081) e resumo SARIF (W044).
  - Faltam: actionlint (W083), zizmor (W084), `dependency-review-action` (W080), allowlist de actions (W082), guarda de fork (W089) e harden-runner (W088). Grep `actionlint|zizmor|dependency-review|harden-runner` em `.github/` sem resultado.
- O que falta: lint e auditoria de workflows e revisão de dependências em PR.
- Impacto no negócio: um workflow mal escrito ou uma dependência maliciosa pode vazar segredos.
- Esforço: P
- Prioridade: P2

### PLA-T018  Homologar E2E, visual e desempenho
- Status: PARCIAL
- Origem do plano: `etapas.csv:19`; P018, W010, W011, W029, W030, W033, W035, W045, W047, W063, W067
- Evidência:
  - O E2E hospedado exige 4 personas com TOTP (`e2e.yml:47-82`).
  - A QA visual roda só em build com `VITE_ENABLE_DEMO_PAGES=true` e backend sintético (`sicoob-ci.yml:84-104`).
  - O Lighthouse mede só `/login` (`.lighthouserc.cjs:6`).
  - Não há homologação segregada (T005).
  - O webkit é instalado em todos os shards (W011).
- O que falta: E2E sobre ambiente de homologação com duas cooperativas; Lighthouse nas jornadas críticas.
- Impacto no negócio: as jornadas de compra não são testadas como o cliente real as usa.
- Esforço: M
- Prioridade: P1

### PLA-T019  Proteger revisão, merge e publicação
- Status: NAO_INICIADA
- Origem do plano: `etapas.csv:20`; P015, W004, W008, W031, W051…W053, W061, W069…W076; `decisoes_pendentes.md:55-59`
- Evidência (API GitHub em 11/10):
  - `branches/main` retorna `required_status_checks: {checks: [], contexts: [], enforcement_level: "off"}`.
  - O repositório tem `allow_merge_commit=true`, `allow_rebase_merge=true`, `delete_branch_on_merge=false`, `allow_update_branch=false`.
  - `rulesets` vazio.
  - O sentinel (`branch-protection-sentinel.yml:38-58`) só inspeciona a mensagem do commit, depois do fato.
- O que falta: checks obrigatórios (Segurança/contratos/build, e2e, Gitleaks, bundle, `sicoob-gate`), `enforce_admins`, último push aprovado, só squash e exclusão automática de branch.
- Impacto no negócio: qualquer pessoa com acesso pode colocar código quebrado ou inseguro no ar sem passar pelos testes.
- Esforço: P
- Prioridade: P1

### PLA-T020  Operação observável da CI
- Status: PARCIAL
- Origem do plano: `etapas.csv:21`; P019, W021, W024, W039, W042, W049…W052, W077, W078, W091…W099
- Evidência:
  - Existem `CODEOWNERS` e resumos em `STEP_SUMMARY`.
  - Faltam:
    - aviso de falha (W091);
    - relatório de uso (W092);
    - runbook "CI vermelha" (W099; `docs/RUNBOOK.md` sem seção);
    - template único de PR (W077: dois arquivos);
    - `reports/` fora do git (W096);
    - pre-push enxuto (W097);
    - docs atualizadas (W094).
- O que falta: canal de alerta aprovado, runbook de rerun e reversão, e limpeza de templates e relatórios.
- Impacto no negócio: falhas na `main` passam dias sem ninguém ver.
- Esforço: P
- Prioridade: P2

### Fase 3 — Banco e Edge

### PLA-T021  Inventário completo de schema
- Status: PARCIAL
- Origem do plano: `etapas.csv:22`; P021
- Evidência: `scripts/db/.inventory-cache.json` (gerado em 08/10, 222 relações, 237 funções, 14 buckets) declara no `_comment`: "**Não é inventário completo do PostgreSQL**". Faltam triggers, ACLs, enums, índices, extensões e jobs de cron.
- O que falta: coleta autenticada do catálogo completo, sanitizada e com hash.
- Impacto no negócio: mudanças de banco são feitas sem mapa completo; risco de quebrar algo invisível.
- Esforço: M
- Prioridade: P2

### PLA-T022  Reconciliar migrations e baseline
- Status: PARCIAL
- Origem do plano: `etapas.csv:23`; P022, P023, P030, W050
- Evidência:
  - `scripts/db/migration-ledger-baseline.json` registra 491 diferenças (`local_sem_ledger: 462`, `conteudo_nao_verificado: 19`, `nome_divergente: 9`, `conteudo_divergente: 1`) como "fotografia".
  - Não existe baseline reproduzível do schema.
- O que falta: classificar as 491 por objeto (aplicada, equivalente ou obsoleta) e produzir um baseline que recrie o banco do zero.
- Impacto no negócio: não dá para recriar o banco em outro ambiente com segurança, o que bloqueia homologação e DR.
- Esforço: G
- Prioridade: P2

### PLA-T023  Tipos, APIs e inventário de runtime
- Status: PARCIAL
- Origem do plano: `etapas.csv:24`; P024, P028, W068
- Evidência:
  - `src/integrations/supabase/types.ts` não tem cabeçalho de origem, hash ou data; não há script `types:gen` em `package.json`.
  - A auditoria de 02/10 recomendou regenerar por migration na CI (`auditoria-tecnica-2026-10-02.md:111`).
  - `scripts/db/.check-runtime-refs-allowlist.json` está desatualizado (ver PLA-X05).
- O que falta: geração automatizada de tipos com origem e hash, e allowlist revisada.
- Impacto no negócio: tela e banco podem divergir sem aviso.
- Esforço: P
- Prioridade: P2

### PLA-T024  RLS por papel e unidade (matriz positiva e negativa)
- Status: PARCIAL
- Origem do plano: `etapas.csv:25`; P025, W005
- Evidência:
  - 236 tabelas com RLS e policy (`fechamento:31`).
  - A validação remota cobre só `edge-authz-bypass` e `e2e-cleanup-rate-limit` (`e2e.yml:84-92`).
  - A matriz cruzada de cooperativas é só local (`simular-rls-cruzada-sicoob.py`).
  - Não há personas de 2 cooperativas (W005).
- O que falta: matriz tabela × ação × papel com positivos e negativos contra o banco real, incluindo ator inativo e sessão revogada.
- Impacto no negócio: não há prova, no ambiente real, de que uma cooperativa não lê pedidos ou verbas de outra.
- Esforço: M
- Prioridade: P1

### PLA-T026  Integridade e desempenho do banco
- Status: PARCIAL
- Origem do plano: `etapas.csv:27`; P027, P029, W049
- Evidência:
  - Migrations de otimização existem (`20261007230000_optimize_foreign_keys_and_duplicate_indexes.sql`, `20261007231500_optimize_rls_auth_initplans.sql`), mas sem medida antes/depois versionada.
  - A auditoria mensal é genérica e silencia erros (`scripts/db-performance-audit.mjs:28-36`).
  - Os recursos legados das decisões D08 continuam lá.
- O que falta: auditoria de órfãos e constraints; EXPLAIN das consultas críticas com volume real.
- Impacto no negócio: lentidão ou dados órfãos aparecem só quando o volume real chegar.
- Esforço: M
- Prioridade: P3

### PLA-T028  Ensaiar evolução e compatibilidade
- Status: PARCIAL
- Origem do plano: `etapas.csv:29`; P030, W058
- Evidência:
  - Simulações em PostgreSQL descartável existem (`scripts/qa/*.py`).
  - Existe a ADR `docs/adr/0009-expand-contract-migrations.md`.
  - Não há ensaio sobre cópia sanitizada nem teste de cliente antigo × novo.
- O que falta: ensaio com cópia representativa e teste de compatibilidade de versões.
- Impacto no negócio: um deploy pode deixar usuários com a tela antiga gravando dado errado.
- Esforço: M
- Prioridade: P3

### PLA-T030  Certificar banco e recursos Edge
- Status: PARCIAL
- Origem do plano: `etapas.csv:31`; P071, P072, P079, P080, W025, W026, W055…W060
- Evidência:
  - 100 funções ACTIVE e 6 não publicáveis (`fechamento:43-46`).
  - Pendências:
    - scanner não configurado (T075);
    - rotação da credencial do `migrate-helper` não comprovada (`docs/auditoria-validacao-2026-09-22.md:207`);
    - deploy versionado cobre 7 de 108 funções (W059);
    - sem smoke HTTP pós-deploy (W060);
    - histórico de execução de cron e Vault não versionado.
- O que falta: relatório de paridade datado com cron e worker comprovados e smoke autenticado.
- Impacto no negócio: funções de fundo (fila de aprovação, exportações) podem estar paradas sem sinal.
- Esforço: M
- Prioridade: P2

### Fase 4 — Orçamentos

### PLA-T033  Versão observada pela tela na transição de status
- Status: PARCIAL
- Origem do plano: `etapas.csv:34`; P033, P043, P046 (`matriz-150.csv:34`)
- Evidência no código:
  - A transição individual e em lote **lê a versão do banco no momento do clique** (`src/hooks/quotes/useQuotes.ts:124,169`; `src/services/quoteStatusTransition.ts:34-44,69-72`) em vez de usar a versão que a tela carregou.
  - A edição já usa `expectedRowVersion` (`QuoteService.ts:226-230`).
- O que falta: transportar `row_version` da tela até a RPC e oferecer "recarregar, comparar, reaplicar".
- Impacto no negócio: um gestor pode aprovar uma versão do orçamento que mudou segundos antes.
- Esforço: P
- Prioridade: P2

### PLA-T035  Criação idempotente: tabela e chave persistente
- Status: PARCIAL
- Origem do plano: `etapas.csv:36`; P041, P042, P048
- Evidência:
  - `20260928173500_harden_quote_save_idempotency.sql:107` concede `SELECT, INSERT` direto ao `authenticated`. O cliente ainda pode inserir registros de intenção pela API, embora restritos ao próprio orçamento (`:24-34`).
  - A chave de criação vive só em `useRef` (`useQuoteBuilderState.ts:283,394`) e é zerada antes da transição (`:603`).
  - A edição chama `save_quote_atomic` sem chave (`QuoteService.ts:223`).
- O que falta: INSERT só via RPC (`SECURITY DEFINER`), chave persistida entre remontagens e contrato recuperável para edição.
- Impacto no negócio: queda de rede no momento de salvar pode gerar orçamento duplicado.
- Esforço: P
- Prioridade: P1

### PLA-T036  Identidade dos itens: remoção com vínculos
- Status: PARCIAL
- Origem do plano: `etapas.csv:37`; P041, P044, P102
- Evidência:
  - O upsert por id está resolvido (PR #88).
  - Itens ausentes do payload são apagados direto (`20261002160000_...sql:370-381`), sem checar arte ou pedido dependente nem compensação.
  - A arte não referencia o item (ver T072).
- O que falta: regra explícita para a remoção de item com arte ou pedido vinculado.
- Impacto no negócio: remover um item pode deixar arte aprovada órfã ou referenciar produto errado.
- Esforço: P
- Prioridade: P2

### PLA-T037  Validar o contrato comercial no servidor
- Status: PARCIAL
- Origem do plano: `etapas.csv:38`; P041, P045 (`matriz-150.csv:46`)
- Evidência no código:
  - `save_quote_atomic` usa `unit_price` (`20261002160000_quote_items_id_format_validation.sql:83`) e `personalizations.total_cost` (`:101`) **vindos do navegador**.
  - `total_cost` da personalização é somado ao subtotal (`:110`) sem conferência com `setup_cost + unit_cost × qtd`.
  - Não há validação contra preço de catálogo. A auditoria de 02/10 trata isso como decisão de negócio (`auditoria-tecnica-2026-10-02.md:75`).
  - `docs/regras-orcamento.md` não existe (recomendado em `:76`).
- O que falta: decidir a autoridade do preço (catálogo × negociado com alçada), validar a coerência dos custos de personalização e documentar as regras.
- Impacto no negócio: um vendedor pode enviar preço ou custo adulterado, e a margem ou o total aparecem errados ao cliente.
- Esforço: M
- Prioridade: P1

### PLA-T038  Editor e conversão transacional (homologação)
- Status: PARCIAL
- Origem do plano: `etapas.csv:39`; P042, P043, P047, P049
- Evidência: `OrderService.convertQuoteToOrder` e a RPC `convert_quote_to_sicoob_order` existem, e a simulação local roda na CI (`ci.yml:104-105`). Não há prova remota de conversão com versão aprovada, arte e verba (matriz P049).
- O que falta: ensaio remoto de conversão única com retries e reedição.
- Impacto no negócio: risco de pedido duplicado ou com preço diferente do orçamento aprovado.
- Esforço: M
- Prioridade: P2

### PLA-T039  Publicar o lote de orçamentos corrigido (frontend correspondente)
- Status: PARCIAL
- Origem do plano: `etapas.csv:40`; P039, W058
- Evidência:
  - O SQL está no ledger (`fechamento:27`).
  - Não há prova de que o artefato servido no domínio corresponde ao SHA `dc08200`. O domínio serve a raiz com configuração de headers diferente da versionada (ver T095).
- O que falta: amarrar o deploy do frontend ao SHA e registrar no manifesto (T001).
- Impacto no negócio: banco novo com tela antiga, ou o contrário, quebra a jornada de orçamento.
- Esforço: P
- Prioridade: P1

### PLA-T040  Homologar a jornada de orçamento
- Status: PARCIAL
- Origem do plano: `etapas.csv:41`; P040, P050, P135
- Evidência: existem specs `e2e/quote-create.spec.ts` e `e2e/quote-approval.spec.ts` com uma organização. Não há ciclo com duas cooperativas, PDF e conferência SQL independente (matriz P050 = V).
- O que falta: aceite funcional com evidência positiva e negativa e de duas cooperativas.
- Impacto no negócio: a jornada principal de venda não tem aceite formal.
- Esforço: M
- Prioridade: P1

### Fase 5 — Rascunhos e notificações

### PLA-T041  Identidade e recuperação de rascunhos
- Status: PARCIAL
- Origem do plano: `etapas.csv:42`; P051, P052, P053
- Evidência:
  - A chave é por usuário (`QuoteAutoSave.tsx:119`), mas **sem cooperativa/PA**.
  - A restauração é **automática**, sem opção "retomar ou descartar" (`:99-104`).
  - O UUID do rascunho novo fica em `sessionStorage` (`:39-46`) e se perde ao fechar a aba.
- O que falta: identidade por ator + unidade + intenção e retomada consciente.
- Impacto no negócio: o vendedor perde rascunho ao fechar a aba ou vê rascunho de outra unidade.
- Esforço: P
- Prioridade: P2

### PLA-T042  Formato, retenção e concorrência entre abas
- Status: PARCIAL
- Origem do plano: `etapas.csv:43`; P056 (matriz "N", `matriz-150.csv:57`), P057
- Evidência:
  - `useAutoSave.ts:19-22` devolve versão desconhecida como "legado".
  - O envelope vencido retorna `null` sem remover o registro (`:25`).
  - Não há `BroadcastChannel` nem listener de `storage` no autosave (grep: só em `AuthDiagnosticsWidget`, `useVoiceHistory` e `DevInfraGate`).
  - `localStorage.getItem` fica fora do `try` (`:102`).
- O que falta: coordenação entre abas, recusa de versão futura e limpeza dos vencidos.
- Impacto no negócio: duas abas abertas sobrescrevem o trabalho uma da outra em silêncio.
- Esforço: P
- Prioridade: P2

### PLA-T043  Logout, revogação e troca de unidade
- Status: PARCIAL
- Origem do plano: `etapas.csv:44`; P053, P054
- Evidência:
  - `AuthContext.tsx:100-108` limpa `sessionStorage` e 4 chaves fixas, **mas não `autosave_*`**. Grep `autosave_` só aparece em `useAutoSave.ts`.
  - O rascunho com dados de cliente fica no `localStorage` do dispositivo após o logout.
- O que falta: limpeza ou expiração seletiva por ator e unidade e revalidação de escopo antes de restaurar.
- Impacto no negócio: em computador compartilhado de PA, dados de clientes e preços ficam salvos depois que o usuário sai.
- Esforço: P
- Prioridade: P1

### PLA-T044  Autosave ligado à intenção confirmada
- Status: PARCIAL
- Origem do plano: `etapas.csv:45`; P055, P058, P136
- Evidência:
  - O indicador mostra "Salvo agora" para gravação **local** (`QuoteAutoSave.tsx:58`).
  - A chave de criação não acompanha o rascunho (`useQuoteBuilderState.ts:283,603`).
- O que falta: estados distintos (local, remoto pendente, confirmado, conflito) e chave persistida até a confirmação.
- Impacto no negócio: o usuário acha que salvou no sistema quando só salvou no navegador.
- Esforço: P
- Prioridade: P1

### PLA-T045  Homologar edição resiliente
- Status: NAO_INICIADA
- Origem do plano: `etapas.csv:46`; P059, P060
- Evidência: só testes unitários com mock de storage. Nenhum ensaio de recarga, offline, timeout ou dois dispositivos (matriz P059/P060 = V).
- O que falta: matriz de cenários com duas personas.
- Impacto no negócio: perda de trabalho em rede ruim não é medida.
- Esforço: M
- Prioridade: P2

### PLA-T046  Eventos e outbox de notificações
- Status: PARCIAL
- Origem do plano: `etapas.csv:47`; P061, P062
- Evidência:
  - A outbox durável existe para aprovação de pedidos Sicoob.
  - O aviso "PAC → Singular" virou trigger transacional (`20260928182000_...sql:94-127`).
  - Notificações de desconto (`useDiscountApproval.ts:99,191`) e de comentário (`useQuoteComments.ts:172-175`, erro engolido) continuam inseridas pelo navegador depois da ação.
  - Não há catálogo único de eventos (arte, documentos, remessas, avarias).
- O que falta: catálogo de eventos e destinatários e intenção transacional para os demais eventos.
- Impacto no negócio: aprovador pode não ser avisado de pedido de desconto ou comentário.
- Esforço: M
- Prioridade: P2

### PLA-T047  Deduplicação e elegibilidade do destinatário
- Status: PARCIAL
- Origem do plano: `etapas.csv:48`; P063, P064, P065
- Evidência:
  - O trigger de quote seleciona `profiles` por cooperativa e papel **sem filtro `is_active`/`deleted_at`** (`20260928182000_...sql:119-123`), mesmo com a coluna existindo em `profiles` (`types.ts:1905`).
  - Não há chave de deduplicação para eventos de quote.
- O que falta: filtro de usuário ativo e vigente e chave evento + versão + destinatário.
- Impacto no negócio: ex-funcionário continua recebendo aviso de orçamento da cooperativa.
- Esforço: P
- Prioridade: P2

### PLA-T048  Homologar provedores, templates e cron
- Status: BLOQUEADA_EXTERNA. Depende de chave Resend e remetente verificados, Slack autorizado e destinatário de teste aprovado (TI/operação).
- Origem do plano: `etapas.csv:49`; P066, P079
- Evidência: `docs/secrets.md` marca `RESEND_API_KEY` e `NOTIFICATION_FROM_EMAIL` como "**configuração remota ainda não verificada**". Não há recibo real de envio.
- O que falta: envio real com recibo para destinatário autorizado e histórico do cron.
- Impacto no negócio: e-mails de aprovação podem não estar saindo.
- Esforço: P
- Prioridade: P1

### PLA-T049  Falhas de entrega e alertas
- Status: PARCIAL
- Origem do plano: `etapas.csv:50`; P067, P068, P073, P129, W091
- Evidência:
  - O painel `SicoobApprovalReconciliationPage` existe e está roteado (`routes/config/admin.ts:15`).
  - Faltam: falhas de notificação de quote visíveis, alerta com dono e SLA, Sentry com DSN confirmado (`src/lib/sentry.ts:27`, opcional) e ensaio de operador.
- O que falta: alerta entregue com dono e SLA e visibilidade de todos os domínios.
- Impacto no negócio: falhas operacionais ficam invisíveis até o cliente reclamar.
- Esforço: M
- Prioridade: P2

### PLA-T050  Homologar notificações ponta a ponta
- Status: NAO_INICIADA
- Origem do plano: `etapas.csv:51`; P069, P070
- Evidência: nenhum ensaio da cadeia decisão → outbox → provedor → painel (matriz P070 = V).
- O que falta: matriz por evento e canal.
- Impacto no negócio: sem prova de que avisos chegam a quem decide.
- Esforço: M
- Prioridade: P2

### Fase 6 — Governança entre cooperativas, catálogo e verba

### PLA-T051  Convites institucionais (homologação)
- Status: PARCIAL
- Origem do plano: `etapas.csv:52`; P081, P082
- Evidência: rotas `/gestor/convites` (`routes/config/sicoob-rbac.ts:17`) e aceite público (`routes/config/public.ts:30`) existem. A evidência é só local (`docs/execucao/evidencias/convites-sicoob.json`). Não há matriz de negativas remota.
- O que falta: homologação remota com token expirado ou repetido e ator sem alçada.
- Impacto no negócio: risco de convite indevido dar acesso a outra unidade.
- Esforço: P
- Prioridade: P2

### PLA-T052  Políticas e alçadas versionadas
- Status: PARCIAL
- Origem do plano: `etapas.csv:53`; P083
- Evidência:
  - O servidor guarda versão e snapshot da política (`20260922161000_repair_sicoob_approval_policy_snapshot.sql:10-12`).
  - **Não há tela de gestão** de `sicoob_approval_policies` (zero consumidores em `src/` fora de `types.ts`).
  - Regra de alçada fixa e órfã no cliente (PLA-X04).
  - As regras comerciais não foram aprovadas pelo negócio.
- O que falta: tela de políticas com vigência e aprovação das alçadas pelo negócio.
- Impacto no negócio: mudar uma alçada exige SQL manual, sem trilha.
- Esforço: M
- Prioridade: P2

### PLA-T053  Fila de aprovação e delegação (homologação)
- Status: PARCIAL
- Origem do plano: `etapas.csv:54`; P084, P085, P086
- Evidência: delegação no servidor (`20260927203000_sicoob_approval_delegations.sql`) e fila em `/gestor/aprovacoes`. Faltam prova de documentos obrigatórios, decisão concorrente e cancelamento (matriz P084).
- O que falta: ensaio remoto com dois aprovadores e delegado expirado.
- Impacto no negócio: risco de dupla aprovação ou aprovação por delegado vencido.
- Esforço: P
- Prioridade: P2

### PLA-T054  Propostas institucionais comparáveis
- Status: NAO_INICIADA
- Origem do plano: `etapas.csv:55`; P087 (matriz "N", `matriz-150.csv:88`)
- Evidência: grep `institutional_proposal|proposta_institucional|supplier_proposal|vendor_quote|cotacao_fornecedor` em `src/`, `supabase/migrations` e `supabase/functions` sem resultado. O comparador existente é de produtos.
- O que falta: modelo de propostas (preço, personalização, prazo, frete, tributos, validade, anexos) e comparação.
- Impacto no negócio: a cooperativa não consegue comparar fornecedores dentro do portal; a compra institucional fica sem trilha.
- Esforço: G
- Prioridade: P2

### PLA-T055  Escolha e fornecedor único
- Status: NAO_INICIADA
- Origem do plano: `etapas.csv:56`; P088 (`matriz-150.csv:89`)
- Evidência: grep `fornecedor_unico|single_source|sole_supplier` sem resultado. O único `single_source` é um check de recompra (`20260927210000_sicoob_reorder_catalog_validity.sql:14`), que não tem relação.
- O que falta: política, justificativa, aprovação da exceção e reaprovação por mudança material.
- Impacto no negócio: a escolha de fornecedor sem concorrência não fica justificada, o que é risco de compliance para as cooperativas.
- Esforço: M
- Prioridade: P2

### PLA-T056  Verba na aprovação (servidor e exceção)
- Status: PARCIAL
- Origem do plano: `etapas.csv:57`; P089, P124, P125
- Evidência:
  - Corrigido no editor: PA do perfil + ano/mês + falha fechada (`useQuoteBuilderState.ts:191-211`).
  - A validação de verba no envio do orçamento é **só no cliente**. O servidor só bloqueia ao inserir `sicoob_orders` (`20260911143000_sicoob_order_budget_atomicity.sql:55-62`).
  - Não há reserva de saldo na aprovação da Singular nem regra de exceção com alçada.
- O que falta: validação e reserva no servidor na transição e exceção autorizada.
- Impacto no negócio: orçamentos acima da verba podem ser aprovados e só falham na hora do pedido.
- Esforço: M
- Prioridade: P1

### PLA-T057  Homologar governança entre cooperativas
- Status: NAO_INICIADA
- Origem do plano: `etapas.csv:58`; P090
- Evidência: depende de T054 e T055 (inexistentes) e de personas de 2 cooperativas (T005).
- O que falta: ensaio completo e aceite do responsável de negócio.
- Impacto no negócio: sem aceite, não dá para operar várias cooperativas com segurança.
- Esforço: M
- Prioridade: P2

### PLA-T058  Catálogo mestre somente leitura (prova de ACL na origem)
- Status: PARCIAL
- Origem do plano: `etapas.csv:59`; P091
- Evidência:
  - O código bloqueia escrita (`supabase/functions/_shared/external-read-only.ts:4-25`, só GET/HEAD; `external-db-bridge/index.ts:479-480`).
  - As 7 funções usam `createReadOnlyCatalogFetch`.
  - As funções ainda usam `EXTERNAL_SUPABASE_SERVICE_KEY` (credencial de serviço, não papel somente leitura) e não há prova de ACL na origem `doufsxqlfjyuvxuezpln`.
  - A UI ainda tem mutações (ver PLA-X01).
- O que falta: credencial de leitura na origem e prova administrativa da ACL.
- Impacto no negócio: se a trava de código falhar, a chave de serviço permite alterar o catálogo mestre.
- Esforço: P
- Prioridade: P1

### PLA-T059  Normalizar produto, preço, estoque e validade
- Status: PARCIAL
- Origem do plano: `etapas.csv:60`; P092, P134
- Evidência: o contrato compartilhado de normalização foi criado (`fechamento:48`). O editor genérico aceita parcelas locais (T037). Não há homologação de nulos, produto removido e validade em todas as superfícies (matriz P092).
- O que falta: homologação dos casos extremos em card, detalhe, kit, orçamento e recompra.
- Impacto no negócio: preço ou estoque mostrado pode divergir entre telas.
- Esforço: M
- Prioridade: P2

### PLA-T060  Homologar descoberta e seleção na loja
- Status: PARCIAL
- Origem do plano: `etapas.csv:61`; P093, P133
- Evidência: a QA visual roda em loja e demo sintéticas em 3 larguras (`fechamento:54`). Não há busca por intenção nem sessão real de comprador (matriz P093 = V).
- O que falta: jornadas com dados reais de homologação e compradores.
- Impacto no negócio: o comprador pode não achar o produto certo.
- Esforço: M
- Prioridade: P2

### Fase 7 — Catálogo, kits e recompra

### PLA-T061  Templates, favoritos e coleções
- Status: PARCIAL
- Origem do plano: `etapas.csv:62`; P098
- Evidência: o upsert de favoritos foi corrigido (`20261008123000_fix_favorite_items_upsert_conflict.sql`). Faltam o tratamento de produto removido em coleção compartilhada e a revalidação ao aplicar template (matriz P098).
- O que falta: versionar conteúdo e tratar itens removidos ou alterados.
- Impacto no negócio: template velho pode gerar orçamento com produto descontinuado.
- Esforço: P
- Prioridade: P3

### PLA-T063  Modelar embalagem e capacidade física
- Status: NAO_INICIADA
- Origem do plano: `etapas.csv:64`; P095 (`matriz-150.csv:96`)
- Evidência: o kit exige uma embalagem (`sicoob-kit-quote/catalog.ts:122-133`), mas **não há dimensões, peso nem tolerância** da embalagem. `width`/`height` são só da área de personalização (`:257-266`).
- O que falta: cadastro físico de produto e embalagem e estado de "revisão técnica" quando a informação faltar.
- Impacto no negócio: o portal vende kit que fisicamente não cabe na caixa.
- Esforço: M
- Prioridade: P2

### PLA-T064  Validar embalagem no servidor
- Status: NAO_INICIADA
- Origem do plano: `etapas.csv:65`; P096 (`matriz-150.csv:97`)
- Evidência: grep `packaging_capacity|capacidade_embalagem|box_dimensions|packaging_spec` em `supabase/` sem resultado.
- O que falta: regra geométrica e de peso na cotação do kit e parecer técnico vinculado.
- Impacto no negócio: retrabalho e prejuízo quando o kit montado não fecha.
- Esforço: M
- Prioridade: P2

### PLA-T065  Previsão e prazo de reposição
- Status: PARCIAL
- Origem do plano: `etapas.csv:66`; P097
- Evidência:
  - `src/hooks/useKitStockForecast.ts:44` tem `BUFFER_DAYS = 3` fixo.
  - `sourceEntries` (`:89-98`) aceita data passada como reposição futura.
  - Não há indicador de confiança.
- O que falta: buffer configurável, descarte de datas vencidas e exibição de incerteza.
- Impacto no negócio: prazo prometido ao cliente pode ser fantasioso.
- Esforço: P
- Prioridade: P2

### PLA-T066  Cotação e publicação de kit
- Status: PARCIAL
- Origem do plano: `etapas.csv:67`; P076
- Evidência: `sicoob-kit-quote` valida composição comercial e é publicada no deploy (`deploy-sicoob-functions.yml:48`). Falta capacidade física (T064) e chamada remota autenticada com adulteração.
- O que falta: ensaio remoto e integração com T064.
- Impacto no negócio: cotação de kit aprovada sem viabilidade física.
- Esforço: P
- Prioridade: P2

### PLA-T067  Persistência e compartilhamento de kits
- Status: PARCIAL
- Origem do plano: `etapas.csv:68`; P098
- Evidência: `custom_kits`, `useKitShare.ts`, `KitShareLinkDialog.tsx` e `PublicKitViewPage.tsx` existem. Não persistem parecer de embalagem nem versão de preço; não há prova de revogação e expiração.
- O que falta: versão de preço e embalagem por kit e homologação de revogação.
- Impacto no negócio: link de kit compartilhado pode mostrar composição ou preço antigo.
- Esforço: P
- Prioridade: P3

### PLA-T069  Diferenças comerciais da recompra (homologação)
- Status: PARCIAL
- Origem do plano: `etapas.csv:70`; P099
- Evidência: a Edge revalida o catálogo e o banner exige confirmação (matriz P099). Não há ensaio com produto descontinuado ou saldo insuficiente.
- O que falta: homologação remota.
- Impacto no negócio: a recompra pode criar compromisso com preço desatualizado.
- Esforço: P
- Prioridade: P2

### PLA-T070  Homologar catálogo, kits e recompra conectados
- Status: NAO_INICIADA
- Origem do plano: `etapas.csv:71`; P100
- Evidência: depende de T063, T064 e T066. Nenhum ensaio integrado (matriz P100 = V).
- O que falta: jornadas unitária, kit e recompra em mobile e desktop.
- Impacto no negócio: as três formas de vender não têm aceite.
- Esforço: M
- Prioridade: P2

### Fase 8 — Arte, documentos e integrações

### PLA-T071  Marca e ativos institucionais
- Status: BLOQUEADA_EXTERNA. Depende do responsável de marca Sicoob (aceite, direitos e vigência).
- Origem do plano: `etapas.csv:72`; P101, P132
- Evidência: o BrandKit existe, mas sem titularidade, direitos ou vigência (matriz P101). Não há aceite formal de marca (P132 = V).
- O que falta: catálogo de ativos com direitos e aceite do responsável.
- Impacto no negócio: uso de logo ou versão não aprovada pela marca.
- Esforço: M
- Prioridade: P2

### PLA-T072  Vincular arte ao item e à versão
- Status: PARCIAL
- Origem do plano: `etapas.csv:73`; P044, P102
- Evidência: `sicoob_order_artwork_versions` (`types.ts:9834`) não tem `order_item_id`, `quote_item_id`, variante, técnica, posição nem dimensão. A arte só se liga ao pedido.
- O que falta: vínculo arte ↔ item/variante e invalidação da aprovação quando a especificação muda.
- Impacto no negócio: arte aprovada para um item pode ser usada em outro produto.
- Esforço: M
- Prioridade: P2

### PLA-T073  Prova técnica e decisão de arte
- Status: PARCIAL
- Origem do plano: `etapas.csv:74`; P103, P104
- Evidência: a decisão formal (`decide_sicoob_order_artwork`) e o bloqueio de produção existem. O contrato `ArtworkRequest` só exige `orderId`/`filePath` e não guarda posição, técnica, dimensões, cores nem embalagem (matriz P103).
- O que falta: prova técnica com especificação comercial e revisão humana identificada.
- Impacto no negócio: produção sem especificação técnica clara gera erro de gravação.
- Esforço: M
- Prioridade: P2

### PLA-T074  Ingestão e quarentena documental
- Status: PARCIAL
- Origem do plano: `etapas.csv:75`; P075, P105, P106
- Evidência: o fluxo de quarentena existe; o resultado de `remove` não é conferido e não há retomada durável se o processo cair (matriz P106).
- O que falta: coleta de órfãos no Storage e ensaio de interrupção.
- Impacto no negócio: arquivos órfãos acumulam custo e podem expor dados.
- Esforço: P
- Prioridade: P2

### PLA-T075  Scanner antimalware real
- Status: BLOQUEADA_EXTERNA. Depende de contratar ou configurar o provedor (TI/segurança) e dos segredos `SICOOB_MALWARE_SCANNER_URL/TOKEN`.
- Origem do plano: `etapas.csv:76`; P075, P107; `revisao-do-plano-2026-10-01.md:45`
- Evidência:
  - `supabase/functions/sicoob-document-ingest/scanner.ts:24-26` responde 503 sem configuração.
  - `reconciliacao-online-2026-09-28.md:28` registra "ainda não existem".
  - Nada nos documentos de 08/10 indica configuração.
  - Defeito de código adicional: envia `X-Document-SHA256` mas **não compara hash no retorno** (`:52-59`).
  - Os segredos nem constam em `docs/secrets.md`.
- O que falta: provedor configurado, correlação parecer ↔ hash, teste com arquivo malicioso sintético e timeout.
- Impacto no negócio: **upload de arte, comprovante e nota fiscal está bloqueado (503)**, e pedido sem arte aprovada não vai para produção.
- Esforço: M
- Prioridade: P0

### PLA-T076  Retenção, revogação e recuperação de anexos
- Status: NAO_INICIADA
- Origem do plano: `etapas.csv:77`; P074, P108, P110
- Evidência:
  - Grep `retention_days|legal_hold|document_retention|purge_expired` em migrations e docs sem resultado.
  - URL assinada de arte com validade de **7 dias** (`src/components/mockup/ArtFileUpload.tsx:85`).
  - Não há ensaio de restauração conjunta de Storage e metadados.
- O que falta: política de retenção por tipo, prazos de URL adequados e ensaio de recuperação.
- Impacto no negócio: link de arte vazado continua válido por uma semana; não há regra de descarte (LGPD).
- Esforço: M
- Prioridade: P2

### PLA-T077  Arte, exportações e dossiê
- Status: PARCIAL
- Origem do plano: `etapas.csv:78`; P108
- Evidência: o bucket `exports` é privado e as RPCs de exportação existem (`reconciliacao-online-2026-09-28.md:16`). Não há ensaio por papel nem prova de bloqueio de documento em quarentena.
- O que falta: ensaio de dossiê com amostra e negativa de outra organização.
- Impacto no negócio: dossiê pode incluir arquivo indevido.
- Esforço: P
- Prioridade: P2

### PLA-T078  Colaboração Magic Up (decisão D09)
- Status: NAO_INICIADA
- Origem do plano: `etapas.csv:79`; P123 (`matriz-150.csv:124`); `decisoes_pendentes.md:46-47`
- Evidência:
  - `magic_up_comments`, `magic_up_public_shares` e `magic_up_reactions` existem no banco (`types.ts`, inventário de 08/10).
  - **Zero consumidores** em `src/` (grep `from("magic_up_comments")` etc. = 0).
  - A decisão "terminar ou remover" segue aberta.
- O que falta: decisão de produto e, depois, UI, autorização e testes ou remoção formal.
- Impacto no negócio: funcionalidade prometida sem tela; tabelas sem uso ocupam superfície de ataque.
- Esforço: M
- Prioridade: P3

### PLA-T079  Webhooks, Bitrix e serviços externos (decisão D01)
- Status: BLOQUEADA_EXTERNA. Depende da decisão comercial sobre a sync Bitrix (D01) e das credenciais das integrações.
- Origem do plano: `etapas.csv:80`; P078, P079
- Evidência:
  - `supabase/functions/bitrix-sync` e `sync-quote-bitrix` existem.
  - As tabelas `bitrix_*` existem no banco, mas a allowlist ainda as trata como "não aplicada" (`.check-runtime-refs-allowlist.json`).
  - `docs/secrets.md` marca `BITRIX24_WEBHOOK_URL` como "**preencher**".
  - Não há recibo de handshake.
- O que falta: decisão sobre o Bitrix e homologação de assinatura, replay e 5xx com recibos.
- Impacto no negócio: dados de clientes e negócios podem não sincronizar com o CRM.
- Esforço: M
- Prioridade: P2

### PLA-T080  Homologar arte e documentos no canônico
- Status: NAO_INICIADA
- Origem do plano: `etapas.csv:81`; P109
- Evidência: bloqueada na prática por T075; nenhum ensaio remoto (matriz P109 = V).
- O que falta: ensaio de upload, inspeção, prova, aprovação e exportação com 2 cooperativas.
- Impacto no negócio: o fluxo de arte não tem aceite.
- Esforço: M
- Prioridade: P1

### Fase 9 — Logística, campanha e financeiro

### PLA-T081  Paginação e distribuição logística
- Status: PARCIAL
- Origem do plano: `etapas.csv:82`; P111, P112
- Evidência: os pedidos são paginados em páginas de 200 (`logisticsReportService.ts:26`). As remessas são buscadas com **um único `.in('order_id', orderIds)` sem paginação** (`:58-61`), o que estoura o limite de URL ou de 1.000 linhas com volume.
- O que falta: paginar ou particionar remessas e modelar alocações por destino.
- Impacto no negócio: relatório logístico some com pedidos quando o volume crescer.
- Esforço: P
- Prioridade: P2

### PLA-T082  Importação assistida de destinos (CSV/XLSX)
- Status: NAO_INICIADA
- Origem do plano: `etapas.csv:83`; P113 (`matriz-150.csv:114`)
- Evidência: grep `DistributionImport|parseDistribution|import.*destin` em `src/` e `supabase/functions` sem resultado. `XLSX` em `OrdersPage.tsx:33` é só exportação; nenhum `XLSX.read`/`FileReader` nas páginas Sicoob.
- O que falta: template, prévia, validação por linha e confirmação atômica.
- Impacto no negócio: distribuição para muitos PAs exige digitação manual, com risco de erro.
- Esforço: M
- Prioridade: P2

### PLA-T083  Reconfirmar estoque e registrar expedição
- Status: PARCIAL
- Origem do plano: `etapas.csv:84`; P112, P114, P115
- Evidência: a remessa é uma por pedido, sem item, destino ou quantidade (matriz P115). Não há reconfirmação com o fornecedor antes da expedição (P114).
- O que falta: expedições parciais por item e destino e reconfirmação de disponibilidade.
- Impacto no negócio: não dá para enviar parte do pedido nem saber o que foi para cada PA.
- Esforço: M
- Prioridade: P2

### PLA-T084  Rastreio e recebimento
- Status: PARCIAL
- Origem do plano: `etapas.csv:85`; P116, P117
- Evidência:
  - O rastreio é manual (código e transportadora digitados em `OrderLogisticsTab.tsx:39-59`). Grep `melhorenvio|rodonaves|tracking_events` sem integração.
  - A UI agora é honesta (`LogisticsCommandCenter.tsx:119`).
  - O recebimento não vincula comprovante por destino.
- O que falta: integração com transportadora (ou registro explícito de manualidade e origem) e comprovante por recebimento.
- Impacto no negócio: o cliente não acompanha a entrega; o operador atualiza à mão.
- Esforço: M
- Prioridade: P3

### PLA-T085  Avarias, devoluções e cancelamentos
- Status: NAO_INICIADA
- Origem do plano: `etapas.csv:86`; P118, P119
- Evidência:
  - Só há o status `received_with_issues` e notas (`GestorConsolidatedOrdersPage.tsx:66,282`).
  - Grep `damage_claim|return_request|credit_note|nota_credito|devolucao` em migrations sem resultado.
  - Não há cancelamento parcial por item ou destino.
- O que falta: protocolo com responsável, prazo, decisão, reposição ou crédito e reabertura.
- Impacto no negócio: avaria vira e-mail e planilha; crédito ao cliente fica sem controle.
- Esforço: G
- Prioridade: P2

### PLA-T086  Campanha e cronograma regressivo
- Status: PARCIAL
- Origem do plano: `etapas.csv:87`; P121, P122 (P122 "N", `matriz-150.csv:123`)
- Evidência: existem `AdminCampanhas` (CRUD genérico) e o briefing do Magic Up. Grep `milestone|cronograma.*regressivo|backward.*schedule` sem implementação (só falsos positivos visuais).
- O que falta: ligar o briefing a verba e destinos e calcular marcos regressivos (arte, aprovação, produção, expedição).
- Impacto no negócio: campanhas com data de evento perdem prazo sem aviso antecipado.
- Esforço: G
- Prioridade: P2

### PLA-T087  Ciclo financeiro da verba
- Status: PARCIAL
- Origem do plano: `etapas.csv:88`; P124
- Evidência: só há consumo e estorno ao inserir ou alterar pedido (`20260911143000_sicoob_order_budget_atomicity.sql:55-89`). Grep `verba_reservada|verba_comprometida|reserved_amount|committed_amount` sem resultado. Não há livro de eventos.
- O que falta: estados planejado, reservado, comprometido, consumido e disponível, com eventos conciliáveis.
- Impacto no negócio: o gestor não sabe quanto da verba já está comprometido em orçamentos aprovados.
- Esforço: G
- Prioridade: P1

### PLA-T088  Fechamento de competência e conciliação financeira
- Status: NAO_INICIADA
- Origem do plano: `etapas.csv:89`; P125, P126
- Evidência: grep `fechar_competencia|close_budget_period|period_closed|competencia_fechada|budget_closure` sem resultado. Não há conciliação contratado × faturado × recebido × pago.
- O que falta: virada de mês, fechamento, reabertura autorizada, estorno tardio e conciliação.
- Impacto no negócio: meses passados podem ser alterados sem controle; o financeiro não fecha o mês pelo portal.
- Esforço: G
- Prioridade: P1

### PLA-T089  Auditoria, indicadores e suporte (decisão D10)
- Status: PARCIAL
- Origem do plano: `etapas.csv:90`; P068, P127 ("N", `matriz-150.csv:128`), P128, P129; `decisoes_pendentes.md:49-53`
- Evidência:
  - `sicoob_budget_audit` e `v_full_scope_grants` têm zero consumidores em `src/`.
  - O `AuditEvidenceDashboard` previsto para elas está órfão e com dados fixos (PLA-X02).
  - SLOs só no papel (`docs/SLO.md`, sem medição nem painel).
  - Rate limiter e alertas não ligados.
- O que falta: ligar as views a um painel autorizado e medir os SLOs.
- Impacto no negócio: a diretoria não tem painel confiável de verba e acessos.
- Esforço: M
- Prioridade: P2

### PLA-T090  Homologar fechamento de campanha distribuída
- Status: NAO_INICIADA
- Origem do plano: `etapas.csv:91`; P120, P130
- Evidência: depende de T082, T085, T087 e T088 (inexistentes).
- O que falta: ensaio com 3 destinos, avaria, crédito e troca de competência.
- Impacto no negócio: não há prova de que uma campanha fecha certinho em quantidades e valores.
- Esforço: M
- Prioridade: P2

### Fase 10 — Experiência, segurança e lançamento

### PLA-T091  Pesquisa com compradores e marketing
- Status: BLOQUEADA_EXTERNA. Depende do recrutamento de participantes autorizados (produto e cooperativas).
- Origem do plano: `etapas.csv:92`; P131, P140
- Evidência: as evidências visuais são sintéticas (matriz P131 = V).
- O que falta: sessões observadas com tarefas e registro de barreiras.
- Impacto no negócio: a experiência não foi validada com quem compra.
- Esforço: M
- Prioridade: P2

### PLA-T092  Experiência de loja e identidade visual
- Status: PARCIAL
- Origem do plano: `etapas.csv:93`; P132–P136, P140
- Evidência: rotas, cards e QA visual existem. Não há aceite de marca (T071) nem de produto. O feedback de persistência engana (T044).
- O que falta: aprovação de marca e produto e estados de erro, offline e conflito consistentes.
- Impacto no negócio: a loja não tem aceite institucional para ir ao ar.
- Esforço: M
- Prioridade: P2

### PLA-T093  Acessibilidade e dispositivos
- Status: PARCIAL
- Origem do plano: `etapas.csv:94`; P137, P138, P140
- Evidência: o WCAG automatizado em 3 larguras aprovou login, demo e loja (`fechamento:54`). Não há teste com leitor de tela, zoom de 200/400%, teclado virtual nem jornada autenticada em aparelho real (matriz P137/P138).
- O que falta: auditoria manual WCAG 2.2 AA das jornadas.
- Impacto no negócio: usuários com deficiência podem não conseguir comprar; há risco legal.
- Esforço: M
- Prioridade: P2

### PLA-T094  Desempenho por jornada
- Status: PARCIAL
- Origem do plano: `etapas.csv:95`; P139, W047
- Evidência:
  - O Lighthouse mede só `/login` (`.lighthouserc.cjs:6`).
  - O limite de LCP foi **afrouxado para 2.600 ms** (`:20`), acima da meta do plano (≤2,5 s, `etapas.csv:95`).
  - Não há medição de catálogo, editor ou painéis.
- O que falta: medição por jornada com rede móvel e metas ratificadas.
- Impacto no negócio: lentidão no catálogo e no editor só aparece com cliente real.
- Esforço: M
- Prioridade: P2

### PLA-T095  Segurança e privacidade integradas
- Status: PARCIAL
- Origem do plano: `etapas.csv:96`; P143
- Evidência (11/10):
  - `curl -D - https://brindes-sicoob-v2.vercel.app/` → 200 **sem `Content-Security-Policy` e sem `X-Content-Type-Options`**.
  - `/login` e `/index.html` recebem os headers. A regra de headers é `"/:path*"` (`vercel.json:11`) e não cobre `/`.
  - A CSP mantém `'unsafe-inline'` e domínios Lovable e gpteng (`vercel.json:43`).
  - O rate limiter compartilhado está em **7 de 108** funções (grep `rate-limiter|rateLimit` nos `index.ts`).
  - Itens de backlog da auditoria de 02/10 (`auditoria-tecnica-2026-10-02.md:165-166`) seguem abertos.
- O que falta: cobrir `/` com headers, CSP com nonce, rate limit nas funções públicas e revisão integrada por persona.
- Impacto no negócio: a página de entrada fica mais exposta a injeção de script e clickjacking; funções públicas ficam sujeitas a abuso e custo.
- Esforço: M
- Prioridade: P1

### PLA-T096  Regressão e compra sintética integral
- Status: NAO_INICIADA
- Origem do plano: `etapas.csv:97`; P142, P145
- Evidência: não há jornada de pesquisa → financeiro com 2 cooperativas e 3 destinos (matriz P145 = V). Depende de T082, T085 e T088.
- O que falta: compra sintética completa no candidato publicado.
- Impacto no negócio: sem ensaio geral, o primeiro cliente real é quem testa.
- Esforço: G
- Prioridade: P1

### PLA-T097  Reconciliar e publicar candidato de release
- Status: PARCIAL
- Origem do plano: `etapas.csv:98`; P080, P144, W059…W062, W066
- Evidência: o PR #98 consolidou o candidato. Persistem a divergência de headers servidos (T095), a ausência de checks obrigatórios (T019) e a falta de manifesto (T001) e de paridade de frontend.
- O que falta: manifesto final com ledger, Edge, artefato e domínio conferidos.
- Impacto no negócio: não há "versão oficial" pronta para decisão de lançamento.
- Esforço: P
- Prioridade: P1

### PLA-T098  Preparar operação e autorizar piloto
- Status: BLOQUEADA_EXTERNA. Depende da decisão formal do responsável de negócio (diretoria e operação).
- Origem do plano: `etapas.csv:99`; P146, W059; `fechamento-tecnico-2026-10-08.md:70`
- Evidência: nenhum registro de decisão de piloto, treinamento, custos ou suporte. Restore não ensaiado (T008).
- O que falta: pacote de prontidão e decisão registrada.
- Impacto no negócio: **o portal não pode vender oficialmente.**
- Esforço: M
- Prioridade: P0

### PLA-T099  Piloto e operação real (30 dias)
- Status: BLOQUEADA_EXTERNA. Depende do piloto autorizado (T098), de duas cooperativas reais e de 30 dias de tráfego.
- Origem do plano: `etapas.csv:100`; P147, P148, P149, W100; `fechamento:71-73`
- Evidência: nenhuma compra real, recebimento ou conciliação registrados.
- O que falta: primeira compra real até a conciliação, segunda cooperativa e 30 dias de estabilidade.
- Impacto no negócio: sem receita comprovada pelo canal.
- Esforço: G
- Prioridade: P1

### PLA-T100  Encerrar requisitos e instituir evolução
- Status: BLOQUEADA_EXTERNA. Depende das etapas T001–T099 e do aceite independente de produto, marketing, compras, financeiro e operação.
- Origem do plano: `etapas.csv:101`; P006, P010, P150, W100; `fechamento:74`
- Evidência: 0 de 100 etapas marcadas e 0 de 1.000 checkboxes.
- O que falta: termo de aceite, backlog residual aprovado e rotina de manutenção.
- Impacto no negócio: o projeto não pode ser declarado entregue.
- Esforço: M
- Prioridade: P2

---

### Itens adicionais descobertos na verificação (sem etapa própria no plano)

### PLA-X01  UI administrativa grava no catálogo externo, que agora é somente leitura
- Status: STUB/MOCK
- Origem do plano: cenário adversarial de T058 (`plano.json` T058: "bloquear comandos de mutação"); `fechamento-tecnico-2026-10-08.md:48`
- Evidência no código:
  - ~75 chamadas `operation: 'insert'|'update'|'delete'|'upsert'` via `invokeExternalDb*` em 22 arquivos. Exemplos:
    - `src/hooks/tecnicas/useTecnicaMutations.ts:20-60`;
    - `src/components/admin/products/image-gallery/useProductImageGallery.ts` (11);
    - `src/components/admin/products/kit-components/api.ts` (9);
    - `useProductSupplierSources.ts`, `useExternalCollections.ts`, `hooks/gravacao/*`, `useSuppliersManager.ts`, `AdminProductFormPage.tsx`.
  - O bridge recusa tudo com `403 CATALOG_READ_ONLY` (`external-db-bridge/index.ts:479-480`).
- O que falta: remover ou desabilitar essas telas e ações, ou levar a manutenção do catálogo para o sistema dono, com mensagem clara ao admin.
- Impacto no negócio: o admin clica em "salvar" em produtos, fornecedores e técnicas e recebe erro; parece sistema quebrado.
- Esforço: M
- Prioridade: P2

### PLA-X02  `AuditEvidenceDashboard` órfão e com evidências fixas no código
- Status: ORFA
- Origem do plano: `decisoes_pendentes.md:49-53` (tela prevista para as views de auditoria); T089
- Evidência: `src/pages/admin/AuditEvidenceDashboard.tsx:18` (array `EVIDENCES` fixo), `:57` (default export). Grep `AuditEvidence` em `src/routes` e `App.tsx` = 0 (não roteado). Não consulta `sicoob_budget_audit` nem `v_full_scope_grants`.
- O que falta: rotear e ligar às views reais, ou remover.
- Impacto no negócio: código morto que, se exposto, mostraria "evidências" inventadas.
- Esforço: P
- Prioridade: P3

### PLA-X03  `sicoobBudgetService.updateBudget` órfão que grava verba pelo cliente
- Status: ORFA
- Origem do plano: P124 (`matriz-150.csv:125`: "updateBudget escreve verba_consumida por pa_id")
- Evidência: `src/services/sicoob/budgetService.ts:54-66`. Grep `.updateBudget(` em `src/` = 0 chamadores.
- O que falta: remover, já que a verba deve ser alterada só por trigger ou RPC no servidor.
- Impacto no negócio: se alguém religar, a verba pode ser sobrescrita pelo navegador.
- Esforço: P
- Prioridade: P3

### PLA-X04  Alçada de diretoria fixa no cliente e sem uso
- Status: ORFA
- Origem do plano: T052 ("limites monetários… por cooperativa com vigência")
- Evidência: `src/hooks/usePaBudget.ts:51-56` (`isBoardApprovalRequired`: >150% da alçada ou > R$ 50.000). Grep em `src/` = 0 consumidores.
- O que falta: remover ou levar para a política versionada no servidor (T052).
- Impacto no negócio: regra de negócio escondida no código, sem dono nem aprovação.
- Esforço: P
- Prioridade: P3

### PLA-X05  Allowlist de referências de runtime desatualizada
- Status: PARCIAL
- Origem do plano: T023; a própria allowlist diz "Remover a entrada daqui assim que a etapa correspondente fechar"
- Evidência:
  - `scripts/db/.check-runtime-refs-allowlist.json` ainda isenta `create_quote_version_atomic`, `check_rls_enabled`, `get_enum_values` e `bitrix_*` como "não aplicadas".
  - Todos existem no inventário vivo de 08/10 (`.inventory-cache.json`: 2 ocorrências cada).
- O que falta: remover as entradas resolvidas e revisar as restantes.
- Impacto no negócio: a exceção esquecida pode mascarar uma regressão futura.
- Esforço: P
- Prioridade: P3

---

### Decisões pendentes de negócio (`decisoes_pendentes.md`, 22/09)

As decisões **D02** (RPCs `check_rls_enabled`/`get_enum_values`) e **D12** (`create_quote_version_atomic`) foram conferidas como **resolvidas**. Ambas estão no inventário vivo de 08/10 e são consumidas em `src/services/quotes/quoteVersionService.ts:33`. A D05 (verba por período) foi absorvida por PLA-T056, T087 e T088.

### PLA-D01  Sync Bitrix24 ativa ou abandonada
- Status: BLOQUEADA_EXTERNA. **Quem decide:** diretoria comercial / dono do CRM, com TI.
- Origem: `decisoes_pendentes.md:8-12`
- Evidência:
  - `supabase/functions/bitrix-sync` e `sync-quote-bitrix` existem.
  - As tabelas `bitrix_clients/deals/sync_logs` existem no banco.
  - `src/components/mockup/MockupCompareDialog.tsx:22,70` e `src/types/domain/simulation.ts:137` ainda embutem `bitrix_clients`.
- O que falta: decidir. Se a sync continua, redesenhar com RLS correta; se não, remover a função e o código morto.
- Impacto no negócio: integração com o CRM incerta; dados de cliente podem divergir.
- Esforço: M
- Prioridade: P2

### PLA-D03  `mcp-keys-revoke`: publicação e trilha atômica
- Status: BLOQUEADA_EXTERNA. **Quem decide:** segurança/TI (publicação remota).
- Origem: `decisoes_pendentes.md:19-22`
- Evidência: não há registro de publicação nem de garantia atômica revogação + auditoria nos documentos de 01/10 a 08/10.
- O que falta: publicar e comprovar a trilha.
- Impacto no negócio: revogação de chave sem trilha confiável.
- Esforço: P
- Prioridade: P3

### PLA-D04  Telemetria de erros: Sentry e entrega real
- Status: BLOQUEADA_EXTERNA. **Quem decide:** TI/operação (contratação e configuração do DSN).
- Origem: `decisoes_pendentes.md:24-27`; `auditoria-tecnica-2026-10-02.md:63-66`
- Evidência: `src/lib/sentry.ts:27,41` é opcional via `VITE_SENTRY_DSN`; o sink não foi confirmado.
- O que falta: decidir o sink, configurar e comprovar a entrega.
- Impacto no negócio: erros em produção ficam sem alerta.
- Esforço: P
- Prioridade: P2

### PLA-D06  Módulo white-label (`companies`)
- Status: BLOQUEADA_EXTERNA. **Quem decide:** produto.
- Origem: `decisoes_pendentes.md:34-35`
- Evidência: `src/lib/pdf/whitelabel-comparison.ts` tem zero importadores (grep). `companies` não existe no banco (inventário).
- O que falta: remover ou reativar com cliente correto.
- Impacto no negócio: código morto confunde a manutenção.
- Esforço: P
- Prioridade: P3

### PLA-D07  `roles`, `user_2fa_settings`, `personalization_techniques`, `user_passkeys`, `color_nuances` (inclui D13)
- Status: BLOQUEADA_EXTERNA. **Quem decide:** arquitetura (TI), com produto.
- Origem: `decisoes_pendentes.md:37-38,67-71`
- Evidência:
  - Nenhuma dessas existe no banco do portal (inventário, 0 ocorrências).
  - `personalization_techniques` é lida do catálogo externo e ainda tem mutações bloqueadas (PLA-X01, `useTecnicaMutations.ts`).
  - A allowlist mantém as exceções.
- O que falta: decisão formal por objeto (enum × tabela, MFA nativo × tabela própria, catálogo externo).
- Impacto no negócio: funcionalidades de passkey e 2FA próprias e de técnicas ficam em limbo.
- Esforço: M
- Prioridade: P3

### PLA-D08  Candidatos a remoção (`pontos_atendimento`, `singulares`, `pa_singularidades`, `blog_posts`, buckets `order-documents` e `component-media`)
- Status: BLOQUEADA_EXTERNA. **Quem decide:** dono dos dados / TI (aprovação de remoção).
- Origem: `decisoes_pendentes.md:40-44`
- Evidência: as 4 tabelas existem no banco (`types.ts` e inventário) com 0 consumidores em `src/`.
- O que falta: aprovar e remover com migration.
- Impacto no negócio: tabelas quase duplicadas (`pontos_atendimento` × `postos_atendimento`) induzem erro.
- Esforço: P
- Prioridade: P3

### PLA-D09  Magic Up colaborativo: terminar ou remover
- Status: BLOQUEADA_EXTERNA. **Quem decide:** produto / marketing.
- Origem: `decisoes_pendentes.md:46-47`
- Evidência e execução técnica: ver PLA-T078.
- O que falta: a decisão (a execução é a T078).
- Impacto no negócio: funcionalidade colaborativa sem destino definido.
- Esforço: P (decidir)
- Prioridade: P3

### PLA-D10  Views de auditoria em tela
- Status: BLOQUEADA_EXTERNA. **Quem decide:** produto / compliance (quem pode ver concessões e auditoria de verba).
- Origem: `decisoes_pendentes.md:49-53`
- Evidência e execução técnica: ver PLA-T089 e PLA-X02.
- O que falta: decidir público e escopo da tela.
- Impacto no negócio: auditoria de verba sem tela para o gestor.
- Esforço: P (decidir)
- Prioridade: P2

### PLA-D11  Regras de branch e rastreabilidade de commits
- Status: BLOQUEADA_EXTERNA. **Quem decide:** administrador do repositório GitHub (`@adm01-debug`).
- Origem: `decisoes_pendentes.md:55-59`
- Evidência e execução: ver PLA-T019 (API em 11/10 sem checks obrigatórios).
- O que falta: aprovar a política e configurar.
- Impacto no negócio: sem garantia de que tudo na `main` passou por revisão e testes.
- Esforço: P
- Prioridade: P1

### PLA-D14  Decisões transversais exigidas pela T004, ainda sem registro
- Status: BLOQUEADA_EXTERNA. **Quem decide:** diretoria (custos e infraestrutura), compras (alçadas e fornecedor único), jurídico/compliance (retenção LGPD), operação (publicador canônico Vercel × Lovable, SLA).
- Origem: `plano.json` T004 OBJ ("Registrar decisões de custos, revisão humana, alçadas, fornecedor único, retenção, infraestrutura e publicação"); `etapas.csv:5`
- Evidência: nenhum registro em `docs/execucao/` posterior a 22/09 sobre esses temas. `decisoes_pendentes.md` não os contém.
- O que falta: ata de decisões com dono e data.
- Impacto no negócio: T054, T055, T056, T076, T098 e T011 ficam travadas sem essas definições.
- Esforço: P
- Prioridade: P1

---

## Fontes lidas

- `AGENTS.md`
- `docs/plano-implementacao/plano-encerramento-100-etapas-20261001/`: `etapas.csv`, `plano.json` (objetivo, cenários e checklist de T001–T100), `checklist-1000.csv`, `validacao.json`, `fontes.json`
- `docs/plano-implementacao/plano-150-etapas-20260927/` (via matriz-150)
- `docs/execucao/revisao-do-plano-2026-10-01.md`
- `docs/execucao/revisao-plano-20261001/`: `matriz-150.csv/json`, `workflows-100.csv`, `inventario-planos.json`, `http.json`
- `docs/execucao/fechamento-tecnico-2026-10-08.md`
- `docs/execucao/auditoria-tecnica-2026-10-02.md`
- `docs/execucao/execucao-plano-2026-10-01.md`
- `docs/execucao/decisoes_pendentes.md`
- `docs/execucao/reconciliacao-online-2026-09-28.md`
- `docs/execucao/evidencias/` (listagem)
- Docs gerais: `docs/secrets.md`, `docs/DR.md`, `docs/CI_CD.md`, `docs/SLO.md`, `docs/RUNBOOK.md`, `docs/adr/`, `docs/auditoria-validacao-2026-09-22.md` (trechos)
- Workflows: `.github/workflows/*.yml` (13 arquivos), `.github/CODEOWNERS`, `.github/dependabot.yml`, os dois templates de PR, `.husky/pre-push`
- Configuração: `.lighthouserc.cjs`, `playwright.config.ts`, `playwright.pwa.config.ts`, `vitest.config.ts`, `vercel.json`, `.typecheck-baseline.json`, `.eslint-baseline.json`
- Migrations: `20260911143000`, `20260927*`, `20260928162048`, `20260928173500`, `20260928182000`, `20261002120000`, `20261002160000`, `20261007*`, `20261008*`
- Scripts: `scripts/db/apply-sicoob-migrations.mjs`, `scripts/db/.inventory-cache.json`, `scripts/db/migration-ledger-baseline.json`, `scripts/db/.check-runtime-refs-allowlist.json`, `scripts/db-performance-audit.mjs`, `scripts/qa/simular-rls-cruzada-sicoob.py`, `scripts/qa/simular-delegacao-aprovacao-sicoob.py`, `scripts/qa/simular-governanca-orcamento.{sh,sql}`
- Código `src/`:
  - Serviços e helpers de orçamento: `QuoteService.ts`, `quoteHelpers.ts`, `quoteStatusTransition.ts`, `useQuotes.ts`, `useQuoteBuilderState.ts`
  - Rascunhos e sessão: `useAutoSave.ts`, `QuoteAutoSave.tsx`, `AuthContext.tsx`
  - Sicoob: `reorderIdempotency.ts`, `budgetService.ts`, `usePaBudget.ts`, `logisticsReportService.ts`, `LogisticsCommandCenter.tsx`, `OrderLogisticsTab.tsx`, `GestorConsolidatedOrdersPage.tsx`
  - Outros: `useKitStockForecast.ts`, `AuditEvidenceDashboard.tsx`, `useDiscountApproval.ts`, `useQuoteComments.ts`, `useTecnicaMutations.ts`, `ArtFileUpload.tsx`, `src/routes/config/*.ts`, `types.ts` (trechos)
- Edge Functions: `sicoob-document-ingest/{index,scanner}.ts`, `sicoob-kit-quote/catalog.ts`, `_shared/external-read-only.ts`, `external-db-bridge/index.ts`, `deploy-sicoob-functions.yml`
- Consultas externas somente leitura em 11/10:
  - API REST GitHub: PRs abertos e #75/#83/#85/#87/#88/#92/#93/#98; `repos/...` (métodos de merge); `branches/main`; `rulesets`. Proteção detalhada, Actions e secrets responderam 403.
  - `curl` de headers em `https://brindes-sicoob-v2.vercel.app/`, `/login` e `/index.html`.
  - MCP Supabase Brindes Sicoob: `connection_info` → 401.
