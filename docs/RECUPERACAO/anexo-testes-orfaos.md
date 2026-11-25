# Anexo — testes criados em branches e nunca incorporados

Medição de 25/11/2026 sobre `origin/main` em `8747cf212`.

## Como foi medido

Para cada uma das 133 branches locais (todas exceto `main`):

1. `git merge-base origin/main <branch>` para achar a base;
2. `git diff --name-only --diff-filter=A <base>..<branch>` para listar os arquivos **criados** naquela branch (não herdados da base);
3. `git ls-tree -r --name-only origin/main` para descartar o que já existe em `main`.

Resultado: **178 arquivos criados em branches que não existem em `main`** — 82 sob `tests/` e `e2e/`, e o restante em `scripts/`, `docs/` e `supabase/`.

Os 70 arquivos `*.test.ts(x)` órfãos foram copiados para um worktree limpo de `main` e executados com `vitest run --reporter=json`. Resultado:

| veredito | arquivos | significado |
| --- | --- | --- |
| `passa em main` | 5 | o teste passa sem nenhuma alteração — cobertura perdida, custo zero para recuperar |
| `modulo-ausente` | 10 | o módulo testado não existe em `main` — o teste só roda se o módulo for recuperado |
| `export-ausente` | 19 | o módulo existe, mas não exporta a função que o teste importa |
| `comportamento-divergente` | 36 | o módulo existe e roda, mas o comportamento/texto/estado esperado não está em `main` |

## Vereditos por classe

**`passa em main` (5)** — passam hoje sem tocar em código de produção. Recuperados 3 na PR #444 (`catalog-readonly-rpc.test.ts`, `useCategoryRanking.errors.test.tsx`, `useClientBI.real-data.test.tsx` — 10 testes); 2 foram descartados na revisão:

- `tests/edge-functions/health-check.liveness.test.ts` repete, teste por teste, os dois primeiros casos de `tests/edge-functions/public-health-and-bi-share.test.ts` (já na `main`);
- `tests/e2e/user-credentials.test.ts` + `e2e/helpers/user-credentials.ts` validam um helper sem consumidor, enquanto o setup real (`e2e/fixtures/auth.setup.ts`) usa o par `E2E_USER_*` — o teste passaria sem detectar e-mail e senha de contas diferentes.

`tests/edge-functions/catalog-readonly-rpc.test.ts` foi mantido com uma correção: importa `CATALOG_ORIGIN` em vez de fixar a URL do catálogo.

**`modulo-ausente` (10)** — dois grupos distintos:

- *Pilha de navegação/guarda* (`@/components/navigation/NavigationBlockerBridge`, `@/stores/useNavigationGuardStore`, `@/lib/navigation/filter-query`, `@/lib/navigation/overlay-registry`, `@/lib/error-reporter-bootstrap`, `@/pages/kit-builder/useKitProductParam`): é exatamente o conjunto já registrado como PERDIDO em `branches.md` (linhas 277-283) e em `capacidades.md`. Recuperar exige trocar `BrowserRouter` por `createBrowserRouter` em `src/App.tsx` — mudança de bootstrap do portal inteiro, decisão de arquitetura pendente de autorização (regra 8).
- *Ferramentas de CI/QA* (`scripts/health-check-contract.mjs`, `scripts/qa/validate-e2e-project.mjs`, `scripts/validate-e2e-supabase-target.mjs`/variantes, `scripts/verify-supabase-function-deploy.mjs`, `scripts/qa/simular-search-analytics-legado.py`): não têm equivalente com o mesmo nome em `main`; o gate de e2e da `main` vive em `.github/workflows/e2e.yml` e a publicação de funções é verificada por `scripts/ci/verify-supabase-functions-published.mjs`. Não foram incorporadas para não introduzir script sem chamador.

