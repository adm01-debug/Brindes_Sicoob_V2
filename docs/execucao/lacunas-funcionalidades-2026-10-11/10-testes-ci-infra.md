# Testes, CI/CD, segurança de pipeline, infraestrutura e DR — funcionalidades planejadas e não executadas (fatia QA)

> Repositório `adm01-debug/Brindes_Sicoob_V2`, HEAD `dc08200` (main, 08/10/2026), levantamento em 11/10/2026.
> Método: leitura de arquivos (somente leitura), scripts auxiliares de análise estática em `<scripts-da-auditoria>/`,
> e consulta **somente leitura** à API do GitHub (secrets por nome, branch protection, rulesets, environments,
> runners, labels, permissões de Actions, execuções de workflows). O acesso ao banco via MCP retornou
> `Management API 401`, então nada sobre o estado vivo do banco foi verificado.

## Resumo

### Contagem por status (66 itens)

| Status | Qtde |
|---|---|
| NAO_INICIADA | 20 |
| PARCIAL | 21 |
| STUB/MOCK | 5 |
| ORFA | 13 |
| BLOQUEADA_EXTERNA | 7 |
| **Total** | **66** |

Por prioridade: P0 = 3 · P1 = 22 · P2 = 20 · P3 = 21.

### Os 10 achados mais graves

