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
| `tests/components/intelligence/MarketIntelligenceChart.stale-cache.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente | Recuperado em [#450](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/450). |
| `tests/components/intelligence/analytics-query-errors.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/components/operational-data-truth.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/components/pricing/QuantityComparisonTable.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/components/pricing/simulator/ProductSearch.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/components/quotes/QuoteProductSelector.concurrent-save.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/hooks/bi/useClientCategoryAffinity.test.tsx` | `fix/ci-workflows-h369570` | comportamento-divergente |  |
| `tests/hooks/bi/useClientSeasonality.test.tsx` | `fix/ci-workflows-h369570` | comportamento-divergente | Recuperado em [#449](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/449). |
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
| `tests/pages/GestorCompras.error-state.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente | recuperado na #452 |
| `tests/pages/ProductDetail.intelligence-errors.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/pages/PublicFavoriteListPage.test.tsx` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente | Recuperado em [#451](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/451). |
| `tests/pages/is-demo-mode.test.ts` | `fix/hermes-20261029-budget-no-fallback` | comportamento-divergente |  |
| `tests/scripts/e2e-workflow-preflight.test.ts` | `fix/ci-workflows-h369570` | comportamento-divergente |  |
| `tests/scripts/healthcheck.test.ts` | `claude/fix-prod-cors-audit-261118-1034` | comportamento-divergente |  |
| `tests/scripts/scheduled-edge-deploy-parity.test.ts` | `fix/hermes-h393620-inteligencia-real` | comportamento-divergente |  |
| `tests/scripts/scheduled-report-seller-scope.test.ts` | `fix/hermes-h393620-inteligencia-real` | comportamento-divergente |  |
| `tests/unit/e2e-cleanup-client.test.ts` | `fix/ci-workflows-h369570` | comportamento-divergente |  |

Nota de `tests/lib/sales-goal-schema.test.ts`: A correção é do contrato do esquema: `salesGoalSchema` é exportado por `src/lib/validations/index.ts:10-11` e **nenhum formulário o consome hoje** (a tela de metas salva por `useSalesGoals`), então este item vale como catraca de API, não como correção de tela.

## Reavaliação dos 36 `comportamento-divergente`

Os vereditos acima foram medidos pela execução dos testes contra a `main`. Esta seção registra a
reavaliação feita lendo o código de produção atual: nem todo "divergente" é perda — parte é desenho
que a `main` substituiu por outro melhor, e essa parte não deve ser reintroduzida.

### Recuperado em PR aberta (ainda não está na `main`)

| Teste órfão | PR |
| --- | --- |
| `tests/hooks/bi/useClientSeasonality.test.tsx` | [#449](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/449) — setor com menos de 3 empresas, ou sem nenhum mês com orçamento, não vira amostra de mercado; a linha do setor é zerada e o selo do mapa de calor avisa `setor sem amostra`. |
| `tests/components/common/IntelligenceBadges.errors.test.tsx` | [#448](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/448) — falha parcial nos selos de inteligência: alerta com retentativa e dados já medidos preservados. |
| `tests/pages/ProductDetail.intelligence-errors.test.tsx` | [#448](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/448) — `role="alert"` + "Tentar novamente" nos indicadores e `role="status"` para o vazio confirmado. |
| `tests/pages/GestorCompras.error-state.test.tsx` | [#452](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/452) — a árvore de página do teste órfão não existe mais, mas o comportamento faltava: falha de consulta agora se distingue de fila vazia, com retentativa, nas métricas do gestor de compras, no board de aprovação e em `OrdersPage`. |

Os itens abaixo já têm código e teste prontos, mas continuam fora da `main` até o merge: pela regra
de fechamento deste diretório, a branch de origem só pode ser fechada depois que o merge entrar.

| Teste órfão | PR |
| --- | --- |
| `tests/hooks/bi/useIndustryTrends.test.tsx` | [#446](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/446) — amostra mínima de 3 empresas com orçamento no ramo, `trend: null` para agregado de 90 dias, janela de 60 linhas no RPC + corte de 10 depois do filtro. |
| `tests/pages/PublicFavoriteListPage.test.tsx` | [#451](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/451) — a lista pública herda a política de retry do `QueryClient` (`src/lib/query-config.ts:80-96`): falha transitória deixa de derrubar o link compartilhado. |
| `tests/components/intelligence/analytics-query-errors.test.tsx` | [#445](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/445) — falha de consulta deixa de virar funil zerado; alerta, retentativa e contagens preservadas. |
| `tests/components/intelligence/MarketIntelligenceChart.stale-cache.test.tsx` | [#450](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/450) — falha de atualização com cache em mãos não some: aviso `role="status"` "Exibindo o último gráfico disponível" + **Tentar novamente**, gráfico mantido. |

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
| `tests/components/quotes/QuoteProductSelector.concurrent-save.test.tsx` | Faltava a guarda de não-edição no seletor de produtos (`canEdit`/`open`): com o diálogo aberto, o mesmo item podia ser somado duas vezes. Recuperado na PR #454 com 3 casos, incluindo o fechamento quando o diálogo já estava aberto. |

### Medido e descartado

- `fix/hermes-20261029-budget-no-fallback` — a versão de `OrderBudgetIntelligence`/`FinancialPanel` desta
  branch é anterior à evolução da `main`; reaproveitar o teste exigiria regredir a tela.
- `claude/chore-manutencao-261125-0835-f897449f` — churn de estilo (`"` → `'`), sem mudança de comportamento.

### Recuperado nesta leva (PR #453)

Os três tinham lacuna real, curta e verificada: cada um entrou com o teste órfão original, rodando verde.

| Teste órfão | O que faltava na `main` |
| --- | --- |
| `tests/lib/sales-goal-schema.test.ts` | Zod 4 aplica `error` a **todo** erro do enum: escolher um valor inválido mostrava "Tipo de meta é obrigatório" em vez da mensagem de valor inválido. Agora o texto de obrigatório só aparece quando o campo está ausente. |
| `tests/pages/is-demo-mode.test.ts` | Só `?demo=1` ativava o modo demonstração; `?demo=true` era ignorado. |
| `tests/lib/uxMetrics.test.ts` | Não existia `resetUxMetrics()`. Agora o logout limpa os contadores (`src/contexts/AuthContext.tsx`, `signOut`) — os KPIs de navegação de quem saiu não entram na conta do próximo login na mesma aba — e o teste de `AuthContext` mede isso. |

### Lacuna confirmada — fila de recuperação (código inexistente na `main`)

Medido: o teste roda na `main` e a API/comportamento que ele exige não existe. Precisa de PR próprio.

| Teste órfão | O que falta (evidência do que não existe) |
| --- | --- |
| `tests/components/pricing/simulator/ProductSearch.test.tsx` | `priceAvailable` não existe em `src/` (`grep -rn priceAvailable src` = 0) e `ProductSearch` mapeia `price: p.sale_price ?? 0` (`:103`): produto com preço 0, negativo, NaN ou infinito entra no simulador como preço zero sem aviso. |
| `tests/hooks/bi/useClientCategoryAffinity.test.tsx` | O hook devolve `isMock`/contagens, mas nenhum `status` (`insufficient`/`available`/`unavailable`): afinidade de categoria calculada com amostra pequena é apresentada como se fosse do mercado. Mesma regra que a #449 aplicou à sazonalidade. |
| `tests/hooks/useCrmCompanies.pagination.test.ts` | `useAllCrmCompanies` não existe (`grep export src/hooks/useCrmCompanies.ts`): não há busca paginada de **toda** a base de clientes com ordenação estável nem falha explícita ao passar de 10.000 registros. |
| `tests/hooks/useCrmClientsPage.test.ts` | `useCrmClientsPage` também não existe e não há contagem exata do filtrado: a tela de Clientes consome o **diretório paginado** `useCrmCompanies({ is_customer: true })` (`src/pages/ClientsPage.tsx:112`), que pagina o diretório do portal (`src/hooks/useCrmCompanies.ts:35-49`, `DIRECTORY_PAGE = 100` / `DIRECTORY_CAP = 200`) e por isso também trava em 200 linhas. O indicador recebe `clients.length` (`src/pages/ClientsPage.tsx:127`) **antes** do filtro local de busca (`:114-125`), então nem é o total da base nem o total filtrado. |
| `tests/components/BackButton.overlay-pointer.test.tsx` | Não há mecanismo de "navigation overlay": `grep -rn data-navigation-overlay src` = 0 e `BackButton` não consome o clique que fecha o menu. |
| `tests/hooks/useIndustryTrends.errors.test.ts` + `useIndustryCategoryTrends.errors.test.tsx` | Os hooks importam `fetchIndustryPeerIds` de `@/lib/crm-db`, mas não existe em `src/` a mensagem de falha de CRM que o teste exige (o teste também precisa de uma linha de mock a mais). |
| `tests/hooks/useClientBI.no-fallback.test.ts` | `useClientBI` não expõe `hasError` (o teste recebe `undefined`), então falha de origem não é distinguível de "cliente sem dados"; `recentOrders[].productPreview` também não existe. |
| `tests/components/operational-data-truth.test.tsx` | Teste de árvore de providers antiga (falha com `useAuth must be used within an AuthProvider`); o comportamento — nenhuma ferramenta comercial mostrar número sintético — não está medido hoje. |
| `tests/components/pricing/QuantityComparisonTable.test.tsx` | Falha de contrato de props (`reading ''find''`): a tabela mudou de assinatura; o total combinado por quantidade não tem teste na `main`. |
| `tests/hooks/useQuoteInitialization.loading.test.tsx` | Falha de contrato (chamadas com arrays vazios): o estado de carregamento da inicialização do orçamento não é medido hoje. |
| `tests/migrations/search-analytics-reconciliation.test.ts` + `storage-acl-hardening.test.ts` | Leem migrations por nome que não existem na `main`; a intenção (grants/policies de search analytics e ACL de storage) precisa ser remapeada para os arquivos atuais antes de virar teste. |
| `tests/unit/e2e-cleanup-client.test.ts` | O esquema de nomes divergiu: o teste exige `[E2E:t-…]`, a `main` usa prefixo `[E2E]` (`e2e/fixtures/test-user.ts:26`). Recuperar exige decidir qual formato vale. |

### Inconclusivo — falha só do ambiente de teste (não é lacuna)

O teste roda na `main` e falha por dependência de ambiente (`process.exit`, `spawn`, rede), não por ausência de código. Não entram na fila de recuperação: só um ambiente adequado dá veredito.

| Teste órfão | Por que é inconclusivo |
| --- | --- |
| `tests/scripts/e2e-workflow-preflight.test.ts`, `tests/scripts/healthcheck.test.ts` | Guardas de CI/harness: falham por ambiente de teste (`process.exit`, `spawn`), não por ausência de código; precisam de adaptação para rodar. |

### Comportamento presente na `main` — teste obsoleto (não recuperar)

| Teste órfão | Evidência de que o comportamento já existe |
| --- | --- |
| `tests/scripts/scheduled-report-seller-scope.test.ts` | `supabase/functions/_shared/scheduled-report-data.ts:120,155,159,219,289` filtram por `seller_id`/`created_by` do dono do agendamento. O teste procurava o filtro por regex numa forma de query que mudou. |
| `tests/hooks/useProductIntelligenceBadges.no-fallback.test.ts` | A API foi renomeada: o hook devolve `isMock`, o teste pede `isDemo`. A regra de não inventar selo está no hook (`:147`, `:152`). |
| `tests/components/favorites/FavoritesClientPicker.directory.test.tsx` | `src/components/favorites/FavoritesClientPicker.tsx:59` já chama `fetchQuoteDirectoryCompanies({ term, limit: 20 })`; a falha é de mock/timing do harness antigo. |
| `tests/hooks/useExternalCategoriesQuery.test.ts` | A `main` resolve por consulta única em cache e filtra localmente (`useCategoriesByIds`), em vez de uma consulta por lista de ids com `enabled`. Resultado equivalente; adotar o teste exigiria reescrever o hook. |
| `tests/scripts/scheduled-edge-deploy-parity.test.ts` | Esperava 2 workers de cron; a `main` publica 22 funções, **6 delas workers de cron** (`scripts/ci/verify-supabase-functions-published.mjs:19-32`). A paridade hoje é verificada pelo próprio workflow de deploy. |

### Situação dos 36: 2 ainda sem veredito

Dos 36 `comportamento-divergente` (11 da reavaliação anterior + 25 desta seção), **34 têm veredito** e
**2 continuam sem** — os dois inconclusivos por ambiente abaixo. Dos 25 desta seção:

- **3** recuperados nesta leva (PR #453), com o teste órfão rodando verde;
- **1** recuperado em PR aberta (`QuoteProductSelector`, PR #454) — o código ainda não está na `main`;
- **2** inconclusivos por ambiente de teste (`e2e-workflow-preflight`, `healthcheck`) — **seguem na fila**: o veredito depende de rodar em ambiente adequado, então a branch de origem deles não pode ser excluída;
- **14** com lacuna confirmada — continuam na fila de recuperação, cada um com PR próprio;
- **5** com comportamento já presente na `main` (teste obsoleto ou de API renomeada).

Nenhuma branch de origem destes 25 — inclusive as dos 2 inconclusivos — pode ser excluída antes do
veredito da sua linha virar código na `main` (ou de a linha ser marcada como obsoleta aqui).