**`export-ausente` (19)** — o agente extraiu funções puras do componente/hook para poder testá-las (`mapSimulatorPersonalization`, `applyExistingQuote`, `buildQuoteDraftData`, `calculatePurchasingMetrics`, `deriveProductIntelligenceBadges`, `buildSeasonalityResult`, `buildKitPayload`, `favoriteListsQueryKey`, `shouldShowProductRiskLoading`, `buildExpertRequestBody`, `resolveBiShareSecrets`, `credentialsForRole`, `selectAssistantRequestMessages`, `readAssistantSse`, `useLoadedQuote`, `useAllCrmCompanies`, `useCrmClientsPage`, `record` do `useNavigationStore`). O comportamento continua existindo em `main`, mas não sob a forma exportada que o teste espera. Incorporar significaria refatorar produção para satisfazer o teste — sem ganho de negócio; o teste teria de ser reescrito contra a API atual.

**`comportamento-divergente` (36)** — **é onde está a perda real**: estados de erro, vazio e cópia que existiam na branch e não existem em `main`. Exemplos com o texto que o teste procura:

- `FinancialPanel` → "Margem não calculada"; `OrderBudgetIntelligence` → "Verba indisponível"
- `operational-data-truth` → "Sem movimentações de mercado no período"
- `MarketIntelligenceChart.stale-cache` → "Exibindo o último gráfico"
- `role="alert"` ausente em `ProductDetail` (inteligência), `analytics-query-errors` e `IntelligenceBadges`
- `PublicFavoriteListPage` → "Seleção recuperada"; `AIMockupAssistant` → botão "Abrir assistente"
- BI: sinalizador de dado insuficiente (`useClientCategoryAffinity`, `useClientSeasonality`, `useIndustryTrends`, `useClientBI.no-fallback`)

Esses 36 não foram recuperados nesta rodada: cada um exige ler o componente na branch, entender se o estado foi deliberadamente removido depois ou nunca chegou, e decidir entre reimplementar ou descartar. Ficam registrados como a fila de recuperação de UX.

## Inventário arquivo por arquivo

