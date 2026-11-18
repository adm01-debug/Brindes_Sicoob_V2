# Suíte de testes e simuladores da PR #119 — triagem executada

Medição de 18/11/2026. A PR #119 foi fechada sem merge carregando **96 arquivos de teste**,
**9 simuladores Python** e **1 helper de E2E** que a `main` não tem. Este anexo diz, arquivo
por arquivo, o que acontece ao trazer cada um para a `main` **de verdade** — não por leitura:
os 97 foram materializados sobre `origin/main` e a suíte foi executada
(`npx vitest run`, 18/11/2026).

## Por que a triagem não é opcional

"Teste que a `main` não tem" não significa "teste que falta". Boa parte desta suíte foi
escrita contra o comportamento da própria PR #119, que a `main` não implementa: trazer o
arquivo sem a implementação produz CI vermelha, não cobertura. E o contrário também é
verdade: há teste que passa de primeira e protege comportamento hoje desprotegido. Só a
execução separa os dois casos.

## Resultado

| situação | arquivos | o que fazer |
|---|---|---|
| **passam contra a `main` como estão** | **8** | recuperar em PR própria, sem tocar em `src/` |
| falham por asserção que diverge | 22 | cada um descreve um comportamento que a `main` não tem; viram evidência de lacuna, não dívida de teste |
| falham por API diferente na `main` | 16 | idem — a função exportada pela PR #119 não existe ou mudou de nome |
| falham por UI diferente na `main` | 9 | idem — o elemento que o teste procura não está na tela de hoje |
| falham por import de módulo ausente | 5 | dependem de código da PR #119 listado em `capacidades.md` |
| cenários `.mjs` | 9 | triagem executada; ver seção abaixo |
| fixtures `.sql` dos cenários | 5 | acompanham os cenários correspondentes |
| simuladores `.py` | 7 | exigem Docker (Postgres descartável); não executáveis neste ambiente |

### Os 8 que entram sem mexer em `src/`

- `tests/edge-functions/assistant-context.test.ts`
- `tests/edge-functions/expert-chat-message-schema.test.ts`
- `tests/edge-functions/trends-insights-pagination.test.ts`
- `tests/hooks/usePaBudget.test.tsx`
- `tests/lib/sicoob/orderBudgetProjection.test.ts`
- `tests/lib/sicoob/sla-cycle.test.ts`
- `tests/security/portal-access-policy.test.ts`
- `tests/unit/process-scheduled-reports-scope.test.ts`

**Veredito: NÃO APAGAR a `pr/119` enquanto estes 8 não estiverem na `main`.** A PR que os
traz não entra agora apenas pela regra de fila do `AGENTS.md` (no máximo 5 PRs minhas
abertas).

### Os 52 que falham

Cada linha abaixo é uma afirmação sobre o sistema que a `main` **não** cumpre hoje. Não são
testes quebrados: são a lista de lacunas que a PR #119 media e ninguém mais mede. Recuperar
cada um exige recuperar junto a implementação correspondente, que está catalogada em
[`capacidades.md`](capacidades.md).

## Os 9 cenários `.mjs`, executados um a um

`node --test`, contra `origin/main`, em 18/11/2026.

