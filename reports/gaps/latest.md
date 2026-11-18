# Levantamento de falhas, gaps e melhorias
Gerado em 2026-11-09T14:00:20.606Z por `scripts/rules/run.mjs` (sem IA). ⚠️ Clone 40 commit(s) atrás de origin/main.

Regras executadas: 23 · com achados: 9 · alta: 0

## [MEDIA] ambiente-branch-defasada — falha (1)
Clone local atrás do origin/main — resultados abaixo podem estar velhos

**Correção:** git fetch && atualizar a branch (por worktree, conforme AGENTS.md); depois rodar de novo

- HEAD está 40 commit(s) atrás de origin/main

## [MEDIA] edge-fora-do-inventario — gap (17)
Edge functions no repositório que não constam no inventário de funcionalidades

**Correção:** documentar em docs/INVENTARIO_FUNCIONALIDADES_v2.md (seção 5); o gerador scripts/compare-edge-functions.mjs só reporta

- admin-audit-hook
- error-monitor
- external-connections-sync
- get-app-logs
- migrate-helper
- monthly-health-report
- process-batch-export
- qa-block-monitor
- quote-approval
- sicoob-approval-notifications
- sicoob-approval-reconciliation
- sicoob-artwork-register
- sicoob-document-ingest
- sicoob-kit-quote
- sicoob-reorder
- sicoob-seed-qa
- system-healthcheck

## [MEDIA] plano-mockdata-em-producao — falha (8)
Código de produção importando mockData (dados fictícios com nomes de negócio no bundle)

**Correção:** trocar pela fonte real (hook/serviço) ou isolar em módulo só de desenvolvimento

- src/components/catalog/CatalogActiveFilters.tsx:3  (import direto de dados fictícios)
- src/components/products/ProductCategoryBadges.tsx:7  (import direto de dados fictícios)
- src/hooks/bi/useClientAffinity.ts:8  (fallback sinalizado com isMock)
- src/hooks/bi/useClientBI.ts:8  (fallback sinalizado com isMock)
- src/hooks/bi/useClientCategoryAffinity.ts:12  (fallback sinalizado com isMock)
- src/hooks/bi/useClientSeasonality.ts:10  (fallback sinalizado com isMock)
- src/hooks/bi/useIndustryCategoryTrends.ts:13  (fallback sinalizado com isMock)
- src/hooks/bi/useIndustryTrends.ts:11  (fallback sinalizado com isMock)

## [MEDIA] plano-gates-ausentes — gap (1)
Proteções que o plano exige e que não estão ligadas (CI / pre-commit)

**Correção:** ligar o gate no workflow ou no hook; trocar bun por npm nos workflows

- gitleaks não roda no .husky/pre-commit (etapa 30)

## [MEDIA] rls-particao-sem-rls — gap (18)
Partições (PARTITION OF) sem RLS próprio — o PostgREST expõe cada partição como tabela; RLS do pai não vale no acesso direto

**Correção:** ENABLE ROW LEVEL SECURITY em cada partição (ou REVOKE dos papéis anon/authenticated nelas) via migration nova

- public.admin_audit_log_default  (criada em 20260513180124_4535e349-2899-4c5e-93d8-b53c4217b94e.sql)
- public.admin_audit_log_y2024  (criada em 20260513180124_4535e349-2899-4c5e-93d8-b53c4217b94e.sql)
- public.admin_audit_log_y2025  (criada em 20260513180124_4535e349-2899-4c5e-93d8-b53c4217b94e.sql)
- public.admin_audit_log_y2026_m01  (criada em 20260513180124_4535e349-2899-4c5e-93d8-b53c4217b94e.sql)
- public.admin_audit_log_y2026_m02  (criada em 20260513180124_4535e349-2899-4c5e-93d8-b53c4217b94e.sql)
- public.admin_audit_log_y2026_m03  (criada em 20260513180124_4535e349-2899-4c5e-93d8-b53c4217b94e.sql)
- public.admin_audit_log_y2026_m04  (criada em 20260513180124_4535e349-2899-4c5e-93d8-b53c4217b94e.sql)
- public.admin_audit_log_y2026_m05  (criada em 20260513180124_4535e349-2899-4c5e-93d8-b53c4217b94e.sql)
- public.admin_audit_log_y2026_m06  (criada em 20260513180124_4535e349-2899-4c5e-93d8-b53c4217b94e.sql)
- public.admin_audit_log_y2026_m07  (criada em 20260916120000_admin_audit_log_operations.sql)
- public.admin_audit_log_y2026_m08  (criada em 20260916120000_admin_audit_log_operations.sql)
- public.admin_audit_log_y2026_m09  (criada em 20260916120000_admin_audit_log_operations.sql)
- public.admin_audit_log_y2026_m10  (criada em 20260916120000_admin_audit_log_operations.sql)
- public.admin_audit_log_y2026_m11  (criada em 20260916120000_admin_audit_log_operations.sql)
- public.admin_audit_log_y2026_m12  (criada em 20260916120000_admin_audit_log_operations.sql)
- public.admin_audit_log_y2027_m01  (criada em 20260916120000_admin_audit_log_operations.sql)
- public.admin_audit_log_y2027_m02  (criada em 20260916120000_admin_audit_log_operations.sql)
- public.admin_audit_log_y2027_m03  (criada em 20260916120000_admin_audit_log_operations.sql)