| arquivo | origem | veredito | detalhe |
| --- | --- | --- | --- |
| `tests/e2e/user-credentials.test.ts` | `fix/hermes-docs-all-20261028` | passa em `main` | recuperado na PR #444 |
| `tests/edge-functions/catalog-readonly-rpc.test.ts` | `fix/quote-price-authority-311333` | passa em `main` | recuperado na PR #444 |
| `tests/edge-functions/health-check.liveness.test.ts` | `fix/hermes-bi-share-hardening-20261028` | passa em `main` | recuperado na PR #444 |
| `tests/hooks/useCategoryRanking.errors.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | passa em `main` | recuperado na PR #444 |
| `tests/hooks/useClientBI.real-data.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | passa em `main` | recuperado na PR #444 |
| `tests/edge-functions/health-check-consumers.test.ts` | `fix/hermes-bi-share-hardening-20261028` | modulo-ausente | ../../scripts/health-check-contract.mjs |
| `tests/lib/error-reporter-bootstrap.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | modulo-ausente | @/lib/error-reporter-bootstrap |
| `tests/lib/navigation/filter-query.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | modulo-ausente | @/lib/navigation/filter-query |
| `tests/lib/navigation/overlay-registry.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | modulo-ausente | @/lib/navigation/overlay-registry |
| `tests/navigation/NavigationBlockerBridge.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | modulo-ausente | @/components/navigation/NavigationBlockerBridge |
| `tests/pages/kit-builder/useKitProductParam.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | modulo-ausente | @/pages/kit-builder/useKitProductParam |
| `tests/scripts/validate-e2e-project.test.ts` | `fix/hermes-20261029-budget-no-fallback` | modulo-ausente | ../../scripts/qa/validate-e2e-project.mjs |
| `tests/scripts/validate-e2e-supabase-target.test.ts` | `fix/hermes-bi-share-hardening-20261028` | modulo-ausente | ../../scripts/validate-e2e-supabase-target.mjs |
| `tests/scripts/verify-supabase-function-deploy.test.ts` | `fix/hermes-20261029-budget-no-fallback` | modulo-ausente | ../../scripts/verify-supabase-function-deploy.mjs |
| `tests/stores/useNavigationGuardStore.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | modulo-ausente | @/stores/useNavigationGuardStore |
| `tests/components/AIChat.message-limit.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | export-ausente | selectAssistantRequestMessages |
| `tests/components/AIChat.sse.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | export-ausente | readAssistantSse |
| `tests/components/expert/useExpertChat.request-limits.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | export-ausente | buildExpertRequestBody |
| `tests/components/inventory/ProductRiskDetail.loading.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | export-ausente | shouldShowProductRiskLoading |
| `tests/e2e/auth-role-contract.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | export-ausente | credentialsForRole |
| `tests/edge-functions/bi-share-dossier.contract.test.ts` | `fix/hermes-bi-share-hardening-20261028` | export-ausente | resolveBiShareSecrets |
| `tests/hooks/useBIDossierExport.errors.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | export-ausente | mock sem o export esperado |
| `tests/hooks/useClientSeasonality.no-fallback.test.ts` | `fix/hermes-20261029-budget-no-fallback` | export-ausente | buildSeasonalityResult |
| `tests/hooks/useCustomKitPersistence-concurrency.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | export-ausente | select |
| `tests/hooks/useCustomKitPersistence.status.test.ts` | `fix/ci-workflows-h369570` | export-ausente | buildKitPayload |
| `tests/hooks/useFavoriteListsQueryKeys.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | export-ausente | favoriteListsQueryKey |
| `tests/hooks/useProductIntelligenceBadges.test.ts` | `fix/sicoob-intelligence-truth-20260924` | export-ausente | deriveProductIntelligenceBadges |
| `tests/hooks/useQuoteInitialization.mapping.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | export-ausente | mapSimulatorPersonalization |
| `tests/hooks/useQuoteInitialization.reset.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | export-ausente | applyExistingQuote |
| `tests/pages/ClientsPage.pagination.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | export-ausente | mock sem o export esperado |
| `tests/pages/GestorCompras.metrics.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | export-ausente | calculatePurchasingMetrics |
| `tests/pages/QuoteBuilderPage.behavior.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | export-ausente | buildQuoteDraftData |
| `tests/pages/useQuoteViewData.loading.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | export-ausente | useLoadedQuote |
| `tests/stores/useNavigationStore.history.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | export-ausente | record |
| `tests/components/AIMockupAssistant.history.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/components/BackButton.overlay-pointer.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/components/FinancialPanel.test.tsx` | `fix/hermes-20261029-budget-no-fallback` | comportamento-divergente |  |
| `tests/components/OrderBudgetIntelligence.no-fallback.test.tsx` | `fix/hermes-20261029-budget-no-fallback` | comportamento-divergente |  |
| `tests/components/common/IntelligenceBadges.errors.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/components/favorites/FavoritesClientPicker.directory.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/components/intelligence/MarketIntelligenceChart.stale-cache.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/components/intelligence/analytics-query-errors.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/components/operational-data-truth.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/components/pricing/QuantityComparisonTable.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/components/pricing/simulator/ProductSearch.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/components/quotes/QuoteProductSelector.concurrent-save.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/hooks/bi/useClientCategoryAffinity.test.tsx` | `fix/ci-workflows-h369570` | comportamento-divergente |  |
| `tests/hooks/bi/useClientSeasonality.test.tsx` | `fix/ci-workflows-h369570` | comportamento-divergente |  |
| `tests/hooks/bi/useIndustryTrends.test.tsx` | `fix/ci-workflows-h369570` | comportamento-divergente |  |
| `tests/hooks/useClientBI.no-fallback.test.ts` | `fix/hermes-20261029-budget-no-fallback` | comportamento-divergente |  |
| `tests/hooks/useCrmClientsPage.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/hooks/useCrmCompanies.pagination.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/hooks/useExternalCategoriesQuery.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/hooks/useIndustryCategoryTrends.errors.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/hooks/useIndustryTrends.errors.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/hooks/useProductIntelligenceBadges.no-fallback.test.ts` | `fix/hermes-20261029-budget-no-fallback` | comportamento-divergente |  |
| `tests/hooks/useQuoteInitialization.loading.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/lib/sales-goal-schema.test.ts` | `fix/ci-workflows-h369570` | comportamento-divergente |  |
| `tests/lib/uxMetrics.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/migrations/search-analytics-reconciliation.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/migrations/storage-acl-hardening.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/pages/GestorCompras.error-state.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/pages/ProductDetail.intelligence-errors.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/pages/PublicFavoriteListPage.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/pages/is-demo-mode.test.ts` | `fix/hermes-20261029-budget-no-fallback` | comportamento-divergente |  |
| `tests/scripts/e2e-workflow-preflight.test.ts` | `fix/ci-workflows-h369570` | comportamento-divergente |  |
| `tests/scripts/healthcheck.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/scripts/scheduled-edge-deploy-parity.test.ts` | `fix/hermes-h393620-inteligencia-real` | comportamento-divergente |  |
| `tests/scripts/scheduled-report-seller-scope.test.ts` | `fix/hermes-h393620-inteligencia-real` | comportamento-divergente |  |
| `tests/unit/e2e-cleanup-client.test.ts` | `fix/ci-workflows-h369570` | comportamento-divergente |  |

## Reavaliação dos 36 `comportamento-divergente`

Os vereditos acima foram medidos pela execução dos testes contra a `main`. Esta seção registra a
reavaliação feita lendo o código de produção atual: nem todo "divergente" é perda — parte é desenho
que a `main` substituiu por outro melhor, e essa parte não deve ser reintroduzida.

### Recuperado em PR aberta (ainda não está na `main`)

Estes dois itens já têm código e teste prontos, mas continuam fora da `main` até o merge: pela regra
de fechamento deste diretório, a branch de origem só pode ser fechada depois que o merge entrar.

| Teste órfão | PR |
| --- | --- |
| `tests/hooks/bi/useIndustryTrends.test.tsx` | [#446](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/446) — amostra mínima de 3 empresas com orçamento no ramo, `trend: null` para agregado de 90 dias, janela de 60 linhas no RPC + corte de 10 depois do filtro. |
| `tests/components/intelligence/analytics-query-errors.test.tsx` | [#445](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/445) — falha de consulta deixa de virar funil zerado; alerta, retentativa e contagens preservadas. |

### Já incorporado pela `main` por outra via (não recuperar)

| Teste órfão | Evidência do estado atual |
| --- | --- |
| `tests/components/FinancialPanel.test.tsx` | `src/components/orders/FinancialPanel.tsx:40` já diz "Margem: não calculada neste pedido" — o comportamento (não inventar margem) está preservado; só o texto do teste é de uma versão anterior. |
| `tests/components/OrderBudgetIntelligence.no-fallback.test.tsx` | `src/components/sicoob/orders/OrderBudgetIntelligence.tsx:77` (`resolveBudgetState`) tem o estado `unconfigured`, o título "Análise indisponível" e o texto "A verba está cadastrada com valor zero; o impacto percentual não pode ser calculado". `src/lib/sicoob/orderBudgetProjection.ts:81,94` evita divisão por zero (`allocatedBudget <= 0` → `null`; `=== 0` → `100`). A `main` é mais completa que a versão testada. |
| `tests/components/AIMockupAssistant.history.test.tsx` | `src/components/ai/AIMockupAssistant.tsx:36` já tem a entrada com outro nome acessível (`aria-label="Abrir Matheus, assistente de layouts"`) e o painel fica montado depois de aberto (`hasOpened`, classes `hidden` em `:184-186`), então a conversa sobrevive a fechar/reabrir. O texto literal do teste é de uma versão anterior do botão. |

### Perda confirmada por ausência de código (fila de recuperação)

Nenhum destes textos/estados existe em `src/` da `main` hoje. Cada linha é trabalho de outro agente
que precisa ser reintegrado (e testado) antes de a branch de origem ser fechada.

| Teste órfão | Estado que falta na `main` |
| --- | --- |
| `tests/components/intelligence/MarketIntelligenceChart.stale-cache.test.tsx` | Aviso "Exibindo o último gráfico disponível" quando o `refetch` falha com cache em mãos: hoje a tela não distingue dado velho de dado atual. |
| `tests/components/common/IntelligenceBadges.errors.test.tsx` | Aviso de falha parcial ("Não foi possível atualizar todos os…") nos selos de inteligência. |
| `tests/pages/ProductDetail.intelligence-errors.test.tsx` | `role="alert"` + "Tentar novamente" nos indicadores; texto "dados disponíveis continuam exibidos"; `role="status"` para o vazio confirmado. `src/pages/ProductDetail.tsx` hoje não consome `useProductIntelligenceData`/`useStockVelocity` nesse nível. |
| `tests/pages/PublicFavoriteListPage.test.tsx` | Confirmação "Seleção recuperada" ao restaurar a seleção em memória depois de erro. |
| `tests/pages/GestorCompras.error-state.test.tsx` | O teste é de outra árvore de página: abas com `OrdersKanbanPage`/`OrdersPage` e três consultas com um alerta único e retentativa que repete **só** as consultas afetadas. A `main` tem alerta + retentativa apenas para `useManagerDashboardStats` (`src/components/sicoob/GestorComprasMetrics.tsx:125-136`); `MetricasDaFila` (`:80-85`) mostra a falha de `usePurchasingMetrics` **sem** retentativa. Faltam: (a) **retentativa seletiva das métricas da fila**; (b) **falha das abas** — `src/components/orders/ApprovalKanbanBoard.tsx:29` lê `useOrdersList` sem `isError` e `src/pages/OrdersPage.tsx:128` devolve `OrdersEmptyState`, tornando consulta falha indistinguível de "sem pedidos". |
| `tests/hooks/bi/useClientSeasonality.test.tsx` | Amostra setorial insuficiente no mapa de calor: `resolveSeasonalityResult` recebe `companiesCount` (`src/hooks/bi/useClientSeasonality.ts`) e **não usa**; um setor com 1 empresa é apresentado como mercado. Diferente de `useIndustryTrends`, que passou a ter essa regra na #446. |

### Medido e descartado

- `fix/hermes-20261029-budget-no-fallback` — a versão de `OrderBudgetIntelligence`/`FinancialPanel` desta
  branch é anterior à evolução da `main`; reaproveitar o teste exigiria regredir a tela.
- `claude/chore-manutencao-261125-0835-f897449f` — churn de estilo (`"` → `'`), sem mudança de comportamento.