1. **QA-38 (P0)**: o HEAD `dc08200` (PR #98, "fechamento técnico") entrou na `main` sem CI verde. Nos dois últimos commits do PR e no push para a `main`, todos os workflows terminaram em `startup_failure`. Nos commits anteriores do mesmo PR, *Qualidade contínua*, *Lighthouse* e *E2E* falharam. O próprio documento de fechamento condiciona o aceite "ao CI do PR #98".
2. **QA-56 e QA-57 (P0/P1)**: a branch protection da `main` não tem nenhum status check obrigatório, `enforce_admins` está como false e não existe ruleset. O único CODEOWNER é o próprio autor dos PRs, então todo merge depende de bypass de administrador.
3. **QA-11 (P0)**: o gate E2E teve **2 execuções verdes em 677**, a última em 12/09/2026. PRs são mesclados com o E2E vermelho ou cancelado.
4. **QA-14 (P1)**: nenhum E2E percorre o fluxo que gera receita (criar orçamento → enviar → aprovar com token válido → converter em pedido). Os specs só abrem telas ou testam redirecionamento.
5. **QA-15 e QA-12 (P1)**: o portal Sicoob não tem E2E que rode. São 13 rotas (verba do PA, aprovações do gestor, convites, consolidação, KPIs) sem nenhum spec, e os 4 specs de `e2e/routes/sicoob/` não casam com nenhum projeto do Playwright.
6. **QA-01 e QA-02 (P1)**: o "gate de cobertura de 80%" cobre **9 de cerca de 1.898 arquivos** de `src`. Cerca de **40 arquivos e 1.150 casos** de teste reimplementam a lógica dentro do próprio teste e nunca importam o código real. Isso inclui a pasta `tests/e2e/`, que não é E2E.
7. **QA-33 (P1)**: 14 relatórios de "auditoria enterprise", com métricas fabricadas ("Cobertura 98,2%", "100% das tabelas validadas") e o inventário completo de tabelas do banco, ficam em `public/`. Por isso são servidos publicamente na URL de produção.
8. **QA-13 (P1)**: os 16 cenários P0 de resiliência (Bitrix ou CRM fora do ar, catálogo degradado, rollback de checkout, logout global) estão com `test.skip` permanente porque a UX de degradação não foi implementada.
9. **QA-62 e QA-61 (P1)**: não existe alerta operacional ativo. O `error-monitor` foi declarado "não publicável" e não tem cron. As 6 regras de alerta do Sentry, com Slack e PagerDuty, existem só no documento.
10. **QA-65 (P1)**: o restore de backup nunca foi testado. O backup lógico, o `RESTORE_PITR.md` e a simulação semestral de DR foram planejados e não foram feitos.

Também é importante a **QA-44 (P1)**: o inventário de runtime usado pelo `ci.yml` expira em **07/11/2026**. A partir dessa data todo PR fica vermelho, e não existe rotina automática para renovar o inventário.

---

## Itens

### A. Testes unitários (Vitest / Deno)

### QA-01  Gate de cobertura de 80% restrito a 9 arquivos
- Status: PARCIAL
- Origem: `.github/workflows/ci.yml:66-67` ("Executar a suíte completa com gate de cobertura"); `package.json:12` (`test:coverage:ci`, statements=80, branches=75)
- Evidência: `vitest.config.ts:39-49`: `coverage.include` lista só 9 arquivos (aprovação pública, `fulfillmentService`, `documentIngestService`, `orderFinancials` e dois módulos de `sicoob-document-ingest`). `src` tem cerca de 1.898 arquivos `.ts/.tsx`.
- O que falta: medir `src/**`, com limite mínimo por módulo crítico (orçamento, verba, pedidos, RBAC) e regra de não-regressão.
- Impacto no negócio: o "80% de cobertura" divulgado vale para menos de 1% do sistema, e regressões no restante passam sem alarme.
- Esforço: M
- Prioridade: P1

### QA-02  Cerca de 40 arquivos e 1.150 casos de teste tautológicos (lógica copiada para dentro do teste)
- Status: STUB/MOCK
- Origem: `docs/TESTING.md:20-24` (apresenta `tests/e2e/` como "End-to-end tests"); `docs/TESTING.md:27-31` (o padrão exige testar o comportamento)
- Evidência (análise em `<scripts-da-auditoria>/analisar.mjs`: arquivos sem nenhum import de `src`, `supabase/functions` ou `scripts`, e que não leem fonte):
  - `tests/e2e/*.test.ts`: 17 arquivos, cerca de 560 casos. Exemplo: `tests/e2e/quotes-flow.test.ts:7-27` redefine `STATUSES`, `VALID_TRANSITIONS` e `canTransition` no próprio teste.
  - `tests/lib/rbac-permissions.test.ts:14` ("Replicated from useRBAC.tsx"); `tests/lib/telemetry-logic.test.ts:8-10` ("REPLICATE PURE LOGIC FROM PAGE", 77 casos); `tests/lib/validate.test.ts` ("Inline copies"); `tests/edge-functions/parseAiResponse.test.ts` ("we replicate its logic").
  - `tests/hooks/useDiscountApproval.test.ts:5-64`: cria mocks de Supabase, mas nunca importa o hook (53 casos).
  - `tests/edge-functions/voice-agent.test.ts:7-30`: valida objetos literais (`mockResponse.action === "search"`).
  - `tests/integration/sicoob-security.test.ts:9-18`: a matriz de papéis e o `canAccessTab` são definidos no teste. O RPC "403" é um `vi.fn` (`:40-48`).
  - `tests/components/intelligence/commercial-intelligence.test.ts` (111 casos), `tests/color-navigation.test.ts`, `tests/ai-usage.test.ts:3` ("mirror of edge function"), `tests/unit/fuzzing.test.ts`, `tests/types/quote-types.test.ts`, `tests/pages/Auth.test.ts`, `tests/hooks/useQuotes-helpers.test.ts`, `tests/hooks/useReplenishments.test.ts`, `tests/hooks/intelligence-badges.test.ts`, `tests/functions/aiRecommendationsJsonParsing.test.ts`, `tests/lib/external-db-bridge-telemetry.test.ts` (67), `tests/components/pages/PageUtilities.test.ts`.
  - `expect(true).toBe(true)` em `tests/components/products/StatsPopover.test.tsx:852`, `tests/hooks/useIPValidation.test.ts:79`, `tests/stock-performance.test.ts:737`.
- O que falta: substituir as cópias pelo import real (Deno compartilhado via módulos puros, hooks via `renderHook`) ou excluir os arquivos. Renomear `tests/e2e/` e corrigir `docs/TESTING.md`.
- Impacto no negócio: a contagem de testes passa uma falsa sensação de segurança, porque o código de produção pode quebrar com todos esses testes verdes.
- Esforço: G
- Prioridade: P1

### QA-03  Testes de RLS "estáticos" que dizem detectar drift do banco, mas comparam a fixture com ela mesma
- Status: STUB/MOCK
- Origem: `tests/security/rls-seller-policies.spec.ts:20-22` ("Caso uma policy mude no banco sem atualização deste arquivo, o teste falha em CI")
- Evidência: `tests/security/rls-seller-policies.spec.ts:300-306` ("Fixture estática… evitar dependência runtime do banco") e `fetchPolicy` que só lê `CHILD_POLICY_SNAPSHOT`. `tests/rls/critical-tables-rls.test.ts:7-8` ("not by making live DB calls"), `:310` e `:316` (`expect(true).toBe(true); // Structural assertion — trigger exists in DB`).
- O que falta: ler `pg_policies` de verdade, seja no PostgreSQL descartável das simulações (`scripts/qa/*.py`) ou via API no job remoto, e comparar com o snapshot.
- Impacto no negócio: uma alteração de política de acesso em produção que exponha orçamentos entre vendedores não é detectada.
- Esforço: M
- Prioridade: P1

### QA-04  Suítes remotas que dependem de credenciais nunca criadas
- Status: BLOQUEADA_EXTERNA
- Origem: `tests/rls/personas.test.ts:13-17`; `tests/integration/discountApprovalFlow.test.ts:361-370` ("LIVE mode… contra Supabase real")
- Evidência: as variáveis `TEST_SELLER_PASSWORD`, `TEST_ADMIN_PASSWORD` e `INTEGRATION_TEST_*` não existem entre os 19 secrets do repositório (API `actions/secrets`). Os `describe.skip` são, portanto, permanentes em qualquer CI.
- O que falta: criar contas dedicadas de homologação e os secrets, ou migrar os casos para as personas efêmeras de `scripts/test-rls-compliance.mjs`.
- Impacto no negócio: o isolamento vendedor × administrador e o fluxo real de aprovação de desconto nunca são verificados contra um banco real.
- Esforço: P
- Prioridade: P2

### QA-05  `no-empty-rls-policies` nunca é ligado ao CI
- Status: ORFA
- Origem: `tests/rls/no-empty-rls-policies.test.ts:1-25` ("RLS Coverage Gate — Falha se qualquer tabela… estiver com RLS habilitado mas SEM nenhuma policy")
- Evidência: o teste exige `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (`:28-32`). `ci.yml` não fornece essas variáveis, e `e2e.yml:84-92` só executa `edge-authz-bypass` e `e2e-cleanup-rate-limit`. Os secrets já existem no GitHub, falta só ligar o teste.
- O que falta: incluir o arquivo no passo "Validar autorização remota e RLS técnico" de `e2e.yml` ou no `security-compliance.yml`.
- Impacto no negócio: uma tabela nova pode ficar totalmente bloqueada (ou mal configurada) sem que ninguém perceba antes do usuário.
- Esforço: P
- Prioridade: P2

### QA-06  Gate de "skips críticos" com escopo cego
- Status: PARCIAL
- Origem: `.github/workflows/ci.yml:63` (`npm run check:critical-test-skips`)
- Evidência: `scripts/check-critical-test-skip-budget.mjs:5,10` olha só `tests/p0|rls|security` e só `*.test.*`. Ficam de fora os 16 `test.skip` de `e2e/flows/p0/`, `tests/security/*.spec.ts`, o `it.skip` de `tests/lib/...` e os 4 specs órfãos de `e2e/routes/sicoob/`.
- O que falta: estender o gate a `e2e/**` e `*.spec.*`, com orçamento por diretório.
- Impacto no negócio: novos testes desligados entram sem que o gate perceba.
- Esforço: P
- Prioridade: P2

### QA-07  Gate "Strict ref-warning" documentado, mas desligado (setups órfãos)
- Status: ORFA
- Origem: `docs/testing/STRICT_REF_WARNING_GATE.md:12-16` (cita steps "Strict ref-warning gate" e "Upload console snapshot" no `ci.yml`)
- Evidência: esses steps não existem em `ci.yml:21-135`. `vitest.config.ts:17` usa `setupFiles: './src/test/setup.ts'`, então `tests/setup-ref-warning-capture.ts` e `tests/setup.ts` nunca são carregados. `package.json:40` (`test:strict-ref`) termina em `scripts/consolidate-console-snapshot.mjs:38-41` ("sem snapshots para consolidar", exit 0). `tests/admin/__strict-ref-gate-smoke.skip.ts:12-13` cita o job `test:strict-ref-smoke`, que não existe.
- O que falta: registrar o setup no `vitest.config.ts`, criar o step no CI ou apagar o documento e os arquivos.
- Impacto no negócio: avisos de React que quebram menus e diálogos passam silenciosamente.
- Esforço: P
- Prioridade: P3

### QA-08  Markup padrão para resposta de preço sem markup (teste desligado aguardando implementação)
- Status: NAO_INICIADA
- Origem: `tests/lib/personalization/adapters/price-response.adapter.test.ts:160-161` ("TODO: ativar quando defaults explícitos para markup ausente forem implementados (passo 4 do plano de fallback)")
- Evidência: `it.skip` em `:162`, com a expectativa `markup_percent === 0`.
- O que falta: implementar o default no adapter e reativar o teste.
- Impacto no negócio: um orçamento cuja tabela não traga markup pode sair com margem indefinida.
- Esforço: P
- Prioridade: P2

### QA-09  25 de 26 testes Deno das Edge Functions nunca executam
- Status: ORFA
- Origem: `docs/plano-implementacao/plano-workflows-github-100-etapas-20260927.md:82` (etapa 26, "deno test supabase/functions/_shared/ inteiro")
- Evidência: `ci.yml:75` roda só `_shared/internal-service-auth.test.ts`, e `vitest.config.ts:31` exclui `supabase/functions/**/*.test.ts`. Ficam fora `crm-db-bridge/*` (6), `external-db-bridge/*` (7, incluindo `performance.test.ts` e `lightweightSelect.e2e.test.ts`), `_shared/*` (5 restantes, incluindo `credentials.test.ts` e `tests/integration.test.ts`), `connections-auto-test/*` (2), `secrets-manager/list-contract.test.ts`, `generate-ad-image/index.test.ts` e `mcp-keys-issue/rls-isolation.test.ts`.
- O que falta: `deno test` com glob, separando unitários de integração (estes atrás de env).
- Impacto no negócio: as pontes com o banco externo e o CRM, que alimentam o catálogo e as empresas, mudam sem rede de proteção.
- Esforço: P
- Prioridade: P1

### QA-10  Matriz de cobertura funcional por módulo: lacunas
- Status: PARCIAL
- Origem: `docs/TESTING.md:27-31`; `docs/E2E_SMOKE_COVERAGE.md:21-52`
- Evidência (`<scripts-da-auditoria>/cobertura-modulos.mjs`, contando só arquivos que importam código real):

| Módulo | Unit real | E2E executável | Lacuna principal |
|---|---|---|---|
| Catálogo | muitos (60+) | sim (32 specs) | ok |
| Simulador | 8 | rotas + `flows/09` | só renderização no E2E |
| Orçamento | 28 | navegação | **nenhum E2E cria orçamento** (QA-14) |
| Aprovação pública | 6 | só token inválido + rota com mock | sem aprovação real |
| Kits | 11 | navegação | sem gerar cotação de kit |
| Pedidos | 14 | listagem | sem conversão orçamento → pedido |
| Sicoob/verba | 31 + 24 simulações SQL | **0** (QA-12/QA-15) | portal inteiro sem navegador |
| Admin | 23 | 29 | ok |
| BI | **1** (`useProductAnalytics`) + 111 tautológicos | 3 rotas (render) | `src/lib/bi/pptxGenerator.ts` sem teste |
| IA (Magic Up/Expert) | 8 | render + prompts | sem contrato de resposta |
| Voz | 6 | só abre o assistente (`e2e/search-stability.spec.ts:64-70`) | `voice-agent` só com teste tautológico |
| Mockup | 3 | 4 (render) | baixa cobertura |
| Notificações | 8 (só drawer de UI) | **0** | entrega (e-mail/outbox) só em simulação SQL |

- O que falta: testes reais para BI, notificações, voz e mockup, e E2E para os módulos marcados.
- Impacto no negócio: relatórios de BI enviados a clientes e notificações de aprovação podem quebrar sem aviso.
- Esforço: G
- Prioridade: P2

### B. E2E (Playwright)

### QA-11  Gate E2E praticamente nunca verde: 2 sucessos em 677 execuções
- Status: PARCIAL
- Origem: `.github/workflows/e2e.yml:3-4` ("Gate de release"); `docs/plano-implementacao/plano-reconciliacao-50-etapas.md:635-641` (Etapa 46, "HEAD de main totalmente verde")
- Evidência: API `actions/workflows/e2e.yml/runs?status=success`: `total_count: 2`, ambos em 12/09/2026 (branch `execucao/sicoob-20260911130857`). PR #98: E2E `failure` em 05:40, 07:30 e 09:05 de 08/10 e `cancelled` às 09:31, mesclado mesmo assim. O dispatch na `main` em 08/10 terminou em `startup_failure`. As 9 execuções no PR Devin (11/10) foram `cancelled`/em curso.
- O que falta: estabilizar até ter execução verde reprodutível no HEAD e torná-lo obrigatório (QA-56).
- Impacto no negócio: o único teste de navegador de ponta a ponta não protege nenhuma publicação.
- Esforço: M
- Prioridade: P0

### QA-12  Specs `e2e/routes/sicoob/*.spec.ts` não pertencem a nenhum projeto Playwright
- Status: ORFA
- Origem: `e2e/routes/sicoob/logistica-onda-a.spec.ts:1-19` (caça de gaps de RBAC e acesso negado do Sicoob)
- Evidência: `playwright.config.ts:173-177`: `chromium-public` ignora `/routes\//`; `:275`, `:283`, `:291` e `:300` casam só `routes/(public|app|quotes|admin)`. Os arquivos `logistica-onda-a`, `order-rbac`, `orders-list` e `vendas-access` nunca rodam. Além disso, dependem de ID fixo `/sicoob/pedidos/1` e de `MOCK_ORDERS` (`orders-list.spec.ts:41-45`). O cabeçalho de `logistica-onda-a.spec.ts:9-16` documenta gaps conhecidos (sidebar visível a qualquer usuário, redirecionamento silencioso para `/` em vez de `/403`).
- O que falta: incluir `sicoob` no `testMatch` de `routes-authed`/`routes-guards`, trocar os IDs fixos por fixtures reais e corrigir o RBAC exposto.
- Impacto no negócio: o controle de acesso do portal Sicoob (quem vê pagamentos e aprovações) não tem verificação automática.
- Esforço: M
- Prioridade: P1

### QA-13  16 cenários P0 de resiliência com `test.skip` permanente (UX de degradação não implementada)
- Status: NAO_INICIADA
- Origem: `e2e/flows/p0/README.md:3-4` ("Todos com `test.skip` — destrave após implementar a UX de degradação correspondente"); `docs/RUNBOOK.md` (cenários P0)
- Evidência:
  - `01-auth-recovery.spec.ts:16,30,39`: auth 503, sessão expirada com `returnTo`, logout global em menos de 5 s.
  - `02-catalog-degraded.spec.ts:11,21,30`: cache e banner com o banco externo fora do ar, escrita desabilitada, Cloudflare Stream offline.
  - `03-quote-blocked.spec.ts:11,19,27`: orçamento salvo localmente e reenfileirado quando o Bitrix cai, busca local com o CRM fora, token inválido não expõe outros orçamentos. Corpo `expect(true)` em `:24`.
  - `04-checkout-blocked.spec.ts:11,20,24`: carrinho intacto em `create-order` 500, rollback de estoque, idempotência de duplo clique. Corpos `expect(true)` em `:21,25`.
  - `05-admin-down.spec.ts:11,19,27,37`: diagnóstico com retry, MCP 401, sem loop infinito, revogação de chave refletida sem F5. `expect(true)` em `:38`.
- O que falta: implementar a UX de degradação (fila de retry do Bitrix, cache de catálogo, banners) e remover os skips.
- Impacto no negócio: com o Bitrix ou o CRM fora do ar, o vendedor pode perder o orçamento ou ficar travado, e isso nunca foi testado.
- Esforço: G
- Prioridade: P1

### QA-14  Nenhuma jornada E2E transacional (orçamento → aprovação → pedido)
- Status: NAO_INICIADA
- Origem: `docs/plano-implementacao/plano-reconciliacao-50-etapas.md:666-669` (Etapa 50: "criar campanha, orçamento, pedido, aprovação… 82 cenários de negócio verdes"); `docs/CASOS_TESTE_E2E_POR_PAPEL.md:16-22` (TC-GP-02 "Criar Pedido Normal")
- Evidência: `e2e/quote-create.spec.ts:11-38` só testa redirecionamento sem login. `e2e/quote-approval.spec.ts:11` só testa token inválido. `e2e/flows/04-quotes.spec.ts:13-31` só abre telas. `e2e/flows/05-orders.spec.ts:20` "abre primeiro pedido se existir". `e2e/flows/26-complete-flow.spec.ts:8` "abre os controles reais do orçamento". Não há criação, envio, aprovação por token válido nem conversão em pedido.
- O que falta: um spec serial com fixture de homologação cobrindo criar → enviar → aprovar (`/approve/:token`) → converter → validar pedido e verba.
- Impacto no negócio: o fluxo que gera receita não tem prova automatizada no navegador antes de cada publicação.
- Esforço: G
- Prioridade: P1

### QA-15  Portal Sicoob sem nenhum E2E executável (13 rotas)
- Status: NAO_INICIADA
- Origem: `docs/CASOS_TESTE_E2E_POR_PAPEL.md:5-40` (TC-GP-01..03, TC-GC-01); `docs/GO_LIVE_CHECKLIST.md:19` ("Workflow de aprovação testado com o papel `gestor`")
- Evidência: sem nenhuma referência em specs executáveis: `/pa/verba`, `/dashboard-pa`, `/gestor`, `/gestor/agregados`, `/gestor/aprovacoes`, `/gestor/auditoria`, `/gestor/convites`, `/gestor/orcamentos`, `/vendedor/dashboard`, `/relatorios/sicoob`, `/kpis/sicoob` (`src/routes/config/sicoob-rbac.ts:10-26`), `/convite/:token` (`src/routes/config/public.ts:29`) e `/sicoob/vendas` (só no spec órfão da QA-12). O smoke cobre 30 features, nenhuma do Sicoob (`docs/E2E_SMOKE_COVERAGE.md:21-52`), e o catálogo E2E tem 58 rotas contra 94 configuradas.
- O que falta: specs por papel (PA, gestor, vendedor) para verba, aprovação em lote, consolidação e convite.
- Impacto no negócio: o produto vendido ao Sicoob (verba por PA e alçada do gestor) não é exercitado no navegador.
- Esforço: G
- Prioridade: P1

### QA-16  Personas e fixtures por papel Sicoob não provisionadas para CI
- Status: BLOQUEADA_EXTERNA
- Origem: `SICOOB_TESTING.md:9-15` (`SICOOB_TEST_EMAIL_PA/SINGULAR/CENTRAL/GESTOR`); `docs/secrets.md:40` ("simulação de papéis Sicoob em CI | **preencher**"); `docs/FIXTURES_E2E_POR_PAPEL.md:5-18`
- Evidência: nenhum secret `SICOOB_TEST_*` no GitHub (API: 19 secrets, nenhum Sicoob). `docs/FIXTURES_E2E_POR_PAPEL.md:18` e `docs/CASOS_TESTE_E2E_POR_PAPEL.md:29,40` contêm placeholders ("... (mais casos)"). `docs/CASOS_TESTE_E2E_POR_PAPEL.md:3` referencia `CHECKLIST_EXECUCAO_PREVIEW_POR_PAPEL.md`, que não existe. `SICOOB_TESTING.md:11` documenta a senha padrão `password123`.
- O que falta: decidir e criar as contas de homologação por papel, cadastrar os secrets e completar os documentos (sem senha padrão).
- Impacto no negócio: sem as contas, não há como testar o fluxo PA → gestor.
- Esforço: M
- Prioridade: P1

### QA-17  E2E roda contra o Supabase canônico, sem projeto de homologação
- Status: BLOQUEADA_EXTERNA
- Origem: `docs/plano-implementacao/plano-workflows-github-100-etapas-20260927.md:91` (etapa 34: "Decidir contra qual Supabase o E2E roda… nunca produção")
- Evidência: `.github/workflows/e2e.yml:60-62` usa os secrets `VITE_SUPABASE_*` (os mesmos do build). `:84-92` usa `SUPABASE_SERVICE_ROLE_KEY` com `RUN_REMOTE_RLS_TESTS=1`. Não há secrets `E2E_SUPABASE_*`. O `scripts/test-rls-compliance.mjs:38-50` também cria usuários efêmeros via `admin.createUser` no projeto canônico.
- O que falta: decisão e custo de um projeto de homologação, com secrets próprios.
- Impacto no negócio: os testes criam e apagam dados no mesmo banco das cooperativas.
- Esforço: M
- Prioridade: P1

### QA-18  Testes E2E que sempre passam ou se pulam por falta de dados
- Status: STUB/MOCK
- Origem: `e2e/flows/21-feature-matrix.spec.ts:1-7` ("tolera ausência de dados (skip-on-missing)")
- Evidência: `e2e/flows/21-feature-matrix.spec.ts:36-43` termina em `expect(true).toBe(true)` e engole a asserção com `.catch(() => {})` (`:41`). Skips por dados em `:19,30` ("Catálogo vazio") e `e2e/flows/12-cart-checkout.spec.ts:105,108,168,191` ("Sem empresas"). `e2e/flows/pwa-performance.spec.ts:16` fica sempre pulado, porque roda no servidor dev e `src/main.tsx:120-122` desregistra o Service Worker em DEV (o "Core Web Vitals Budget Check" em `:24` mede o build de desenvolvimento). `e2e/flows/p0/08-password-recovery.spec.ts:154` é um skip morto, porque `data-testid="login-forgot-link"` existe em `src/pages/Auth.tsx:390`.
- O que falta: fixtures determinísticas, remover `expect(true)` e o `.catch` e mover o spec de PWA para `playwright.pwa.config.ts`.
- Impacto no negócio: um ambiente vazio aprova a suíte sem testar nada.
- Esforço: P
- Prioridade: P2

### QA-19  Regressão E2E com `continue-on-error` e `--pass-with-no-tests`
- Status: PARCIAL
- Origem: `docs/plano-implementacao/plano-workflows-github-100-etapas-20260927.md:89` (etapa 35)
- Evidência: `.github/workflows/e2e.yml:273` (`--pass-with-no-tests`), `:278` (`continue-on-error: true`), falha só via `:324-328`. O smoke também usa `continue-on-error` (`:133`).
- O que falta: deixar o step falhar naturalmente e remover `--pass-with-no-tests`, porque um shard vazio hoje passa.
- Impacto no negócio: um shard sem testes por erro de configuração aparece como aprovado.
- Esforço: P
- Prioridade: P3

### QA-20  Gate E2E incompatível com PRs do Dependabot
- Status: PARCIAL
- Origem: `.github/dependabot.yml:6-37`
- Evidência: a API de secrets do Dependabot retorna `total_count: 0`, e `e2e.yml:76-82` falha quando faltam credenciais. O PR #99 (postcss) teve E2E `failure` em 08/10 12:20.
- O que falta: replicar os secrets para o Dependabot ou pular o E2E para o ator `dependabot[bot]` com um gate equivalente.
- Impacto no negócio: atualizações de segurança de dependências ficam sempre vermelhas e acabam mescladas por bypass ou ignoradas.
- Esforço: P
- Prioridade: P2

### QA-21  Spec Playwright perdido em `tests/e2e/rbac-dev-technical-routes.test.ts`
- Status: ORFA
- Origem: `tests/e2e/rbac-dev-technical-routes.test.ts:3-10` (RBAC Dev × Admin em rotas técnicas)
- Evidência: excluído em `vitest.config.ts:32` e fora do `testDir: "./e2e"` (`playwright.config.ts:107`). Usa sessão falsa via `localStorage` (`:14-18`), o que não funcionaria.
- O que falta: mover para `e2e/` com `loginAs('admin'|'dev')` ou apagar.
- Impacto no negócio: a separação de acesso entre administrador e desenvolvedor nas telas técnicas não é testada.
- Esforço: P
- Prioridade: P3

### QA-22  Documentação e exemplos de E2E desatualizados
- Status: PARCIAL
- Origem: `e2e/README.md:30-44`; `.env.e2e.example:1-16`; `docs/TESTING.md:1-31`
- Evidência: `.env.e2e.example:4-12` só tem `E2E_USER_*`/`E2E_ADMIN_*` (faltam VIEWER, MANAGER, DEV, os TOTP e `E2E_CLEANUP_TOKEN`, exigidos por `e2e.yml:79`). `e2e/README.md:13-28` lista 11 flows (hoje são 26 mais p0, routes e critical-flows). `docs/TESTING.md` não menciona simulações SQL, cenários `node --test`, Deno nem PWA.
- O que falta: atualizar os três arquivos.
- Impacto no negócio: um novo desenvolvedor não consegue rodar a suíte localmente sem engenharia reversa do workflow.
- Esforço: P
- Prioridade: P3

### C. Testes de contrato

### QA-23  Testes de contrato Pact (frontend ↔ n8n/webhooks)
- Status: NAO_INICIADA
- Origem: `docs/testing/CONTRACT_TESTS_PACT.md:57-60` ("Instalar `@pact-foundation/pact`… Configurar Pact Broker… Adicionar step `test:contract` no `ci.yml`")
- Evidência: `package.json` não tem `@pact-foundation/pact`, não há `test:contract` nem broker. `tests/contract/sicoob-sync.test.ts:3-8,30-31` é um "blueprint" que valida o próprio literal (`expectedPayload.order_id` definido).
- O que falta: tudo o que o documento planeja (dependência, broker, testes de consumer e provider, step no CI).
- Impacto no negócio: uma mudança no formato do webhook do n8n ou do Bitrix quebra a sincronização de orçamentos em produção sem aviso.
- Esforço: M
- Prioridade: P2

### D. Acessibilidade

### QA-24  WCAG 2.1 AA sem gate nas páginas autenticadas
- Status: PARCIAL
- Origem: `docs/ACCESSIBILITY.md:144` ("Meta: WCAG 2.1 Level AA"); `scripts/generate-audit-dossier.mjs:111` (declara "WCAG 2.1 validado via suíte de testes E2E. ✅ Conforme")
- Evidência: o axe roda só em 7 testes unitários (por exemplo `tests/a11y/onda5-a11y.test.tsx`) e na QA visual de `/login` e da demonstração (`scripts/qa/login-browser.mjs:32-33`, `scripts/qa/demo-browser.mjs:56-58`). Os E2E de rota são explicitamente "sem axe" (`e2e/routes/_shared.ts:161`), e o Lighthouse audita só `/login` (`.lighthouserc.cjs:6`). `axe-core` não é dependência direta (chega por transitividade via `jest-axe`). `scripts/validate-wcag-colors.mjs` e `scripts/check-sicoob-hardcoded-colors.mjs` não estão em nenhum script npm nem workflow.
- O que falta: `@axe-core/playwright` nas rotas autenticadas críticas (orçamento, carteira PA, aprovações), dependência direta e gate de contraste.
- Impacto no negócio: a alegação de conformidade de acessibilidade feita ao cliente não tem prova.
- Esforço: M
- Prioridade: P2

### E. Performance / Lighthouse / bundle / carga

### QA-25  Lighthouse só em `/login`, sem backend e instável
- Status: PARCIAL
- Origem: `docs/plano-implementacao/plano-workflows-github-100-etapas-20260927.md:104` (etapa 47: "adicionar rota `/` além de `/login`")
- Evidência: `.lighthouserc.cjs:6` (só `/login`), `:20` (LCP relaxado para 2.600 ms "por ruído do runner"). Não há orçamento de recursos (`budgets`). `lighthouse.yml:49` usa `LHCI_GITHUB_APP_TOKEN`, que não existe entre os secrets. Execuções: *Lighthouse Performance Audit* `failure` três vezes no PR #98 (08/10) e uma no PR Devin (11/10).
- O que falta: rotas reais (catálogo, construtor de orçamento) com sessão, orçamentos de recursos e estabilização.
- Impacto no negócio: lentidão nas telas onde o vendedor trabalha não é medida.
- Esforço: M
- Prioridade: P2

### QA-26  Orçamento de bundle sem comparação com a `main`
- Status: PARCIAL
- Origem: `docs/plano-implementacao/plano-workflows-github-100-etapas-20260927.md:105` (etapa 48)
- Evidência: `scripts/qa/check-bundle-budget.mjs:7-9` usa só um limite absoluto de 800 KB por chunk, sem baseline nem orçamento total. `bundle-check.yml:38-48` tem upload sem `retention-days`.
- O que falta: baseline da `main` e limite de crescimento percentual.
- Impacto no negócio: um aumento de 20% no carregamento passa despercebido se ficar abaixo do teto.
- Esforço: P
- Prioridade: P3

### QA-27  Teste de carga não operacional
- Status: ORFA
- Origem: `tests/load/basic-smoke.js:1-17` (k6 com limites p95 < 1 s e erro < 1%); `package.json:68` (`test:load`)
- Evidência: o script k6 não tem runner, script npm nem workflow (k6 não é dependência). `scripts/load-test.mjs:6-8` dispara 1.000 requisições contra o `health-check` do projeto canônico, sem limites de aprovação e fora do CI.
- O que falta: executar periodicamente em homologação, com limites que reprovem.
- Impacto no negócio: a capacidade para campanhas com picos de pedidos é desconhecida.
- Esforço: P
- Prioridade: P3

### F. PWA

### QA-28  Notificações push da PWA
- Status: NAO_INICIADA
- Origem: `public/sw.js:149` ("Push notifications (para futura implementação)")
- Evidência: não há `pushManager`, `PushSubscription` nem VAPID em `src` ou `supabase/functions` (busca vazia). O SW referencia `/icon-192x192.png`, `/icon-72x72.png` e `/icon-96x96.png`, que não existem em `public/`, e usa o título "Gifts Store" (`public/sw.js:156-176`).
- O que falta: inscrição, backend de envio e ícones.
- Impacto no negócio: gestores não recebem aviso de aprovação pendente fora do navegador aberto.
- Esforço: M
- Prioridade: P3

### QA-29  Sincronização em segundo plano de orçamentos offline
- Status: STUB/MOCK
- Origem: `public/sw.js:193` ("Background sync (para futura implementação)")
- Evidência: `public/sw.js:202-206` (`syncQuotes()` só faz `console.log` e tem `// TODO: Implementar lógica de sync`). Não há `sync.register('sync-quotes')` em `src`.
- O que falta: fila local de orçamentos e reenvio.
- Impacto no negócio: um orçamento feito sem conexão não é recuperado automaticamente.
- Esforço: M
- Prioridade: P3

### QA-30  Manifest PWA incompleto
- Status: PARCIAL
- Origem: `public/manifest.json:1-38`; `src/pages/PWAInstallPage.tsx` (instalação divulgada)
- Evidência: só ícones SVG e ICO (`manifest.json:10-27`), sem PNG 192/512 nem `apple-touch-icon`. O screenshot aponta para uma URL externa de preview do Lovable em R2 (`:30-36`).
- O que falta: ícones PNG e screenshot hospedado no próprio domínio.
- Impacto no negócio: a instalação no iPhone e a vitrine do Chrome ficam degradadas ou com imagem de outro ambiente.
- Esforço: P
- Prioridade: P3

### G. Segurança (gitleaks / CodeQL / audit / dependabot / compliance)

### QA-31  CodeQL sem upload ao Code Scanning e vermelho na `main`
- Status: BLOQUEADA_EXTERNA
- Origem: `docs/plano-implementacao/plano-workflows-github-100-etapas-20260927.md:100-101` (etapas 43-44) e `:71` (etapa 14)
- Evidência: `codeql.yml:63-67` (`upload: never`, Code Scanning não habilitado no repositório privado). Execuções na `main`: `failure` em 02/10, 04/10 e no schedule de 05/10. O PR #94 ("estabiliza… CodeQL") segue aberto. Continua em `pull_request` (`:11-17`), contra a etapa 14.
- O que falta: decisão de plano (GHAS) ou de alternativa (semgrep/eslint-security), além de estabilizar a `main`.
- Impacto no negócio: os achados de segurança só existem num artefato que ninguém lê.
- Esforço: M
- Prioridade: P1

### QA-32  Dossiê "Enterprise Compliance" com alegações fixas e resultados descartados
- Status: STUB/MOCK
- Origem: `.github/workflows/security-compliance.yml:62-84` ("Generate Audit Dossier V5", "Filtered Audit Exports")
- Evidência:
  - `scripts/generate-audit-dossier.mjs:78-81,109-111` tem "✅ Ativo/✅ Conforme" fixos.
  - `scripts/generate-enterprise-report.mjs:55-59,68` traz "Cobertura de 100%" fixa e cita `supabase/migrations/20250103_02_rls_organizations.sql`, que não existe.
  - `scripts/audit-export.mjs:9-14` tem um inventário fixo, com 3 caminhos inexistentes (`20250103_02_rls_organizations.sql`, `20260504-archive-logs.sql`, `roadmap/ledger-integration`).
  - `scripts/validate-audit-links.mjs:8-12` valida `FINAL_ENTERPRISE_AUDIT_REPORT.md` e `AUDIT_INVENTORY_DETAILED.md`, que ninguém gera, então não faz nada.
  - `scripts/md-to-pdf-stub.mjs:1-2` imprime "PDF gerado com sucesso" sem gerar nada.
  - O workflow gera os `.md` na raiz, mas sobe só `reports/` (`:83`), então o dossiê é descartado.
  - Não há issue automática quando o RLS reprova (etapa 42, `plano-workflows…:99`).
- O que falta: o dossiê deve derivar só de verificações executadas, os artefatos devem ser publicados e deve haver alerta em caso de reprovação.
- Impacto no negócio: o relatório de conformidade apresentado a terceiros afirma controles que não foram verificados.
- Esforço: M
- Prioridade: P1

### QA-33  Relatórios de auditoria com métricas fabricadas publicados na URL de produção
- Status: NAO_INICIADA
- Origem: `docs/plano-implementacao/plano-workflows-github-100-etapas-20260927.md:173` (etapa 96: "Remover `reports/AUDIT_REPORT_*.md` versionados e adicionar `reports/` ao `.gitignore`")
- Evidência: 13 arquivos em `public/reports/AUDIT_REPORT_*.md`, mais `public/AUDIT_ENTERPRISE_FINAL.md`, copiados pelo Vite para o site publicado. Exemplo: `public/AUDIT_ENTERPRISE_FINAL.md:24-30` ("Cobertura de Linhas 98.2%" com "Métricas Reais: ❌", "100% das tabelas validadas"), seguido da lista completa de tabelas do banco e de links 404 para `github.com/promo-gifts/app`. `reports/` continua versionado e fora do `.gitignore`. O gerador `scripts/enterprise-dossier-builder.mjs:313-318` grava em `public/` (`package.json:73`, `audit:dossier`).
- O que falta: tirar os arquivos de `public/`, ignorar `reports/` e gerar só como artefato privado.
- Impacto no negócio: qualquer pessoa na internet lê o mapa do banco e números de qualidade falsos com a marca Sicoob.
- Esforço: P
- Prioridade: P1

### QA-34  `security-compliance` roda a cada push na `main` com service role no banco canônico
- Status: PARCIAL
- Origem: `docs/plano-implementacao/plano-workflows-github-100-etapas-20260927.md:97-98` (etapas 40-41: só `schedule` e `workflow_dispatch`, com `environment: compliance`)
- Evidência: `security-compliance.yml:3-9` (push na `main`). `scripts/test-rls-compliance.mjs:38-50` cria personas efêmeras via `admin.createUser`. Não existe environment `compliance` (API environments: `construction`, `copilot`, `Preview`, `Production`, mais um órfão). O upload `:79-84` não tem `retention-days` (90 dias por padrão; etapa 87).
- O que falta: environment protegido, gatilho só agendado e retenção de 7 dias.
- Impacto no negócio: cada merge cria e apaga usuários no banco de produção com chave administrativa.
- Esforço: P
- Prioridade: P2

### QA-35  Endurecimento da cadeia de suprimentos dos workflows não iniciado
- Status: NAO_INICIADA
- Origem: `docs/plano-implementacao/plano-workflows-github-100-etapas-20260927.md:147,155-156,160-161` (etapas 80, 83, 84, 88 e 89)
- Evidência: não há `dependency-review-action`, `actionlint`, `zizmor`, `step-security/harden-runner` nem guarda de fork (`head.repo.full_name == github.repository`) em `.github/workflows/*`. Já feito: SHA pinning (todas as actions), `allowed_actions: selected` e `sha_pinning_required: true` (API), Dependabot alerts e security updates ativos (API 204 / `enabled:true`).
- O que falta: as quatro ferramentas e a guarda nos jobs com secrets.
- Impacto no negócio: um erro ou abuso em um workflow com segredos de produção não é detectado antes de rodar.
- Esforço: P
- Prioridade: P2

### QA-36  Verificação automática do inventário de secrets ("a criar") e documento desatualizado
- Status: NAO_INICIADA
- Origem: `docs/secrets.md:96-99` ("um script (`scripts/check-secrets-inventory.mjs`, a criar)")
- Evidência: o script não existe. `docs/secrets.md:80-87` ainda diz que os secrets E2E e `SUPABASE_SERVICE_ROLE_KEY` estão "❌ ausente", mas a API mostra que existem desde 28/09 e 08/10. `:36` diz que `WEBHOOK_HMAC_SECRET` é "usado também em `ci.yml`" (falso, e ele não existe no GitHub). `:40` lista as variáveis Sicoob como "preencher". Há 20 linhas com "preencher".
- O que falta: o script e a reconciliação do documento com a API.
- Impacto no negócio: integrações quebram por segredo ausente e só se descobre lendo log de produção.
- Esforço: P
- Prioridade: P2

### QA-37  Gitleaks: checklist de rotação e evidência em aberto
- Status: PARCIAL
- Origem: `docs/RUNBOOKS/CREDENTIAL_ROTATION.md:141-150` (checklist de fechamento); `plano-workflows…:94,159,162` (etapas 37, 86 e 90)
- Evidência: o Gitleaks roda em PR, na `main` e semanalmente (`security.yml:27-44`), com triagem dos JWT `anon` documentada (`CREDENTIAL_ROTATION.md:36-41`). Mas `.gitleaksignore` tem 47 fingerprints (inclusive `.env:jwt`, `.env.production:jwt` e `src/integrations/supabase/client.ts:jwt`), todos os itens do checklist estão `[ ]`, e não há `--redact` nem resumo (etapa 86).
- O que falta: registrar a evidência de rotação, que hoje só tem calendário, e ativar a redação nos logs.
- Impacto no negócio: risco residual baixo, mas a prova de higiene de credenciais está incompleta para auditoria externa.
- Esforço: P
- Prioridade: P3

### H. Workflows do GitHub

Inventário (13 workflows):

| Workflow | Gatilhos | Secrets exigidos | Estado recente |
|---|---|---|---|
| ci.yml | push main (com paths-ignore), PR | nenhum | push do HEAD `dc08200` em startup_failure; verde em PRs de 11/10 |
| e2e.yml | PR, dispatch | 15 secrets E2E/Supabase | 2/677 verdes (QA-11) |
| sicoob-ci.yml | push com paths, PR | nenhum | verde em PRs |
| security.yml | PR, push, semanal | GITHUB_TOKEN | verde |
| codeql.yml | PR, push, semanal | — | vermelho na main (QA-31) |
| lighthouse.yml | PR | LHCI_GITHUB_APP_TOKEN (ausente) | instável (QA-25) |
| bundle-check.yml | PR | — | verde |
| security-compliance.yml | push main, semanal, dispatch | VITE_SUPABASE_*, SERVICE_ROLE | verde em 11/10 (QA-32/QA-34) |
| migration-ledger-drift.yml | diário, dispatch | SUPABASE_ACCESS_TOKEN (env construction) | verde desde 08/10 |
| db-performance-audit.yml | mensal, dispatch | VITE_SUPABASE_URL, SERVICE_ROLE | verde em 01/10 (saída só em log) |
| apply-sicoob-migrations.yml | dispatch ("APLICAR") | SUPABASE_ACCESS_TOKEN | sucesso em 02/10 |
| deploy-sicoob-functions.yml | dispatch ("PUBLICAR") | SUPABASE_ACCESS_TOKEN, VITE_SUPABASE_PROJECT_ID | sucesso em 06/10 |
| branch-protection-sentinel.yml | push main, dispatch | — | só auditoria posterior (QA-59) |

Nenhum workflow usa `if: false` nem runner self-hosted (todos usam `ubuntu-latest` desde `dc08200`).

### QA-38  HEAD `dc08200` entrou na `main` sem CI concluído (PR #98 mesclado com gates vermelhos)
- Status: PARCIAL
- Origem: `docs/execucao/fechamento-tecnico-2026-10-08.md:76` ("condicionado ao CI do PR #98"); `AGENTS.md` ("Pronto = ligado em produção com tráfego real"); `plano-workflows…:177` (etapa 100)
- Evidência (API de runs): push na `main` às 12:17 de 08/10, run `37775844412`, `path: BuildFailed`, `startup_failure`. Branch `fix/hermes-h8111165-fechamento`: commits `6eedde9` e `1c6b641` com **todos** os workflows em `startup_failure` (12:13–12:17). Commit `763fdd4`: *Qualidade contínua* `failure`, *Lighthouse* `failure`, *E2E* `cancelled`. Commits `818c149`, `82d9996` e `f9ca56f`: E2E `failure`. Nenhum CI de push existe para o HEAD atual.
- O que falta: reexecutar o CI no HEAD (por dispatch), corrigir as falhas e só então declarar o fechamento. Também falta investigar a causa do `startup_failure` (provável mudança de política de Actions durante o merge; não confirmado).
- Impacto no negócio: a versão em produção foi declarada validada sem que os testes automáticos tenham rodado nela.
- Esforço: M
- Prioridade: P0

### QA-39  Otimização de custo e minutos de Actions não executada (runners voltaram a ser hospedados)
- Status: NAO_INICIADA
- Origem: `docs/plano-implementacao/plano-workflows-github-100-etapas-20260927.md:13-17` (F1, F2 e F5: minutos esgotados em 16/09) e `:62-76` (etapas 10, 11, 12, 14, 15, 16, 20, 23 e 24)
- Evidência: `git log -S self-hosted` mostra que `dc08200` removeu os runners self-hosted. A regressão E2E roda em todo PR, com 3 shards em série de até 40 min (`e2e.yml:207-221`), instalando webkit em todos (`:262-263`). Há 5 builds do Vite por PR (`ci.yml:122-127`, `bundle-check.yml:29-33`, `lighthouse.yml:40-44`, `sicoob-ci.yml:84-89` e `playwright.pwa.config.ts:17`). Simulações aparecem duplicadas (`ci.yml:83-84,110-111` e `sicoob-ci.yml:49,59`). O `ci.yml` é um job único de até 25 min. Não existe `.github/actions/`. `fetch-depth: 0` aparece em `sicoob-ci.yml:45-46,69-70` e `security-compliance.yml:27-28`. A meta "≤ 30 min por PR" está ausente em `docs/CI_CD.md` (`:3`, "Estado comprovado em 22/09").
- O que falta: E2E completo noturno ou por label, um build compartilhado, jobs paralelos, uma composite action e a meta de custo documentada, além da decisão de orçamento (etapa 1).
- Impacto no negócio: o repositório privado no plano gratuito pode voltar a parar todo o CI por falta de minutos, como em 16/09.
- Esforço: M
- Prioridade: P1

### QA-40  Pipeline de entrega incompleto (migrations, funções, produção, gate do Vercel)
- Status: NAO_INICIADA
- Origem: `plano-workflows…:120-123,126` (etapas 58, 59, 60, 61 e 63); `docs/CI_CD.md:33-34` (passos 5 e 6 do fluxo)
- Evidência: não há `db push --dry-run` em PR. `apply-sicoob-migrations.yml:3-9` é só `workflow_dispatch` com allowlist. `deploy-sicoob-functions.yml:42-49` publica 7 de 108 funções e não faz smoke pós-deploy (`health-check`/`system-healthcheck`). O environment `Production` não tem `protection_rules`, e `construction` só tem branch policy, sem revisores (API). `vercel.json` não tem `ignoreCommand` nem gate de status, e não há uso de `deployment_status`.
- O que falta: workflow de migrations com dry-run, publicação de todas as funções com aprovação, smoke pós-deploy e gate do Vercel.
- Impacto no negócio: o código vai para produção (Vercel/Lovable) mesmo com CI vermelho, e as migrations seguem por caminho manual.
- Esforço: G
- Prioridade: P1

### QA-41  Lint SQL de migrations e runbook de migrations
- Status: NAO_INICIADA
- Origem: `docs/plano-implementacao/plano-reconciliacao-50-etapas.md:643-649` (Etapa 47: `squawk`/`sqlfluff`, regras e `docs/RUNBOOKS/MIGRATIONS.md`)
- Evidência: não há `squawk` nem `sqlfluff` em workflows, scripts ou `package.json`, e `docs/RUNBOOKS/` contém só `CREDENTIAL_ROTATION.md` e `MCP_DDL_APPLICATION.md`. Já existem a imutabilidade (`ci.yml:45-50`) e o preflight via simulação (`scripts/qa/simular-controles-auditoria.py:68`).
- O que falta: o lint no CI, as regras (sem `DROP` sem ADR, `CREATE INDEX CONCURRENTLY`, `search_path` em `SECURITY DEFINER`) e o runbook.
- Impacto no negócio: uma migration perigosa (bloqueio de tabela, função insegura) chega ao banco sem revisão automática.
- Esforço: M
- Prioridade: P2

### QA-42  Higiene do `deploy-sicoob-functions.yml`
- Status: PARCIAL
- Origem: `plano-workflows…:117-118` (etapas 55-56)
- Evidência: a lista de funções aparece duplicada em `deploy-sicoob-functions.yml:42-49` e `:58-65`, e o deploy usa `VITE_SUPABASE_PROJECT_ID` como ref (`:23`).
- O que falta: `env: FUNCTIONS` única e o secret `SUPABASE_PROJECT_REF`.
- Impacto no negócio: risco de publicar uma função e verificar outra.
- Esforço: P
- Prioridade: P3

### QA-43  Falhas de CI e rotinas agendadas sem notificação nem issue
- Status: NAO_INICIADA
- Origem: `plano-workflows…:99,106-107,168-169` (etapas 42, 49, 50, 91 e 92)
- Evidência: `db-performance-audit.yml:40-46` deixa a saída só no log (sem artefato nem issue). `migration-ledger-drift.yml:38-47` não abre issue. Não há `_notify.yml` nem `actions-usage-report.yml`. A falha de 07/10 do drift e a do CodeQL em 05/10 não geraram nenhum aviso.
- O que falta: um job reutilizável de notificação (issue ou WhatsApp) e um relatório mensal de minutos.
- Impacto no negócio: problemas no banco e na esteira só são descobertos quando alguém abre o painel.
- Esforço: M
- Prioridade: P2

### QA-44  Inventário de runtime expira em 07/11/2026 sem rotina de atualização
- Status: PARCIAL
- Origem: `scripts/db/check-runtime-refs.mjs:22,57` (cache máximo de 30 dias); `ci.yml:52-53`
- Evidência: `scripts/db/.inventory-cache.json`: `generated_at: 2026-10-08T08:26:00Z`, com "data de coleta informada pelo operador". A atualização é manual (`scripts/db/import-api-inventory.mjs`) e nenhum workflow a executa.
- O que falta: um workflow agendado (environment protegido) que regenere o inventário e abra PR.
- Impacto no negócio: a partir de 07/11 todos os PRs falham no CI até alguém atualizar à mão.
- Esforço: P
- Prioridade: P1

### QA-45  Templates e CODEOWNERS com referências quebradas
- Status: ORFA
- Origem: `plano-workflows…:144,146` (etapas 77 e 79)
- Evidência: há dois templates de PR divergentes (`.github/PULL_REQUEST_TEMPLATE.md` com 50 linhas e `.github/pull_request_template.md` com 26). `.github/ISSUE_TEMPLATE/config.yml:3-8` aponta para `adm01-debug/Promo_Gifts`. A label `triage` não existe (`bug_report.yml:4`, `feature_request.yml:4`; API labels). `.github/CODEOWNERS:18,20,22` referencia `.env.example`, `pnpm-lock.yaml` e `bun.lock`, que não existem.
- O que falta: unificar o template, corrigir as URLs, criar a label e limpar o CODEOWNERS.
- Impacto no negócio: bugs reportados vão parar em outro repositório.
- Esforço: P
- Prioridade: P3

### QA-46  PRs substituídos ainda abertos (#94, #97)
- Status: PARCIAL
- Origem: `docs/execucao/fechamento-tecnico-2026-10-08.md:60` ("Os reparos úteis dos PRs #92, #93, #94 e #97 foram incorporados ao PR #98… só devem ser encerrados… depois da aprovação dos gates")
- Evidência: o contexto informa #94 e #97 abertos. Os gates do #98 não foram aprovados (QA-38).
- O que falta: concluir a QA-38 e encerrar os PRs como substituídos.
- Impacto no negócio: há risco de mesclar uma correção duplicada ou conflitante.
- Esforço: P
- Prioridade: P3

### QA-47  Documentação de CI e runbook "CI vermelha" desatualizados ou inexistentes
- Status: NAO_INICIADA
- Origem: `plano-workflows…:171,176` (etapas 94 e 99)
- Evidência: `docs/CI_CD.md:3` e `docs/BRANCH_PROTECTION.md:3` descrevem o estado de 22/09 (falam em bloqueio por orçamento). `docs/RUNBOOK.md` não tem a seção "CI vermelha".
- O que falta: atualizar os documentos e criar o runbook (quem reexecuta, quando reverter).
- Impacto no negócio: na próxima quebra de CI, ninguém sabe quem age nem como.
- Esforço: P
- Prioridade: P3

### I. Scripts npm

### QA-48  Scripts npm quebrados ou ilusórios
- Status: ORFA
- Origem: `package.json` (bloco `scripts`)
- Evidência: `package.json:43` (`test:e2e:smoke:2h` filtra a tag `@smoke-2h`, que não existe em nenhum spec). `:35` (`test:cleanup` limpa um e-mail fixo `test@example.com` com `dryRun:false`). `:69` (`test:fuzzing` roda `tests/unit/fuzzing.test.ts`, que não importa código real). `:67` (`test:simulation` exige `WEBHOOK_HMAC_SECRET`, inexistente). `:40` (`test:strict-ref`, ver QA-07). Nenhuma referência de arquivo em `package.json` aponta para arquivo inexistente (verificado).
- O que falta: corrigir ou remover.
- Impacto no negócio: comandos documentados dão falso positivo.
- Esforço: P
- Prioridade: P3

### QA-49  Gates de qualidade prontos que nunca rodam contra o código real
- Status: ORFA
- Origem: `package.json:16,37,39,66`; `docs/GO_LIVE_CHECKLIST.md:12` ("Preflight check passando (`npm run healthcheck`)")
- Evidência: `check:route-error-element` e `check:route-ref-usage` só são exercitados em fixtures temporárias (`tests/admin/route-error-element-checker.test.ts:31`, `tests/admin/route-ref-checker.test.ts:26`), nunca contra `src`. `test:price-freshness` e `scripts/check-price-freshness-coverage.mjs` estão fora do CI. `healthcheck` está fora do CI e de qualquer pós-deploy. O `typecheck` completo e o `lint:check` completo não rodam: o CI usa só as baselines, hoje em zero (`.typecheck-baseline.json`, `.eslint-baseline.json`).
- O que falta: adicionar ao `ci.yml` (são baratos) e ligar o `healthcheck` ao pós-deploy (QA-40).
- Impacto no negócio: regressões de roteamento e de frescor de preço passam sem bloqueio.
- Esforço: P
- Prioridade: P2

### QA-50  Hooks Husky contraditos pela regra `--no-verify`
- Status: PARCIAL
- Origem: `plano-workflows…:174-175` (etapas 97-98)
- Evidência: `.husky/pre-push:1` roda typecheck, lint e a suíte Vitest inteira. `AGENTS.md:51` determina "commit (--no-verify)".
- O que falta: um hook leve (`vitest related`) sem orientação de bypass, ou remover o hook.
- Impacto no negócio: a proteção local existe no papel, mas os agentes têm ordem de ignorá-la.
- Esforço: P
- Prioridade: P3

### J. Scripts de QA e revisão

### QA-51  5 simulações PostgreSQL prontas fora do CI
- Status: ORFA
- Origem: os docstrings de cada script (por exemplo `scripts/qa/simular-aprovacao-desconto-atomica.py:2-6`, "pedido, status e histórico têm commit único… rejeitam concorrência")
- Evidência: não são chamados em `ci.yml:83-120` nem em `sicoob-ci.yml:47-61`: `simular-aprovacao-desconto-atomica.py`, `simular-convites-sicoob.py` (convites institucionais e revogação), `simular-identidade-itens-orcamento.py`, `simular-salvamento-orcamento-atomico.py` (atomicidade, RLS e concorrência do salvamento) e `simular-verba-legada.py`.
- O que falta: incluí-los no job `transacoes` do `sicoob-ci.yml`.
- Impacto no negócio: aprovação de desconto, convites e salvamento de orçamento podem regredir sem que o CI perceba, mesmo com a prova já escrita.
- Esforço: P
- Prioridade: P1

### QA-52  Cerca de 20 scripts utilitários órfãos e o diretório `scripts/revisao/` histórico
- Status: ORFA
- Origem: os próprios scripts; `docs/OBSERVABILITY.md:121` (gate de Request-Id, ver QA-63)
- Evidência (sem consumidor em npm, workflows, husky, outros scripts ou testes): `scripts/api_map.cjs`, `generate_api_map.js`, `audit-technical-rls.sql`, `check-edge-functions-health.mjs`, `check-search-imports.mjs`, `check-sicoob-hardcoded-colors.mjs`, `compare-edge-functions.mjs`, `fix-edge-cors-allowlist.mjs`, `migrate-edge-cors-allowlist.mjs`, `generate-routes-map.mjs`, `md-to-pdf-stub.mjs` (stub), `triage-edge-typecheck.mjs` com `typecheck-edge-functions.mjs`, `validate-docs-consistency.mjs`, `validate-lovable-sync-target.mjs`, `validate-wcag-colors.mjs`, `check_tables.js` e `db/compare-types-api.mjs`. Em `scripts/revisao/` há 18 arquivos (geradores Python, `*.cenarios.tsx`, `vitest-*.config.ts`) citados só em `docs/execucao/*`.
- O que falta: ligar os úteis (cores WCAG, saúde das funções, consistência de documentação) e arquivar o resto.
- Impacto no negócio: ferramentas pagas em horas de desenvolvimento não protegem nada.
- Esforço: P
- Prioridade: P3

### K. Infra (`infra/`, `infrastructure/`)

### QA-53  Infraestrutura como código (Terraform) não aplicável
- Status: NAO_INICIADA
- Origem: `infra/README.md:3-17` ("Roadmap 10/10… migração… `modules/supabase`, `environments/prod`")
- Evidência: só existe `infra/modules/cloudflare/main.tf`. `modules/supabase` e `environments/prod` não existem. `main.tf:1-13` usa `var.cloudflare_zone_id`, `var.lovable_preview_url` e `cloudflare_worker_script.cors_proxy`, nenhum declarado, e não há provider nem backend de estado. Nenhum workflow roda Terraform.
- O que falta: decidir se o IaC vale a pena. Se sim, criar módulos, variáveis, provider e estado remoto; se não, apagar o diretório.
- Impacto no negócio: DNS e WAF continuam configurados à mão, sem histórico nem recuperação rápida.
- Esforço: G
- Prioridade: P3

### QA-54  Runner self-hosted abandonado, mas ainda registrado no repositório
- Status: ORFA
- Origem: `infrastructure/github-runner/docker-compose.yml:1-63`
- Evidência: nenhum workflow usa `self-hosted` desde `dc08200`. A API mostra 3 runners `vps-runner-*` registrados (1 `online`, 2 `offline`). O compose monta `/var/run/docker.sock` (`:57`) e desliga o auto-update (`:55`).
- O que falta: remover os runners, derrubar a stack no Portainer e apagar (ou documentar) o diretório.
- Impacto no negócio: um servidor com acesso total ao Docker continua ligado ao repositório privado sem uso.
- Esforço: P
- Prioridade: P2

### L. Vendor

### QA-55  `braces` vendorizado como mitigação temporária, sem critério de saída
- Status: PARCIAL
- Origem: `vendor/braces/proveniencia.json:6` ("Mitigação local para GHSA-vfj7-8cjw-p6xm enquanto não existe release corrigida upstream")
- Evidência: `package.json` usa `overrides.braces = "$braces"` e `devDependencies.braces = file:vendor/braces`. `scripts/check-npm-audit.mjs:11-25` valida a versão `3.0.4-sicoob.1`. Não há verificação periódica do upstream, e o Dependabot ignora o pacote vendorizado. O `pptxgenjs` vendorizado tem hash verificado (`tests/scenarios/artefatos-e-redirecionamentos.mjs`): ok.
- O que falta: uma rotina (ou o Dependabot via issue) para detectar o release corrigido e remover o fork.
- Impacto no negócio: um fork permanente de dependência acumula dívida de segurança.
- Esforço: P
- Prioridade: P3

### M. Branch protection e governança

### QA-56  `main` sem status checks obrigatórios; validação pós-configuração nunca feita
- Status: NAO_INICIADA
- Origem: `docs/BRANCH_PROTECTION.md:14-22` (configuração-alvo) e `:28-34` (5 testes de validação); `docs/branch-protection-pendente.md:56-59`; `plano-reconciliacao…:635-641` (Etapa 46); `plano-workflows…:136` (etapa 69)
- Evidência: a API `branches/main/protection` não tem `required_status_checks`. `required_conversation_resolution: false`. Não há registro dos 5 testes de validação. Já existe o job `sicoob-gate` (`sicoob-ci.yml:119-135`), preparado para ser obrigatório.
- O que falta: tornar obrigatórios *Segurança, contratos e build*, `sicoob-gate`, *Gitleaks*, `bundle-stats` e o smoke E2E (depois da QA-11), e registrar a validação.
- Impacto no negócio: qualquer código com teste quebrado pode ser mesclado e publicado, como já aconteceu (QA-38).
- Esforço: P
- Prioridade: P0

### QA-57  `enforce_admins` desligado e CODEOWNER único: todo merge é bypass de administrador
- Status: BLOQUEADA_EXTERNA
- Origem: `plano-workflows…:137,143` (etapas 70 e 76: "Decidir: segundo revisor humano…")
- Evidência: API protection com `enforce_admins.enabled: false`, `required_approving_review_count: 1` e `require_code_owner_reviews: false`. `.github/CODEOWNERS:9-22` tem só `@adm01-debug`, autor dos PRs, e o GitHub não permite que o autor aprove o próprio PR.
- O que falta: decisão de negócio (segundo revisor humano ou troca da revisão por checks obrigatórios mais CodeRabbit) e depois ligar `enforce_admins`.
- Impacto no negócio: a exigência de revisão existe só no papel, porque o dono contorna sempre.
- Esforço: P
- Prioridade: P1

### QA-58  Ruleset com bypass do Lovable e configurações do repositório pendentes
- Status: NAO_INICIADA
- Origem: `docs/branch-protection-pendente.md:15-43` ("Comando pronto para rodar"); `plano-workflows…:138-142` (etapas 71-75)
- Evidência: API `rulesets` retorna `[]`. O repositório tem `allow_merge_commit: true`, `allow_rebase_merge: true`, `delete_branch_on_merge: false`, `allow_update_branch: false` e `require_last_push_approval: false`.
- O que falta: aplicar o ruleset (decisão sobre o bypass do `lovable-dev[bot]`), permitir só squash, apagar a branch após o merge e exigir branch atualizada.
- Impacto no negócio: o Lovable e outros agentes podem empurrar direto para produção, e branches abandonadas acumulam.
- Esforço: P
- Prioridade: P2

### QA-59  Branch Protection Sentinel só audita depois do fato
- Status: PARCIAL
- Origem: `plano-workflows…:109` (etapa 52)
- Evidência: `branch-protection-sentinel.yml:38-67` só registra no resumo do job e aceita `lovable-dev[bot]`, `gpt-engineer-app[bot]` e `renovate[bot]` (`:49`). Não há auditoria semanal nem issue automática.
- O que falta: converter em auditoria periódica com issue.
- Impacto no negócio: um push direto em produção é descoberto, se for, só por quem olhar o log.
- Esforço: P
- Prioridade: P3

### QA-60  Environments órfãos ou sem proteção e secret duplicado
- Status: PARCIAL
- Origem: `plano-workflows…:115,129,131` (etapas 53, 66 e 68)
- Evidência (API environments): continua existindo `Production – sicoob-csp-202635-1790202890178-XEua` (órfão). `Production`, `Preview` e `copilot` não têm regras. `construction` não tem revisores obrigatórios. `VITE_SUPABASE_ANON_KEY` coexiste com `VITE_SUPABASE_PUBLISHABLE_KEY` (API secrets). Já feito: `SUPABASE_ACCESS_TOKEN` só no environment `construction`.
- O que falta: remover o órfão, exigir revisores em `construction` e eliminar a chave duplicada.
- Impacto no negócio: há confusão sobre qual ambiente é produção e risco de credencial obsoleta em uso.
- Esforço: P
- Prioridade: P3

### N. Observabilidade e alertas

### QA-61  Regras de alerta do Sentry e canais Slack/PagerDuty sem implementação verificável
- Status: BLOQUEADA_EXTERNA
- Origem: `docs/OBSERVABILITY.md:52-64` (6 alertas: 5xx em rajada, 4xx de auth, webhook falhando, bypass de MFA, saturação de IA); `plano-reconciliacao…:651-657` (Etapa 48, todas as caixas `[ ]`)
- Evidência: as regras do Sentry não estão versionadas nem exportadas. `docs/execucao/evidencias/sentry_check_20260917.md` conclui que o `VITE_SENTRY_DSN` não foi confirmado. Não há integração Slack ou PagerDuty no código (só referências de e-mail e outbox).
- O que falta: acesso ao Sentry e ao provedor de deploy para confirmar o DSN, criar as regras e testar o disparo de cada uma.
- Impacto no negócio: um ataque ao MFA ou uma onda de erros 5xx não acorda ninguém.
- Esforço: M
- Prioridade: P1

### QA-62  `error-monitor` não publicado nem agendado; alerta só dentro do app
- Status: NAO_INICIADA
- Origem: `docs/GO_LIVE_CHECKLIST.md:24` ("Monitor de erros (`error-monitor`) ativo e alertando")
- Evidência: `docs/execucao/fechamento-tecnico-2026-10-08.md:45` declara `error-monitor` "não publicável por decisão registrada". `supabase/functions/error-monitor/index.ts:45-66` só grava em `workspace_notifications`. Nenhuma migration agenda `functions/v1/error-monitor`: os crons HTTP existentes são `webhook-dispatcher`, `connections-auto-test`, `sicoob-approval-notifications`, `process-batch-export` e `external-db-bridge`.
- O que falta: decidir o monitor (função ou Sentry), agendar e enviar a canal externo.
- Impacto no negócio: um pico de erros em produção só é percebido quando o cliente reclama.
- Esforço: M
- Prioridade: P1

### QA-63  Gates de observabilidade documentados que não existem ou não rodam
- Status: ORFA
- Origem: `docs/OBSERVABILITY.md:117-124` (§8 "Gates de CI")
- Evidência: "Edge Request-Id Propagation Gate" (`:121`): `scripts/check-edge-request-id-propagation.mjs` existe, mas não está em `ci.yml`. "Client Logging Gate" (`:122`): não existe script. "Webhook Alerts → Sentry… via cron job" (`:124`, `:66-74`): não há cron de `get_webhook_delivery_summary`. A §10 está vazia, só com o placeholder `... keep existing code` (`:166-167`). O único gate real é o `check-edge-structured-logging.mjs` (`ci.yml:92-93`).
- O que falta: ligar o script de Request-Id, criar o gate do cliente e o cron, e corrigir o documento.
- Impacto no negócio: a rastreabilidade de ponta a ponta prometida para diagnóstico de incidentes pode se perder sem aviso.
- Esforço: P
- Prioridade: P2

### QA-64  Alertas operacionais de banco e deploy (Etapa 48)
- Status: NAO_INICIADA
- Origem: `docs/plano-implementacao/plano-reconciliacao-50-etapas.md:651-657` (alertas para `MIGRATIONS_FAILED`, falha de deploy de função, `admin_audit_log_default > 0`, crescimento de `rls_denial_log`, `cron.job_run_details` com `failed`)
- Evidência: não há função, cron nem workflow para essas regras, e as caixas da etapa estão vazias. Não existe `docs/RUNBOOKS/` com resposta por alerta.
- O que falta: as regras, o teste de disparo e o runbook por alerta.
- Impacto no negócio: um cron de verba ou de aprovação pode parar por dias sem ninguém saber.
- Esforço: M
- Prioridade: P2

### O. Backup e DR

### QA-65  Restore nunca testado; backup lógico e runbooks de recuperação não criados
- Status: NAO_INICIADA
- Origem: `docs/DR.md:34-36` ("Simulação semestral de restauração… em `staging`"); `plano-reconciliacao…:106-121` (Etapa 5, todas as caixas `[ ]`) e `:659-664` (Etapa 49: `RESTORE_PITR.md`, `MIGRATIONS.md`, `EDGE_FUNCTION_DEPLOY.md`, `PARTITION_MAINTENANCE.md`, `RLS_INCIDENT.md`); `docs/GO_LIVE_CHECKLIST.md:27`
- Evidência: não há `pg_dump` nem backup em `scripts/` ou `.github/` (busca vazia, exceto no gerador de plano). `docs/RUNBOOKS/` tem só 2 arquivos e não há evidência de restore em `docs/execucao/`. Também não existe `docs/execucao/gate-release-*.md`.
- O que falta: o dump versionado fora do repositório com hash, um restore em projeto descartável com contagens conferidas, os runbooks e o calendário semestral.
- Impacto no negócio: o RTO de 2 h e o RPO de 24 h prometidos não têm nenhuma prova, e em caso de desastre ninguém sabe se a recuperação funciona.
- Esforço: M
- Prioridade: P1

### QA-66  Alegações de DR não verificadas (PITR, versionamento de buckets, replicação)
- Status: BLOQUEADA_EXTERNA
- Origem: `docs/DR.md:14-20`
- Evidência: o documento afirma "PITR ativos para os últimos 7 dias" (`:16`), "Versioning ativo em buckets" (`:19`) e "Replicação regional automática" (`:20`). O PITR é um complemento pago do Supabase e não há captura de tela ou consulta que comprove (Etapa 5, `plano-reconciliacao…:120`, `[ ] PITR confirmado ativo`). O Supabase Storage não oferece versionamento nativo, então a alegação provavelmente está incorreta. Não foi possível consultar o projeto nesta sessão (Management API 401).
- O que falta: confirmação no painel do Supabase (custo e plano) e a correção do `DR.md`.
- Impacto no negócio: a diretoria pode contar com uma proteção de dados que não foi contratada.
- Esforço: P
- Prioridade: P1

---

## Apêndice: lista de testes pulados (arquivo:linha | motivo declarado)

Legenda da última coluna: **[FUNC]** esconde funcionalidade não implementada; **[ENV]** depende de credencial ou ambiente; **[PERM]** é pulado sempre no CI atual; **[DADOS]** depende de dados existirem; **[ÓRFÃO]** nunca é coletado.

| Arquivo:linha | Motivo declarado | Classe |
|---|---|---|
| tests/lib/personalization/adapters/price-response.adapter.test.ts:162 | `it.skip` "ativar quando defaults explícitos para markup ausente forem implementados (passo 4 do plano de fallback)" | [FUNC] |
| tests/rls/personas.test.ts:17 | `describe.skip` sem `TEST_SELLER_PASSWORD`/`TEST_ADMIN_PASSWORD` | [ENV][PERM] |
| tests/rls/no-empty-rls-policies.test.ts:32 | `describe.skip` sem `VITE_SUPABASE_URL`+`SUPABASE_SERVICE_ROLE_KEY` (não fornecidos em nenhum job) | [ENV][PERM] |
| tests/integration/discountApprovalFlow.test.ts:370 | `describe.skip` sem `INTEGRATION_TEST_*` | [ENV][PERM] |
| tests/rls/e2e-cleanup-rate-limit.test.ts:26 | sem `RUN_REMOTE_RLS_TESTS=1` (roda só em e2e.yml:84-92) | [ENV] |
| tests/security/edge-authz-bypass.test.ts:29 | sem `RUN_REMOTE_AUTHZ_TESTS=1` (roda só em e2e.yml:84-92) | [ENV] |
| tests/admin/__strict-ref-gate-smoke.skip.ts:17 | renomeado `.skip.ts`; "só é executado pelo job dedicado `test:strict-ref-smoke`" (inexistente) | [ÓRFÃO] |
| tests/e2e/rbac-dev-technical-routes.test.ts:3 | excluído em vitest.config.ts:32 e fora do testDir do Playwright | [ÓRFÃO] |
| supabase/functions/**/*.test.ts (25 arquivos) | excluídos do Vitest (vitest.config.ts:31) e não chamados por `deno test` (só ci.yml:75) | [ÓRFÃO] |
| e2e/routes/sicoob/logistica-onda-a.spec.ts, order-rbac.spec.ts, orders-list.spec.ts, vendas-access.spec.ts | nenhum projeto em playwright.config.ts casa `routes/sicoob` | [ÓRFÃO] |
| e2e/flows/p0/01-auth-recovery.spec.ts:16, :30, :39 | `test.skip` incondicional, P0 aguardando UX de degradação (README p0:3-4) | [FUNC][PERM] |
| e2e/flows/p0/02-catalog-degraded.spec.ts:11, :21, :30 | idem (cache/banner de catálogo, escrita desabilitada, fallback de vídeo) | [FUNC][PERM] |
| e2e/flows/p0/03-quote-blocked.spec.ts:11, :19, :27 | idem (fila do Bitrix, busca local do CRM, isolamento de token público) | [FUNC][PERM] |
| e2e/flows/p0/04-checkout-blocked.spec.ts:11, :20, :24 | idem (carrinho intacto, rollback de estoque, idempotência de duplo clique; corpos `expect(true)`) | [FUNC][PERM] |
| e2e/flows/p0/05-admin-down.spec.ts:11, :19, :27, :37 | idem (diagnóstico com retry, MCP 401, loop de loading, revogação reativa de chave) | [FUNC][PERM] |
| e2e/flows/pwa-performance.spec.ts:16 | "O servidor E2E de desenvolvimento não registra Service Worker" (src/main.tsx:120-122 desregistra em DEV) | [PERM] |
| e2e/flows/p0/08-password-recovery.spec.ts:154 | "link de esqueceu-senha não exposto na UI" (o link existe em src/pages/Auth.tsx:390, skip morto) | [DADOS] |
| e2e/flows/21-feature-matrix.spec.ts:19, :30 | "Catálogo vazio neste ambiente" | [DADOS] |
| e2e/flows/12-cart-checkout.spec.ts:105, :108, :168, :191 | "Sem empresas cadastradas…", "Não foi possível adicionar produto", "Sem item/carrinho disponível" | [DADOS] |
| e2e/flows/22-header-sticky.spec.ts:124, :140 | rota redirecionou para /login (papel insuficiente / admin sem papel dev) | [ENV] |
| e2e/flows/23-scroll-to-top-button.spec.ts:43, :123, :182 | rota redirecionou para /login | [ENV] |
| e2e/flows/10-admin.spec.ts:14 | `E2E_USER_IS_ADMIN` definido (bloqueio não aplicável) | [ENV] |
| e2e/flows/20-all-features-smoke.spec.ts:337 | `VITE_SUPABASE_*` ausentes | [ENV] |
| e2e/flows/p0/06-auth-lifecycle.spec.ts:30, :53, :87, :101 | credenciais `E2E_USER_*` ausentes | [ENV] |
| e2e/flows/p0/07-rls-enforcement.spec.ts:70, :74 | `VITE_SUPABASE_*` / `E2E_USER_*` ausentes | [ENV] |
| e2e/editor-permissions.spec.ts:98 | configuração pública do Supabase ausente | [ENV] |
| e2e/audit-validation.spec.ts:65 | `VITE_SUPABASE_*` ausentes | [ENV] |
| e2e/admin-conexoes-zone-collapse.spec.ts:43, :50, :56 | rota protegida / sessão admin indisponível / sem papel dev | [ENV] |
| e2e/admin-conexoes-credentials-active-products.spec.ts:35, :41 | rota protegida / sem papel dev | [ENV] |
| e2e/helpers/auth.ts:250 | credenciais `E2E_<PAPEL>_EMAIL/PASSWORD` ausentes (helper usado por vários specs) | [ENV] |
| e2e/fixtures/test-base.ts:105, :110 | `requireAuth`/`requireAdmin` sem credenciais (helper) | [ENV] |

Testes que não estão pulados mas passam sem testar nada (`expect(true).toBe(true)` ou asserção engolida): `e2e/flows/21-feature-matrix.spec.ts:41-43`, `tests/rls/critical-tables-rls.test.ts:310,316`, `tests/components/products/StatsPopover.test.tsx:852`, `tests/hooks/useIPValidation.test.ts:79`, `tests/stock-performance.test.ts:737`.

Os testes que **escondem funcionalidade não implementada** são: os 16 P0 de `e2e/flows/p0/01..05` (UX de degradação e resiliência), o `price-response.adapter.test.ts:162` (default de markup) e os 4 specs órfãos de `e2e/routes/sicoob/`, que documentam gaps de RBAC conhecidos (`logistica-onda-a.spec.ts:9-16`).

## Fontes lidas

- Workflows: `.github/workflows/{ci,e2e,sicoob-ci,security,codeql,lighthouse,bundle-check,security-compliance,migration-ledger-drift,db-performance-audit,apply-sicoob-migrations,deploy-sicoob-functions,branch-protection-sentinel}.yml`
- `.github/dependabot.yml`, `.github/CODEOWNERS`, `.github/codeql/codeql-config.yml`, `.github/ISSUE_TEMPLATE/*`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/pull_request_template.md`
- `package.json`, `vitest.config.ts`, `playwright.config.ts`, `playwright.pwa.config.ts`, `.lighthouserc.cjs`, `.eslint-baseline.json`, `.typecheck-baseline.json`, `.gitleaks.toml`, `.gitleaksignore`, `.coderabbit.yaml`, `vercel.json`, `deno.json`, `.husky/pre-commit`, `.husky/pre-push`, `.env.e2e.example`, `.env.production.example`, `.gitignore`, `AGENTS.md`, `SICOOB_TESTING.md`
- `src/test/setup.ts`, `tests/setup.ts`, `tests/setup-ref-warning-capture.ts`; amostras de cerca de 40 arquivos de `tests/**` (análise automática dos 424 arquivos de teste); `tests/scenarios/*`; `tests/load/basic-smoke.js`
- `e2e/**` (todos os specs listados; leitura de `p0/*`, `routes/sicoob/*`, `flows/21`, `22`, `23`, `12`, `10`, `pwa-performance`, `fixtures/test-base.ts`, `helpers/auth.ts`, `routes/_catalog.ts`, `routes/_shared.ts`, READMEs)
- `scripts/**`: inventário completo (análise de consumidores via `<scripts-da-auditoria>/analisar.mjs`); leitura de `check-critical-test-skip-budget.mjs`, `consolidate-console-snapshot.mjs`, `check-npm-audit.mjs`, `check-codeql-sarif.mjs`, `qa/check-bundle-budget.mjs`, `qa/login-browser.mjs`, `qa/demo-browser.mjs`, cabeçalhos de `qa/simular-*.py`, `enterprise-dossier-builder.mjs`, `generate-audit-dossier.mjs`, `generate-enterprise-report.mjs`, `audit-export.mjs`, `validate-audit-links.mjs`, `test-audit-scripts.mjs`, `md-to-pdf-stub.mjs`, `test-rls-compliance.mjs`, `load-test.mjs`, `db/check-runtime-refs.mjs`, `db/.inventory-cache.json`
- `infra/README.md`, `infra/modules/cloudflare/main.tf`, `infrastructure/github-runner/docker-compose.yml`, `vendor/*/proveniencia.json`
- `public/sw.js`, `public/manifest.json`, `public/reports/*`, `public/AUDIT_ENTERPRISE_FINAL.md`, `reports/*`, `src/main.tsx`, `src/routes/config/*.ts`, `supabase/functions/error-monitor/index.ts`, cron em `supabase/migrations/*`
- Docs: `docs/TESTING.md`, `docs/E2E_SMOKE_COVERAGE.md`, `docs/FIXTURES_E2E_POR_PAPEL.md`, `docs/CASOS_TESTE_E2E_POR_PAPEL.md`, `docs/testing/CONTRACT_TESTS_PACT.md`, `docs/testing/STRICT_REF_WARNING_GATE.md`, `docs/branch-protection-pendente.md`, `docs/BRANCH_PROTECTION.md`, `docs/CI_CD.md`, `docs/DR.md`, `docs/OBSERVABILITY.md`, `docs/ACCESSIBILITY.md`, `docs/MOBILE.md`, `docs/GO_LIVE_CHECKLIST.md`, `docs/secrets.md`, `docs/RUNBOOKS/CREDENTIAL_ROTATION.md`, `docs/plano-implementacao/plano-workflows-github-100-etapas-20260927.md`, `docs/plano-implementacao/plano-reconciliacao-50-etapas.md` (etapas 5 e 46-50), `docs/execucao/revisao-plano-20261001/workflows-100.md`, `docs/execucao/fechamento-tecnico-2026-10-08.md`, `docs/execucao/evidencias/sentry_check_20260917.md`
- API do GitHub (somente leitura): secrets (19 nomes), secrets do environment `construction`, secrets do Dependabot (0), variables (0), branch protection da `main`, rulesets (`[]`), environments (5), runners self-hosted (3), labels, permissões de Actions, status de alerts e security updates do Dependabot, configurações do repositório, execuções de workflows (main, PR #98 e PRs de 09-11/10, histórico do `e2e.yml` e do `db-performance-audit.yml`)