| cenário | resultado | o que isso significa |
|---|---|---|
| `manager-approval-delegation-route.scenario.mjs` | **passa** (1/1) | entra como está |
| `access-log-marketing-acl.scenario.mjs` | **passa (3/3) depois de corrigir um caminho** | apontava para `20261018131850_harden_access_blocked_log_and_marketing_view_acl.sql`; a migration existe na `main` com outro carimbo (`20261118130300_…`, recuperada na PR #305). Só o nome do arquivo muda |
| `view-notification-hardening.scenario.mjs` | **passa (2/2) depois de corrigir um caminho** | idem, para `20261118130200_restore_view_invoker_and_notification_scope.sql` |
| `business-realtime-contract.scenario.mjs` | 3 de 4 depois de corrigir o caminho | ver o achado abaixo |
| `edge-runtime-contract.test.mjs` | não roda | importa `scripts/lib/edge-runtime-contract.mjs`, que não existe na `main`. O contrato foi reimplementado por outro caminho na PR #335; este arquivo fica obsoleto |
| `critical-test-skips.scenario.mjs` | falha | o orçamento de skip da `main` é outro; a mesma regra já é fiscalizada por `scripts/check-critical-test-skip-budget.mjs` e pela PR #329 |
| `freight-truthfulness-contract.scenario.mjs` | falha (asserção) | mede comportamento de frete que a `main` não tem |
| `public-health-contract.mjs` | falha (2 asserções) | idem, contrato de health público |
| `real-indicators-contract.scenario.mjs` | falha (3 asserções) | idem, indicadores reais |

### Achado novo, do cenário de realtime: canal do Kanban não é exclusivo

**Medido:** `business-realtime-contract.scenario.mjs` exige
`sicoob-orders-realtime:${crypto.randomUUID()}`; a `main` usa **nome fixo** em
`src/services/sicoob/commonService.ts:18`, e dois consumidores diferentes abrem esse mesmo
nome — `OrdersKanbanPage.tsx:269` e `OrdersPage.tsx:138`. É esse o ponto que o cenário
reprova, e é verificável por leitura do arquivo.

**NÃO VERIFICADO:** que isso hoje faça o Kanban perder atualização na tela. As duas páginas
estão em **rotas distintas** (`src/routes/config/sicoob.ts:9-10`), então não ficam montadas
ao mesmo tempo na mesma aba; e duas abas usam clientes Supabase independentes
(`src/integrations/supabase/client.ts:56-62`), cada uma com seu socket. A janela que sobra é
a **navegação entre as duas rotas na mesma aba**, em que a saída de uma chama `removeChannel`
sobre o mesmo tópico que a outra acaba de assinar — plausível, mas não reproduzi, e sem
reprodução não registro como defeito confirmado.

**Decisão:** o nome único entra assim mesmo (PR #342). É uma linha, não muda comportamento
observável, elimina por construção toda a classe de colisão de tópico e é exatamente o que o
cenário cobra — não depende de a falha estar acontecendo hoje para valer a pena.
**Pendente — o cenário entra junto da PR dos 8 arquivos.**

## Tabela completa

| arquivo | situação | detalhe |
|---|---|---|
| `tests/edge-functions/assistant-context.test.ts` | PASSA | — |
| `tests/edge-functions/expert-chat-message-schema.test.ts` | PASSA | — |
| `tests/edge-functions/trends-insights-pagination.test.ts` | PASSA | — |
| `tests/hooks/usePaBudget.test.tsx` | PASSA | — |
| `tests/lib/sicoob/orderBudgetProjection.test.ts` | PASSA | — |
| `tests/lib/sicoob/sla-cycle.test.ts` | PASSA | — |
| `tests/security/portal-access-policy.test.ts` | PASSA | — |
| `tests/unit/process-scheduled-reports-scope.test.ts` | PASSA | — |
| `tests/components/AIChat.message-limit.test.ts` | API diferente | selectAssistantRequestMessages |
| `tests/components/AIChat.sse.test.ts` | API diferente | readAssistantSse |
| `tests/components/expert/useExpertChat.request-limits.test.ts` | API diferente | buildExpertRequestBody |
| `tests/e2e/auth-role-contract.test.ts` | API diferente | credentialsForRole |
| `tests/hooks/useClientBI.real-data.test.tsx` | API diferente | getAvailableClientHistory |
| `tests/hooks/useClientHealthScore.reliable-data.test.ts` | API diferente | getAvailableHealthScore |
| `tests/hooks/useClientSeasonality.real-data.test.ts` | API diferente | resolveSeasonalityResult |
| `tests/hooks/useCustomKitPersistence-concurrency.test.tsx` | API diferente | select |
| `tests/hooks/useFavoriteListsQueryKeys.test.ts` | API diferente | favoriteListsQueryKey |
| `tests/hooks/useQuoteInitialization.mapping.test.ts` | API diferente | mapSimulatorPersonalization |
| `tests/hooks/useQuoteInitialization.reset.test.ts` | API diferente | applyExistingQuote |
| `tests/hooks/useQuoteInitialization.suggestions.test.ts` | API diferente | parseQuoteSuggestionParams |
| `tests/hooks/useQuoteProductSearch.suggestions.test.ts` | API diferente | loadQuoteProductsByIds |
| `tests/pages/QuoteBuilderPage.behavior.test.tsx` | API diferente | buildQuoteDraftData |
| `tests/pages/useQuoteViewData.loading.test.tsx` | API diferente | useLoadedQuote |
| `tests/stores/useNavigationStore.history.test.ts` | API diferente | record |
| `tests/components/AIMockupAssistant.history.test.tsx` | UI diferente | Abrir assistente de layouts |
| `tests/components/SingleVariantPicker.test.tsx` | UI diferente |  |
| `tests/components/intelligence/CategoryRanking.errors.test.tsx` | UI diferente |  |
| `tests/components/intelligence/MarketIntelligenceChart.stale-cache.test.tsx` | UI diferente | /Exibindo o último gráfico disponível/ |
| `tests/components/intelligence/analytics-query-errors.test.tsx` | UI diferente |  |
| `tests/components/operational-data-truth.test.tsx` | UI diferente | Abrir assistente de layouts |
| `tests/hooks/product-intelligence-real-data.test.tsx` | UI diferente | Carregando detalhes do produto |
| `tests/pages/ProductDetail.intelligence-errors.test.tsx` | UI diferente |  |
| `tests/pages/PublicFavoriteListPage.test.tsx` | UI diferente | Seleção recuperada |
| `tests/components/BackButton.overlay-pointer.test.tsx` | asserção diverge | expected <div …(1)></div> to be null  |
| `tests/components/pricing/QuantityComparisonTable.test.tsx` | asserção diverge |  TypeError: Cannot read properties of undefined (reading 'find') at /home/user/B |
| `tests/components/quotes/QuoteProductSelector.concurrent-save.test.tsx` | asserção diverge |  Error: [2mexpect([22m[31melement[39m[2m).not.toBeInTheDocument()[22m [31 |
| `tests/hooks/bi-demo-boundary.test.tsx` | asserção diverge | expected "vi.fn()" to not be c |
| `tests/hooks/useBIDossierExport.errors.test.tsx` | asserção diverge |  Error: [vitest] No "useCrmCompany" export is defined on the "@/hooks/useCrmComp |
| `tests/hooks/useCategoryRanking.errors.test.tsx` | asserção diverge | expected f |
| `tests/hooks/useClientCategoryAffinity.error.test.tsx` | asserção diverge | expected undefined to be true // Object.is equ |
| `tests/hooks/useClientSeasonality.errors.test.ts` | asserção diverge | expected undefined to be true // Object.is equ |
| `tests/hooks/useClientVsIndustry.reliable-data.test.tsx` | asserção diverge | expected { isLo |
| `tests/hooks/useClientsComparison.availability.test.tsx` | asserção diverge |  Error: [vitest] No "useCrmCompany" export is defined on the "@/hooks/useCrmComp |
| `tests/hooks/useCrmClientsPage.test.ts` | asserção diverge |  Error: promise rejected "TypeError: __vi_import_0__.useCrmClientsP…" instead of |
| `tests/hooks/useCrmCompanies.pagination.test.ts` | asserção diverge |  Error: promise rejected "TypeError: __vi_import_0__.useAllCrmCompa…" instead of |
| `tests/hooks/useExternalCategoriesQuery.test.ts` | asserção diverge | expected "vi.fn()" to be c |
| `tests/hooks/useIndustryCategoryTrends.errors.test.tsx` | asserção diverge |  Error: promise resolved "{ isMock: true, …(2) }" instead of rejecting at _Asser |
| `tests/hooks/useIndustryTrends.errors.test.ts` | asserção diverge | expected [ 'bi-industry-trends-v2', …(1) ] to not deeply equ |
| `tests/hooks/useQuoteInitialization.loading.test.tsx` | asserção diverge | expected l |
| `tests/hooks/useQuoteInitialization.suggestions.integration.test.tsx` | asserção diverge | expected "vi.fn()" to be c |
| `tests/lib/uxMetrics.test.ts` | asserção diverge | "beforeEach" callback value must be function, received "undefined"  |
| `tests/pages/ClientsPage.pagination.test.tsx` | asserção diverge |  Error: [vitest] No "useCrmCompanies" export is defined on the "@/hooks/useCrmCo |
| `tests/pages/GestorCompras.error-state.test.tsx` | asserção diverge |  Error: Consulta inesperada: sicoob-gestor-stats at /home/user/Brindes_Sicoob_V2 |
| `tests/scripts/healthcheck.test.ts` | asserção diverge | process.exit unexpectedly called with "1"  |
| `tests/security/privileged-client-data-guards.test.ts` | asserção diverge | ENOENT: no such file or directory, open 'src/routes/app-router.tsx'  |
| `tests/components/NavigationHistoryMenu.test.tsx` | import ausente | @/components/common/NavigationHistoryMenu |
| `tests/lib/error-reporter-bootstrap.test.ts` | import ausente | @/lib/error-reporter-bootstrap |
| `tests/pages/GestorCompras.metrics.test.ts` | import ausente | @/lib/orders/purchasing-sla |
| `tests/pages/kit-builder/useKitProductParam.test.ts` | import ausente | @/pages/kit-builder/useKitProductParam |
| `tests/stores/useNavigationGuardStore.test.ts` | import ausente | @/stores/useNavigationGuardStore |
