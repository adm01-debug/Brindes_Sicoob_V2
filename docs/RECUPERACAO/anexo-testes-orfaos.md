# Anexo — testes criados em branches e nunca incorporados

Medição de 25/11/2026 sobre `origin/main` em `8747cf212`.

## Como foi medido

Para cada uma das 133 branches locais (todas exceto `main`):

1. `git merge-base origin/main <branch>` para achar a base;
2. `git diff --name-only --diff-filter=A <base>..<branch>` para listar os arquivos **criados** naquela branch (não herdados da base);
3. `git ls-tree -r --name-only origin/main` para descartar o que já existe em `main`.

Resultado: **178 arquivos criados em branches que não existem em `main`** — 82 sob `tests/` e `e2e/`, e o restante em `scripts/`, `docs/` e `supabase/`.

Os 70 arquivos `*.test.ts(x)` foram copiados para um worktree limpo de `main` e executados com `vitest run --reporter=json`. Resultado:

| veredito | arquivos | significado |
| --- | --- | --- |
| `passa em main` | 6 | o teste passa sem nenhuma alteração — cobertura perdida, custo zero para recuperar |
| `modulo-ausente` | 10 | o módulo testado não existe em `main` — o teste só roda se o módulo for recuperado |
| `export-ausente` | 19 | o módulo existe, mas não exporta a função que o teste importa |
| `comportamento-divergente` | 36 | o módulo existe e roda, mas o comportamento/texto/estado esperado não está em `main` |

## Vereditos por classe

**`passa em main` (6)** — recuperados na PR #444. São ganho puro: passam hoje, sem tocar em código de produção.

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
| `tests/pages/GestorCompras.metrics.test.tsx` | `?` | passa em `main` | recuperado na PR #444 |
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