### Ainda sem veredito (25 de 36)

A reavaliação acima cobre 11 dos 36 testes `comportamento-divergente`. Os 25 abaixo continuam
**pendentes**: a branch de origem de cada um só pode ser fechada depois que a linha ganhar veredito.

| Teste órfão |
| --- |
| `tests/components/BackButton.overlay-pointer.test.tsx` |
| `tests/components/favorites/FavoritesClientPicker.directory.test.tsx` |
| `tests/components/operational-data-truth.test.tsx` |
| `tests/components/pricing/QuantityComparisonTable.test.tsx` |
| `tests/components/pricing/simulator/ProductSearch.test.tsx` |
| `tests/components/quotes/QuoteProductSelector.concurrent-save.test.tsx` |
| `tests/hooks/bi/useClientCategoryAffinity.test.tsx` |
| `tests/hooks/useClientBI.no-fallback.test.ts` |
| `tests/hooks/useCrmClientsPage.test.ts` |
| `tests/hooks/useCrmCompanies.pagination.test.ts` |
| `tests/hooks/useExternalCategoriesQuery.test.ts` |
| `tests/hooks/useIndustryCategoryTrends.errors.test.tsx` |
| `tests/hooks/useIndustryTrends.errors.test.ts` |
| `tests/hooks/useProductIntelligenceBadges.no-fallback.test.ts` |
| `tests/hooks/useQuoteInitialization.loading.test.tsx` |
| `tests/lib/sales-goal-schema.test.ts` |
| `tests/lib/uxMetrics.test.ts` |
| `tests/migrations/search-analytics-reconciliation.test.ts` |
| `tests/migrations/storage-acl-hardening.test.ts` |
| `tests/pages/is-demo-mode.test.ts` |
| `tests/scripts/e2e-workflow-preflight.test.ts` |
| `tests/scripts/healthcheck.test.ts` |
| `tests/scripts/scheduled-edge-deploy-parity.test.ts` |
| `tests/scripts/scheduled-report-seller-scope.test.ts` |
| `tests/unit/e2e-cleanup-client.test.ts` |
