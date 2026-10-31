# Mapa de relações do projeto

O grafo consolida 15,770 nós, 20,727 arestas e 2,352 comunidades do código e da documentação. As relações ajudam a localizar dependências e afirmações; não certificam implementação, autorização ou comportamento em produção.

## Limitações verificadas

O diagnóstico encontrou 11,157 arestas com referência a nó não resolvido, 8 autorrelações e 631 arestas agregadas por compartilhar extremidades no grafo sem direção. A amostra das referências ausentes inclui bibliotecas externas e símbolos importados. O resultado não é um grafo completo de chamadas, e ausência de caminho não prova ausência de dependência. O arquivo diagnostico.json preserva as contagens.

Um arquivo Terraform não teve extração AST por falta do parser específico; recebeu inspeção manual. O detector excluiu .env.production por sensibilidade e classificou motion-tokens.css como sensível; esse CSS foi verificado separadamente. As 13 fontes fornecidas foram incorporadas ao grafo, mas seu cache fica fora do escopo do cache do repositório. A pesquisa pública na internet está no inventário de fontes, sem cobertura integral neste grafo.

Tokens e custo não foram instrumentados. Não se deve interpretar zero nos fragmentos intermediários como medição nem estimativa de economia como custo real.

## Principais comunidades

| Grupo | Nós | Exemplos de localização |
|---|---:|---|
| Fundamentos de interface | 308 | `tsconfig.app.json`; `src/components/quotes/QuotesStatusChips.tsx`; `src/hooks/useCustomizationPrice.ts`; `src/pages/ResetPassword.tsx`; `src/components/admin/connections/ZoneRefreshButton.tsx` |
| Simulação de preços | 92 | `src/components/pricing/simulator/index.ts`; `src/components/pricing/ProductPriceSimulator.tsx`; `src/components/pricing/simulator/types.ts`; `src/components/pricing/QuantityPriceCalculator.tsx`; `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| Testes de componentes | 91 | `tests/components/render-helpers.tsx`; `tests/components/kit-builder/KitBuilderComponents.test.tsx`; `tests/e2e/auth-flow.test.tsx`; `tests/components/products/ProductCard.test.tsx` |
| Autorização das funções | 86 | `supabase/functions/_shared/cors.ts`; `supabase/functions/rls-integration-tests/index.ts`; `supabase/functions/_shared/authorize.ts` |
| Proteção e busca semântica | 82 | `supabase/functions/_shared/bot-protection.ts`; `supabase/functions/semantic-search/index.ts`; `supabase/functions/_shared/ai-usage.ts`; `supabase/functions/_shared/zod-validate.ts`; `supabase/functions/_shared/auth.ts` |
| Testes de rotas | 80 | `e2e/routes/_factories.ts`; `e2e/routes/_shared.ts`; `e2e/routes/public/login.spec.ts` |
| Componentes de interface | 66 | `src/components/ui/index.ts`; `src/components/ui/UrgencyBadge.tsx`; `src/components/ui/FocusTrap.tsx`; `src/components/ui/EmptyState.tsx`; `src/components/ui/LoadingOverlay.tsx` |
| Indicadores de clientes | 63 | `src/hooks/bi/useClientSeasonality.ts`; `src/hooks/bi/useClientHealthScore.ts`; `src/hooks/bi/useClientsComparison.ts` |
| Comandos de validação | 62 | `package.json` |
| Mídias dos produtos | 62 | `src/components/admin/products/image-gallery/ProductImageGallery.tsx`; `src/components/admin/products/ProductVideoGallery.tsx`; `src/components/admin/products/video-gallery/types.ts`; `src/components/admin/products/image-gallery/types.ts` |
| Integração de CRM | 62 | `supabase/functions/crm-db-bridge/index.ts`; `supabase/functions/_shared/circuit-breaker.ts` |
| Apoio a testes | 62 | `tests/hooks/_helpers/render-hook-providers.tsx`; `tests/fixtures/personalization-payloads.ts`; `tests/hooks/_helpers/mock-supabase-builder.ts` |
| Propostas comerciais | 61 | `src/components/pdf/ProposalHtmlTemplate.tsx`; `src/components/pdf/ProposalSections.tsx`; `src/components/pdf/PropostaComercialTailwind.tsx`; `src/components/pdf/proposal/ProposalProductTable.tsx` |
| Painel de telemetria | 55 | `src/pages/admin/AdminTelemetriaPage.tsx`; `src/pages/admin/telemetry/useTelemetryData.ts`; `src/pages/admin/telemetry/exportHelpers.ts`; `src/pages/admin/telemetry/TelemetrySkeletons.tsx` |
| Sessões de teste | 53 | `e2e/fixtures/test-base.ts`; `e2e/fixtures/selectors.ts` |
| Rotas da aplicação | 53 | `src/App.tsx`; `src/pages/CustomizableDashboard.tsx`; `src/pages/GestorCompras.tsx`; `src/pages/OrdersPage.tsx`; `src/main.tsx` |
| Administração de credenciais | 53 | `supabase/functions/mcp-keys-issue/index.ts`; `supabase/functions/mcp-keys-update/index.ts`; `supabase/functions/mcp-keys-rotate/index.ts`; `supabase/functions/mcp-keys-revoke/index.ts`; `supabase/functions/connections-hub-audit/index.ts` |
| Painel de conexões | 52 | `src/components/admin/connections/SupabaseConnectionsTab.tsx`; `src/components/admin/connections/Bitrix24Tab.tsx`; `src/components/admin/connections/N8nTab.tsx`; `src/components/admin/connections/ConnectionDetailsDialog.tsx`; `src/components/admin/connections/ |
| Assistência ao comprador | 52 | `src/components/expert/FlowFilterPanel.tsx`; `src/components/expert/ExpertChatDialog.tsx`; `src/components/expert/chat/useExpertChat.ts`; `src/components/expert/chat/ChatMessageList.tsx`; `src/components/expert/FlowFilterSections.tsx` |
| Métricas de integração | 51 | `src/lib/telemetry/bridgeAlertThresholds.ts`; `src/lib/telemetry/bridgeCallMetrics.ts`; `src/lib/telemetry/longTaskWatchdog.ts`; `src/lib/telemetry/instrumentationControl.ts` |
| Registros de execução | 50 | `supabase/functions/_shared/request-id.ts`; `supabase/functions/_shared/structured-logger.ts`; `supabase/functions/log-login-attempt/index.ts` |
| Resolução de credenciais | 50 | `supabase/functions/_shared/credentials.ts`; `supabase/functions/secrets-manager/index.ts`; `supabase/functions/_shared/credentials.test.ts`; `supabase/functions/quote-public-view/index.ts` |
| Testes de navegação | 47 | `e2e/flows/22-header-sticky.spec.ts`; `e2e/helpers/waits.ts`; `e2e/routes/_catalog.ts`; `e2e/flows/20-all-features-smoke.spec.ts`; `e2e/fixtures/selectors.ts` |
| Validação de conexões | 46 | `supabase/functions/_shared/supabase-client-adapter.ts`; `supabase/functions/_shared/connection-test-runner.ts`; `supabase/functions/connections-auto-test/index.ts`; `supabase/functions/connection-tester/index.ts` |
| Autenticação e acesso | 46 | `supabase/migrations/20250103_complete_schema.sql` |
| Composição de kits | 45 | `src/lib/kit-builder/index.ts`; `src/lib/kit-builder/types.ts`; `src/lib/kit-builder/volume-calculator.ts`; `src/lib/kit-builder/price-calculator.ts`; `src/lib/kit-builder/mock-data.ts` |
| Conexões e credenciais | 44 | `src/components/admin/connections/SecretField.tsx`; `src/components/admin/connections/secretValidators.ts`; `src/components/admin/connections/RotateSecretConfirmDialog.tsx`; `src/components/admin/connections/SaveSecretConfirmDialog.tsx` |
| Consulta de produtos | 44 | `src/components/admin/products/ProductFormStepContent.tsx`; `src/components/admin/products/ProductFormHelpers.tsx`; `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| Consulta de produtos | 44 | `src/components/products/index.ts`; `src/components/products/ProductGrid.tsx`; `src/components/products/VirtualizedProductGrid.tsx`; `src/components/products/ProductCardSkeleton.tsx`; `src/components/products/RelatedProducts.tsx` |
| Estado da interface | 44 | `src/hooks/tecnicas/index.ts`; `src/hooks/useTecnicasUnificadas.ts`; `src/hooks/tecnicas/usePrecoCalculation.ts`; `src/hooks/tecnicas/useTecnicasList.ts`; `src/hooks/tecnicas/useTabelasPreco.ts` |
| Testes de jornadas | 43 | `e2e/helpers/favorites.ts`; `e2e/flows/19-favorites-api-intercept.spec.ts`; `e2e/flows/10-favorites-persistence-storage.spec.ts`; `e2e/flows/17-favorites-cookies-persistence.spec.ts`; `e2e/flows/09-favorite-from-detail.spec.ts` |
| Autenticação e acesso | 42 | `e2e/helpers/nav.ts`; `e2e/helpers/auth.ts`; `e2e/flows/01-auth.spec.ts` |
| Consulta de produtos | 42 | `src/components/admin/connections/DataSourceDebugTab.tsx`; `src/components/admin/connections/CredentialCacheMetricsPanel.tsx`; `src/components/admin/connections/FieldSourceDrillDownDialog.tsx`; `src/components/admin/connections/ExpectedKeysMatchPanel.tsx`; `sr |
| Consulta de produtos | 42 | `src/components/mockup/MockupConfigPanel.tsx`; `src/components/mockup/LogoColorAnalyzer.tsx`; `src/components/mockup/MultiAreaManager.tsx`; `src/components/mockup/MockupProductSelector.tsx` |
| Consulta de produtos | 42 | `src/lib/external-db/index.ts`; `src/lib/external-db/bridge.ts`; `src/lib/external-db/products-detail.ts`; `src/lib/external-db/products.ts`; `src/lib/external-db/product-types.ts` |
| Isolamento de dados | 42 | `supabase/functions/manage-users/index.ts`; `supabase/functions/_shared/supabase-client-adapter.ts`; `supabase/functions/rls-matrix-export/index.ts`; `supabase/functions/step-up-verify/index.ts`; `supabase/functions/connections-health-check/index.ts` |
| Conexões e credenciais | 41 | `docs/MODULES.md`; `docs/RBAC_HELPERS.md`; `docs/RUNBOOKS/CREDENTIAL_ROTATION.md`; `.coderabbit.yaml`; `.lovable/memory/integrations/connections-hub.md` |
| Testes e validação | 41 | `src/components/admin/connections/ConnectionsOverviewTable.tsx`; `src/components/admin/connections/ConnectionTestDetailsDialog.tsx`; `src/components/admin/connections/ConnectionsOverviewFilters.tsx` |
| Auditoria e evidências | 40 | `public/reports/AUDIT_REPORT_892fa9f31.md`; `public/reports/AUDIT_REPORT_d9912d316.md`; `public/reports/AUDIT_REPORT_afc944619.md` |
| Consulta de produtos | 40 | `src/components/admin/products/kit-components/ProductKitComponentsSection.tsx`; `src/components/admin/products/kit-components/api.ts`; `src/components/admin/products/kit-components/PrintAreasManager.tsx`; `src/components/admin/products/kit-components/types.ts` |

## Nós com maior conexão

- react
- getCorsHeaders()
- test
- scripts
- buildAuthedRouteSuite()
- gotoAndSettle()
- Sel
- renderWithProviders()
- requireAuth()
- getOrCreateRequestId()

## Consultas úteis

- Como AuthContext, AdminRoute e SicoobRoute se relacionam?
- Quais consumidores dependem de external-db-bridge?
- Que evidências ligam verba, aprovação e pedido?
- Quais documentos descrevem BR Supply e qual é seu cliente de origem?

As respostas precisam ser confrontadas com os arquivos indicados e os achados técnicos. O JSON é a referência de navegação; o HTML oferece visão agregada das comunidades para evitar renderizar todos os nós simultaneamente.