## [BAIXA] edge-sem-teste — melhoria (69)
Edge functions que nenhum teste referencia (pasta própria, supabase/functions/tests ou tests/)

**Correção:** adicionar teste (priorizar as que escrevem no banco ou usam service role)

> heurística: considera coberta a função citada por caminho ou nome em algum teste; não mede cobertura real

- admin-audit-hook
- analyze-logo-colors
- auth-integrity-check
- bi-copilot
- bi-share-dossier
- block-ip-temporarily
- cleanup-notifications
- cleanup-novelties
- collections-public-react
- collections-watcher
- comparison-ai-advisor
- comparison-price-watcher
- comparisons-public-react
- connections-health-check
- connections-hub-audit
- dropbox-list
- e2e-auth-test
- elevenlabs-scribe-token
- elevenlabs-tts
- error-monitor
- external-connections-sync
- favorites-public-react
- favorites-watcher
- generate-ad-prompt
- generate-mockup
- generate-mockup-nanobanana
- generate-product-seo
- get-app-logs
- get-visitor-info
- github-credentials-test
- github-fix-config
- kit-ai-builder
- kit-identity-suggest
- kit-public-view
- log-login-attempt
- manage-users
- market-intelligence-insights
- materials-api
- mcp-keys-revoke
- mcp-keys-rotate
- mcp-keys-update
- mcp-server
- migrate-helper
- monthly-health-report
- ownership-audit
- process-batch-export
- process-queue
- process-scheduled-reports
- qa-block-monitor
- quote-followup-reminders
- quote-public-view
- rate-limit-check
- rls-audit
- rls-integration-tests
- rls-matrix-export
- secure-upload
- semantic-search
- send-digest
- send-notification
- send-scheduled-reports
- … +9

## [BAIXA] plano-pastas-de-teste — melhoria (2)
Mais de uma convenção de pasta de testes em uso

**Correção:** consolidar numa convenção só (decisão de estrutura — não automatizável)

- tests: 458 arquivo(s) de teste
- src/tests: 3 arquivo(s) de teste

## [BAIXA] plano-supressoes-sem-motivo — melhoria (17)
eslint-disable / @ts-ignore / @ts-expect-error sem motivo escrito

**Correção:** acrescentar o motivo (`-- porque ...`) ou remover a supressão; @ts-ignore → @ts-expect-error com descrição

> 17 supressão(ões) sem motivo em 17 arquivo(s); lista mostra os 40 com mais ocorrências

- src/components/admin/DiscountManagementPanel.tsx: 1
- src/components/admin/connections/SeverityFilterContext.tsx: 1
- src/components/cart/BundleSuggestionCard.tsx: 1
- src/components/catalog/BulkVariantWizard.tsx: 1
- src/components/collections/CollectionsTrashView.tsx: 1
- src/components/compare/SyncedZoomGallery.tsx: 1
- src/components/intelligence/HotSearchesCard.tsx: 1
- src/components/intelligence/UnmetDemandCard.tsx: 1
- src/hooks/useCatalogMarketing.ts: 1
- src/hooks/useConsecutiveFailures.ts: 1
- src/hooks/useEnrichedFavoriteItems.ts: 1
- src/hooks/useQuoteViewedMap.ts: 1
- src/hooks/useWorkspaceNotifications.tsx: 1
- src/lib/lazyWithRetry.ts: 1
- src/lib/notifications-metrics.ts: 1
- src/pages/FavoritesPage.tsx: 1
- src/pages/admin/AdminConexoesPage.tsx: 1

## [BAIXA] plano-arquivos-grandes — melhoria (8)
Arquivos de src com mais de 700 linhas

**Correção:** quebrar por responsabilidade (refatoração — não automatizável)

> 8 arquivo(s) acima de 700 linhas

- src/lib/theme-presets.ts: 1045 linhas
- src/components/admin/connections/SecretField.tsx: 920 linhas
- src/data/mockData.ts: 824 linhas
- src/pages/sicoob/SicoobInvitationsPage.tsx: 755 linhas
- src/components/security/SecurityDashboardSections.tsx: 736 linhas
- src/pages/magic-up/MagicUpConfigPanel.tsx: 722 linhas
- src/pages/Auth.tsx: 712 linhas
- src/pages/TrendsPage.tsx: 711 linhas

> gate-migration-imutavel: inconclusivo: o clone está 40 commit(s) atrás de origin/main, o gate compara contra a base e acusaria arquivos que só faltam aqui
> plano-definer-sem-search-path: estático: última definição por nome (sobrecargas se fundem); confirmar no Postgres real (pg_proc.proconfig)
> rls-tabela-sem-rls: 2 migration(s) usam SQL dinâmico para RLS — itens podem ser falso positivo; confirme com scripts/scan-rls-security.mjs (precisa de service key)