# Contexto do projeto para agentes de IA

GERADO AUTOMATICAMENTE por scripts/ai-context/gerar.mjs — não editar à mão; será sobrescrito.
Publicado em `docs/contexto/codigo/` na branch `contexto` (gerada, nunca abra PR dela) a cada push em `main` e a cada 10 minutos pelo workflow `contexto.yml`; índice único das três fontes em `docs/contexto/00-INDEX.md`. Gere local com `node scripts/ai-context/gerar.mjs`. Commit-base: `cf2d42bc08491a8c717f01b50c8cc62adaab276c` (2026-11-21T14:51:14-03:00).

## Como usar (leia antes de planejar ou executar qualquer tarefa)
1. **Tela/rota/menu** → `rotas.json` (url/vista/menu → arquivo → hooks → tabelas → edges; `rotas_http_backend` para APIs) e `modulos.json` (módulo inteiro + dependências entre módulos).
2. **Hook/serviço/lógica** → `hooks.json`, `logica.json` (quem usa, o que toca, se tem teste).
3. **Edge function / serverless** → `edge-functions.json` (verify_jwt, tabelas, env, quem chama, órfãs).
4. **Banco** → `banco.json` (colunas, RLS, policies, índices, FKs, triggers, cron jobs, buckets, drift migration×types, uso no código) — visão do código; para o banco vivo use o MCP.
5. **Antes de criar arquivo** → `convencoes.json` (onde ficam as coisas, nomenclatura, alias), `componentes.json` (nomes duplicados, órfãos), `grafo.json` (hubs, ciclos de import) e `grafo-graphify.json` (grafo por AST: comunidades, símbolos mais chamados, comunidade de cada arquivo).
6. **CI/scripts/deploy/env/integrações/permissões/flags** → `ferramentas.json` e `scripts.json`.
7. **Antes de abrir PR** → `testes.json` (o que tem e não tem teste, onde os testes ficam), `baseline.json` (alertas, TODOs, hotspots, últimos commits).
Os JSONs são grandes: filtre com `grep`/`jq` pelo caminho/arquivo/tabela da sua tarefa; não carregue tudo.

## Stack
- linguagens: TypeScript (2929), Markdown (970), SQL (684), JSON (292), JavaScript (151), Python (66), YAML (24), CSS (7)
- linguagem_principal: TypeScript
- framework: React
- backend_http: n/d
- bundler: Vite
- roteador: react-router
- banco: Supabase
- testes: vitest, playwright
- ui: tailwind, radix/shadcn
- estado: react-query, zustand
- gerenciador_pacotes: npm
- node: >=24 <25
- python: n/d
- deploy: vercel, compose/swarm
- monorepo: n/d
- pastas_fonte: src

## Números
| item | qtd |
|---|---|
| arquivos_total | 5239 |
| arquivos_codigo | 3143 |
| linhas_codigo | 494590 |
| rotas | 139 |
| rotas_http_backend | 13 |
| vistas_por_id | 0 |
| itens_menu | 84 |
| modulos | 145 |
| componentes | 1171 |
| hooks | 394 |
| edge_functions | 107 |
| tabelas | 292 |
| migrations | 622 |
| cron_jobs | 27 |
| testes | 888 |
| workflows | 17 |
| scripts | 121 |
| docs_md | 970 |

## Onde ficam as coisas
- telas: src/pages (116)
- componentes: src/components (1000), src/pages (159), src/contexts (9)
- hooks: src/hooks (287), src/components (66), src/pages (22)
- servicos_logica: src/lib (167), src/utils (37), src/services (23)
- testes: tests/ (640), e2e/ (149), outro (51)
- edge_functions: supabase/functions
- migrations: supabase/migrations
- scripts: scripts/revisao (14), scripts/rules (10), scripts/db (9)
- docs: docs (66), (raiz) (11), .github (2)
- nomenclatura: {"componentes":"PascalCase (96%)","hooks":"use + PascalCase","servicos":"kebab-case (49%)","edge_functions":"kebab-case (100%)","tabelas":"snake_case (92%)"}
- instruções para agentes no repo: AGENTS.md, CLAUDE.md

## Módulos (menu → domínio)
| módulo | itens de menu | telas/rotas | arquivos | hooks locais | edges | tabelas |
|---|---|---|---|---|---|---|
| components/a11y | 0 | 0 | 5 | 4 | 0 | 0 |
| components/admin | 0 | 0 | 295 | 124 | 23 | 52 |
| components/auth | 0 | 0 | 7 | 12 | 6 | 3 |
| components/bi | 0 | 0 | 22 | 23 | 4 | 3 |
| components/cart | 0 | 0 | 16 | 9 | 3 | 9 |
| components/catalog | 0 | 0 | 9 | 143 | 9 | 17 |
| components/collections | 0 | 0 | 15 | 19 | 4 | 5 |
| components/common | 0 | 0 | 29 | 24 | 5 | 3 |
| components/compare | 0 | 0 | 25 | 14 | 3 | 3 |
| components/dashboard | 0 | 0 | 11 | 19 | 6 | 11 |
| components/dev | 0 | 0 | 7 | 6 | 3 | 2 |
| components/effects | 0 | 0 | 5 | 2 | 0 | 0 |
| components/expert | 0 | 0 | 13 | 11 | 5 | 5 |
| components/favorites | 0 | 0 | 14 | 16 | 4 | 5 |
| components/filters | 0 | 0 | 23 | 81 | 4 | 7 |
| components/intelligence | 0 | 0 | 25 | 55 | 6 | 11 |
| components/inventory | 0 | 0 | 18 | 19 | 2 | 1 |
| components/kit-builder | 0 | 0 | 42 | 24 | 6 | 9 |
| components/kit-library | 0 | 0 | 6 | 5 | 3 | 4 |
| components/layout | 0 | 0 | 18 | 346 | 22 | 79 |
| components/magic-up | 0 | 0 | 18 | 15 | 5 | 5 |
| components/mockup | 0 | 0 | 41 | 24 | 4 | 2 |
| components/notifications | 0 | 0 | 6 | 9 | 3 | 3 |
| components/novelties | 0 | 0 | 5 | 37 | 5 | 8 |
| components/orders | 0 | 0 | 32 | 43 | 8 | 40 |
| components/pdf | 0 | 0 | 13 | 0 | 0 | 0 |
| components/pricing | 0 | 0 | 22 | 32 | 2 | 0 |
| components/product-registration | 0 | 0 | 8 | 34 | 4 | 3 |
| components/products | 0 | 0 | 90 | 56 | 5 | 16 |
| components/quotes | 0 | 0 | 73 | 33 | 7 | 29 |
| components/replenishments | 0 | 0 | 7 | 33 | 5 | 8 |
| components/search | 0 | 0 | 26 | 55 | 7 | 4 |
| components/security | 0 | 0 | 11 | 13 | 4 | 10 |
| components/settings | 0 | 0 | 6 | 2 | 0 | 4 |
| components/sicoob | 0 | 0 | 20 | 25 | 6 | 22 |
| components/simulator | 0 | 0 | 23 | 23 | 4 | 4 |
| components/ui | 0 | 0 | 59 | 6 | 0 | 0 |
| contexts | 0 | 0 | 10 | 23 | 4 | 10 |
| hooks | 0 | 0 | 210 | 378 | 21 | 97 |
| hooks/bi | 0 | 0 | 13 | 24 | 3 | 4 |
| hooks/catalog | 0 | 0 | 6 | 89 | 2 | 4 |
| hooks/gravacao | 0 | 0 | 6 | 12 | 2 | 0 |
| hooks/orders | 0 | 0 | 12 | 17 | 5 | 15 |
| hooks/quote | 0 | 0 | 5 | 23 | 6 | 8 |
| hooks/quotes | 0 | 0 | 6 | 14 | 6 | 8 |
| hooks/sicoob | 0 | 0 | 9 | 10 | 4 | 9 |
| hooks/simulator | 0 | 0 | 8 | 9 | 2 | 1 |
| hooks/tecnicas | 0 | 0 | 6 | 20 | 2 | 0 |
| hooks/voice | 0 | 0 | 9 | 1 | 1 | 1 |
| lib | 0 | 0 | 60 | 317 | 22 | 76 |
| lib/auth | 0 | 0 | 10 | 6 | 3 | 2 |
| lib/bi | 0 | 0 | 7 | 9 | 0 | 1 |
| lib/external-db | 0 | 0 | 18 | 3 | 2 | 0 |
| lib/kit-builder | 0 | 0 | 7 | 0 | 0 | 0 |
| lib/navigation | 0 | 0 | 5 | 0 | 0 | 0 |
| lib/personalization | 0 | 0 | 20 | 3 | 2 | 0 |
| lib/sicoob | 0 | 0 | 7 | 0 | 0 | 0 |
| lib/system | 0 | 0 | 5 | 4 | 3 | 2 |
| lib/telemetry | 0 | 0 | 8 | 0 | 0 | 0 |
| lib/validations | 0 | 0 | 5 | 0 | 0 | 0 |
| pages | 33 | 78 | 68 | 384 | 33 | 97 |
| pages/admin | 25 | 38 | 69 | 155 | 29 | 86 |
| pages/sicoob | 12 | 19 | 19 | 31 | 8 | 30 |
| pages/trends | 0 | 0 | 7 | 1 | 0 | 2 |
| routes/config | 0 | 0 | 8 | 444 | 53 | 143 |
| services | 0 | 0 | 7 | 5 | 4 | 15 |
| services/sicoob | 0 | 0 | 12 | 0 | 2 | 12 |
| stores | 0 | 0 | 6 | 0 | 0 | 0 |
| types | 0 | 0 | 19 | 12 | 6 | 8 |
| utils | 0 | 0 | 35 | 17 | 9 | 11 |

## Rotas (url → arquivo)
- `/` [tela] → src/pages/Index.tsx (protegida)
- `/*` [tela] → src/pages/NotFound.tsx
- `/*` [tela] → **ARQUIVO NÃO RESOLVIDO**
- `/403` [tela] → src/pages/ForbiddenPage.tsx
- `/admin/aprovacoes-desconto` [redirect] → **ARQUIVO NÃO RESOLVIDO** (protegida)
- `/admin/auditoria-propriedade` [tela] → src/pages/admin/OwnershipAuditAdminPage.tsx (protegida)
- `/admin/cadastros` [tela] → src/pages/admin/AdminCadastrosPage.tsx (protegida)
- `/admin/campanhas` [tela] → src/pages/admin/AdminCampanhasPage.tsx (protegida)
- `/admin/categories` [tela] → src/pages/admin/AdminCategoriesPage.tsx (protegida)
- `/admin/cms` [tela] → src/pages/admin/AdminCMSPage.tsx (protegida)
- `/admin/conexoes` [tela] → src/pages/admin/AdminConexoesPage.tsx (protegida)
- `/admin/conexoes/status` [tela] → src/pages/admin/AdminConexoesPage.tsx (protegida)
- `/admin/consumo-ia` [tela] → src/pages/admin/AdminAiUsagePage.tsx (protegida)
- `/admin/cooperativas` [tela] → src/pages/admin/AdminCooperativasPage.tsx (protegida)
- `/admin/design-system/colors` [tela] → src/pages/admin/ColorDocumentationPage.tsx (protegida)
- `/admin/external-db` [tela] → src/pages/admin/AdminExternalDbPage.tsx (protegida)
- `/admin/kit-templates` [tela] → src/pages/admin/KitTemplatesAdminPage.tsx (protegida)
- `/admin/limites-desconto` [tela] → src/pages/admin/SellerDiscountLimitsAdminPage.tsx (protegida)
- `/admin/login-attempts` [tela] → src/pages/admin/AdminLoginAttemptsPage.tsx (protegida)
- `/admin/newsletter` [tela] → src/pages/admin/AdminNewsletterPage.tsx (protegida)
- `/admin/pas` [tela] → src/pages/admin/AdminPAsPage.tsx (protegida)
- `/admin/performance` [tela] → src/pages/admin/AdminPerformancePage.tsx (protegida)
- `/admin/permissoes` [tela] → src/pages/PermissionsPage.tsx (protegida)
- `/admin/prompts-ia` [tela] → src/pages/admin/AdminPromptsIAPage.tsx (protegida)
- `/admin/qa/preflight` [tela] → src/pages/admin/qa/PreflightPage.tsx (protegida)
- `/admin/qa/release-evidences` [tela] → src/pages/admin/qa/ReleaseEvidencesPage.tsx (protegida)
- `/admin/rate-limit` [tela] → src/pages/RateLimitDashboardPage.tsx (protegida)
- `/admin/rbac-rotas` [tela] → src/pages/admin/AdminRbacRoutesPage.tsx (protegida)
- `/admin/rls-denials` [tela] → src/pages/admin/RlsDenialsAdminPage.tsx (protegida)
- `/admin/role-permissoes` [tela] → src/pages/RolePermissionsPage.tsx (protegida)
- `/admin/roles` [tela] → src/pages/RolesPage.tsx (protegida)
- `/admin/saude-testes` [tela] → src/pages/TestDashboard.tsx (protegida)
- `/admin/seguranca` [tela] → src/pages/admin/AdminSegurancaPage.tsx (protegida)
- `/admin/seguranca-acesso` [tela] → src/pages/admin/AdminSegurancaAcessoPage.tsx (protegida)
- `/admin/seguranca/chaves` [tela] → src/pages/admin/AdminSegurancaChavesPage.tsx (protegida)
- `/admin/seguranca/migracao-papeis` [tela] → src/pages/admin/AdminMigracaoPapeisPage.tsx (protegida)
- `/admin/seguranca/rls` [tela] → src/pages/admin/RLSAuditPage.tsx (protegida)
- `/admin/sicoob` [tela] → src/pages/admin/sicoob/SicoobManagementPage.tsx (protegida)
- `/admin/sicoob/notificacoes` [tela] → src/pages/admin/sicoob/SicoobApprovalReconciliationPage.tsx (protegida)
- `/admin/singulares` [tela] → src/pages/admin/AdminSingularesPage.tsx (protegida)
- `/admin/telemetria` [tela] → src/pages/admin/AdminTelemetriaPage.tsx (protegida)
- `/admin/temas` [tela] → src/pages/admin/AdminTemasPage.tsx (protegida)
- `/admin/usuarios` [tela] → src/pages/admin/AdminUsuariosPage.tsx (protegida)
- `/admin/validade-precos` [tela] → src/pages/admin/PriceFreshnessSettings.tsx (protegida)
- `/admin/verbas` [tela] → src/pages/admin/AdminVerbasPage.tsx (protegida)
- `/admin/video-variantes` [tela] → src/pages/admin/AdminVideoVariantsPage.tsx (protegida)
- `/admin/workflows` [tela] → src/pages/admin/AdminWorkflowsPage.tsx (protegida)
- `/ajuda` [tela] → src/pages/HelpCenterPage.tsx (protegida)
- `/approve/:token` [tela] → src/pages/QuoteApprovalPage.tsx
- `/busca-preco` [tela] → src/pages/AdvancedPriceSearchPage.tsx (protegida)
- `/carrinhos` [tela] → src/pages/SellerCartsPage.tsx (protegida)
- `/carrinhos/:cartId` [tela] → src/pages/SellerCartsPage.tsx (protegida)
- `/carrinhos/novo` [tela] → src/pages/SellerCartsPage.tsx (protegida)
- `/clientes` [tela] → src/pages/ClientsPage.tsx (protegida)
- `/colecao-publica/:token` [tela] → src/pages/PublicCollectionPage.tsx
- `/colecoes` [tela] → src/pages/CollectionsPage.tsx (protegida)
- `/colecoes/:id` [tela] → src/pages/CollectionDetailPage.tsx (protegida)
- `/comparar` [tela] → src/pages/ComparePage.tsx (protegida)
- `/comparar-publica/:token` [tela] → src/pages/PublicComparisonPage.tsx
- `/configuracoes` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/convite/:token` [tela] → src/pages/sicoob/SicoobInvitationAcceptPage.tsx
- `/dashboard` [tela] → src/pages/CustomizableDashboard.tsx (protegida)
- `/dashboard-pa` [tela] → src/pages/sicoob/PADashboardPage.tsx (protegida)
- `/demonstracao` [tela] → src/pages/sicoob/DemoPortalPage.tsx
- `/dossie/:token` [tela] → src/pages/PublicDossierPage.tsx
- `/dropbox` [tela] → src/pages/DropboxBrowserPage.tsx (protegida)
- `/estoque` [tela] → src/pages/StockDashboardPage.tsx (protegida)
- `/external-db-test` [tela] → src/pages/ExternalDatabaseTest.tsx (protegida)
- `/favoritos` [tela] → src/pages/FavoritesPage.tsx (protegida)
- `/ferramentas/bi` [tela] → src/pages/BusinessIntelligencePage.tsx (protegida)
- `/ferramentas/bi/comparar` [tela] → src/pages/ClientComparatorPage.tsx (protegida)
- `/filtros` [tela] → src/pages/FiltersPage.tsx (protegida)
- `/gestor` [tela] → src/pages/sicoob/GestorDashboardPage.tsx (protegida)
- `/gestor/agregados` [tela] → src/pages/sicoob/GestorConsolidatedOrdersPage.tsx (protegida)
- `/gestor/aprovacoes` [tela] → src/pages/sicoob/GestorApprovalsPage.tsx (protegida)
- `/gestor/auditoria` [tela] → src/pages/sicoob/GestorAuditPage.tsx (protegida)
- `/gestor/compras` [tela] → src/pages/GestorCompras.tsx (protegida)
- `/gestor/convites` [tela] → src/pages/sicoob/SicoobInvitationsPage.tsx (protegida)
- `/gestor/delegacoes` [tela] → src/pages/sicoob/GestorDelegationsPage.tsx
- `/gestor/orcamentos` [tela] → src/pages/GestorOrcamentos.tsx (protegida)
- `/instalar` [tela] → src/pages/PWAInstallPage.tsx
- `/inteligencia-comercial` [tela] → src/pages/CommercialIntelligencePage.tsx (protegida)
- `/kit/:token` [tela] → src/pages/PublicKitViewPage.tsx
- `/kpis/sicoob` [tela] → src/pages/sicoob/reports/SicoobKpiPage.tsx (protegida)
- `/lista-publica/:token` [tela] → src/pages/PublicFavoriteListPage.tsx
- `/login` [tela] → src/pages/Auth.tsx
- `/login` [tela] → src/pages/Auth.tsx
- `/loja-demo` [tela] → src/pages/sicoob/StorefrontDemoPage.tsx
- `/magic-up` [tela] → src/pages/MagicUp.tsx (protegida)
- `/match` [tela] → src/pages/ProductMatchPage.tsx (protegida)
- `/meus-kits` [tela] → src/pages/KitLibraryPage.tsx (protegida)
- `/meus-orcamentos` [tela] → src/pages/MeusOrcamentos.tsx (protegida)
- `/mockup-generator` [tela] → src/pages/MockupGenerator.tsx (protegida)
- `/mockups/historico` [tela] → src/pages/MockupHistoryPage.tsx (protegida)
- `/montar-kit` [tela] → src/pages/KitBuilderPage.tsx (protegida)
- `/notificacoes` [tela] → src/pages/NotificationsPage.tsx (protegida)
- `/novidades` [tela] → src/pages/NoveltiesPage.tsx (protegida)
- `/orcamentos` [tela] → src/pages/QuotesListPage.tsx (protegida)
- `/orcamentos/:id` [tela] → src/pages/QuoteViewPage.tsx (protegida)
- `/orcamentos/:id/editar` [tela] → src/pages/QuoteBuilderPage.tsx (protegida)
- `/orcamentos/:id/visualizar` [tela] → src/pages/QuoteViewPage.tsx (protegida)
- `/orcamentos/dashboard` [tela] → src/pages/QuotesDashboardPage.tsx (protegida)
- `/orcamentos/kanban` [tela] → src/pages/QuotesKanbanPage.tsx (protegida)
- `/orcamentos/lista` [tela] → src/pages/QuotesListPage.tsx (protegida)
- `/orcamentos/novo` [tela] → src/pages/QuoteBuilderPage.tsx (protegida)
- `/orcamentos/templates` [tela] → src/pages/QuoteTemplatesPage.tsx (protegida)
- `/pa/verba` [tela] → src/pages/sicoob/PAWalletPage.tsx (protegida)
- `/pedidos` [tela] → src/pages/OrdersPage.tsx (protegida)
- `/pedidos/:id` [tela] → src/pages/OrderDetailPage.tsx (protegida)
- `/pedidos/:id/auditoria` [tela] → src/pages/OrderAuditPage.tsx (protegida)
- `/perfil` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/produto/:id` [tela] → src/pages/ProductDetail.tsx (protegida)
- `/produtos` [tela] → src/pages/FiltersPage.tsx (protegida)
- `/proposta/:token` [tela] → src/pages/QuoteApprovalPage.tsx
- `/public/colecao/:token` [tela] → src/pages/PublicCollectionPage.tsx
- `/public/comparativo/:token` [tela] → src/pages/PublicComparisonPage.tsx
- `/public/dossie/:token` [tela] → src/pages/PublicDossierPage.tsx
- `/public/favoritos/:token` [tela] → src/pages/PublicFavoriteListPage.tsx
- `/public/kit/:token` [tela] → src/pages/PublicKitViewPage.tsx
- `/public/orcamento/:token/aprovacao` [tela] → src/pages/QuoteApprovalPage.tsx
- `/relatorios/sicoob` [tela] → src/pages/sicoob/reports/SicoobReportsPage.tsx (protegida)
- `/reposicao` [tela] → src/pages/ReplenishmentsPage.tsx (protegida)
- `/reset-password` [tela] → src/pages/ResetPassword.tsx
- `/reset-password` [tela] → src/pages/ResetPassword.tsx
- `/sicoob/logistica` [tela] → src/pages/sicoob/LogisticsReportPage.tsx (protegida)
- `/sicoob/pedidos` [tela] → src/pages/sicoob/orders/OrdersPage.tsx (protegida)
- `/sicoob/pedidos/:id` [tela] → src/pages/sicoob/orders/OrderDetailPage.tsx (protegida)
- `/sicoob/pedidos/kanban` [tela] → src/pages/sicoob/orders/OrdersKanbanPage.tsx (protegida)
- `/sicoob/qa/preflight` [tela] → src/pages/admin/qa/PreflightPage.tsx (protegida)
- `/sicoob/vendas` [tela] → src/pages/sicoob/orders/SellerPanelPage.tsx (protegida)
- `/simulador` [tela] → src/pages/SimuladorWizard.tsx (protegida)
- `/simulador-precos` [tela] → src/pages/PriceSimulatorPage.tsx (protegida)
- `/sso/callback` [tela] → src/pages/SSOCallbackPage.tsx
- `/sso/callback` [tela] → src/pages/SSOCallbackPage.tsx
- `/status` [tela] → src/pages/SystemStatusPage.tsx (protegida)
- `/tendencias` [tela] → src/pages/TrendsPage.tsx (protegida)
- `/vendedor/dashboard` [tela] → src/pages/sicoob/vendedor/SellerDashboardPage.tsx (protegida)
- `/verificacao` [tela] → src/pages/VerificationPage.tsx
- `/verificacao` [tela] → src/pages/VerificationPage.tsx

## Rotas HTTP de backend
- `OPTIONS  }
    return new Response(
      JSON.stringify({
        error: ERR.KEY_AUTO_REVOKED_DEV,
        message: ` → supabase/functions/mcp-server/index.ts
- `GET /{t}` → scripts/ai-context/cenarios.mjs
- `GET /a` → scripts/ai-context/cenarios.mjs
- `GET /a` → scripts/ai-context/cenarios.mjs
- `POST /b` → scripts/ai-context/cenarios.mjs
- `POST /b` → scripts/ai-context/cenarios.mjs
- `DELETE /c` → scripts/ai-context/cenarios.mjs
- `PUT /d` → scripts/ai-context/cenarios.mjs
- `GET /items` → scripts/ai-context/gerar.unit.mjs
- `GET /u` → scripts/ai-context/cenarios.mjs
- `GET /users` → scripts/ai-context/cenarios.mjs
- `POST /users/:id` → scripts/ai-context/cenarios.mjs
- `GET /x` → scripts/ai-context/cenarios.mjs

## Vistas por id (menu/ViewRouter → arquivo)
- (nenhum)

## Edge functions
- `admin-audit-hook` — tabelas: admin_audit_log; chamada por 1 arquivo(s) do front
- `ai-recommendations` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `analyze-logo-colors` — tabelas: -; chamada por 1 arquivo(s) do front
- `auth-integrity-check` — tabelas: -; chamada por 1 arquivo(s) do front
- `bi-copilot` — tabelas: -; chamada por 1 arquivo(s) do front
- `bi-share-dossier` — tabelas: -; chamada por 1 arquivo(s) do front
- `bitrix-sync` — tabelas: bitrix_clients, bitrix_deals, bitrix_sync_logs; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `block-ip-temporarily` — tabelas: admin_audit_log, ip_access_control, user_roles; chamada por 1 arquivo(s) do front
- `categories-api` — tabelas: categories, categories_tree_visual, product_categories, product_category_assignments, products; chamada por 1 arquivo(s) do front
- `cleanup-notifications` (verify_jwt=false) — tabelas: -; chamada por 0 arquivo(s) do front
- `cleanup-novelties` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `cnpj-lookup` — tabelas: -; chamada por 1 arquivo(s) do front
- `collections-public-react` — tabelas: bot_detection_log, collection_item_reactions, collection_items, collections; chamada por 1 arquivo(s) do front
- `collections-watcher` (verify_jwt=false) — tabelas: collection_items, collections, products, workspace_notifications; chamada por 0 arquivo(s) do front
- `commemorative-dates` — tabelas: v_commemorative_dates_with_colors; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `comparison-ai-advisor` — tabelas: -; chamada por 1 arquivo(s) do front
- `comparison-price-watcher` (verify_jwt=false) — tabelas: price_history, user_comparisons, workspace_notifications; chamada por 0 arquivo(s) do front
- `comparisons-public-react` — tabelas: bot_detection_log, comparison_reactions, user_comparisons; chamada por 1 arquivo(s) do front
- `connection-tester` — tabelas: connection_test_history, external_connections, user_roles; chamada por 4 arquivo(s) do front
- `connections-auto-test` — tabelas: external_connections; chamada por 0 arquivo(s) do front, por SQL/cron
- `connections-health-check` (verify_jwt=false) — tabelas: connection_test_history, external_connections, outbound_webhooks, secret_rotation_log, user_roles, workspace_notifications; chamada por 0 arquivo(s) do front, por SQL/cron
- `connections-hub-audit` — tabelas: -; chamada por 1 arquivo(s) do front
- `crm-db-bridge` (verify_jwt=false) — tabelas: companies, contact_emails, contact_phones, contacts, profiles, quotes, user_roles; chamada por 1 arquivo(s) do front
- `detect-new-device` — tabelas: device_login_notifications, user_known_devices, workspace_notifications; chamada por 1 arquivo(s) do front
- `dropbox-list` — tabelas: -; chamada por 1 arquivo(s) do front
- `e2e-auth-test` — tabelas: pa_budgets, postos_atendimento, profiles; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `e2e-cleanup` — tabelas: e2e_cleanup_audit, quotes, seller_cart_items, seller_carts; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `elevenlabs-scribe-token` — tabelas: -; chamada por 1 arquivo(s) do front
- `elevenlabs-tts` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `error-monitor` — tabelas: telemetry_query_performance, user_roles, workspace_notifications; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `expert-chat` (verify_jwt=false) — tabelas: categories, companies, customers, orders, product_category_assignments, products, profiles, quotes, sensitive_access_logs, suppliers; chamada por 0 arquivo(s) do front
- `external-connections-sync` — tabelas: -; chamada por 1 arquivo(s) do front
- `external-db-bridge` (verify_jwt=false) — tabelas: products, suppliers, tabela_preco_gravacao_oficial, tabela_preco_gravacao_oficial_faixa; chamada por 15 arquivo(s) do front, por SQL/cron
- `external-db-inspect` — tabelas: -; chamada por 2 arquivo(s) do front
- `favorites-public-react` — tabelas: bot_detection_log, favorite_item_reactions, favorite_items, favorite_lists; chamada por 1 arquivo(s) do front
- `favorites-watcher` (verify_jwt=false) — tabelas: favorite_items, products, workspace_notifications; chamada por 0 arquivo(s) do front
- `force-global-logout` — tabelas: admin_audit_log, user_roles; chamada por 1 arquivo(s) do front
- `full-op-diagnostics` — tabelas: step_up_tokens; chamada por 1 arquivo(s) do front
- `generate-ad-image` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `generate-ad-prompt` — tabelas: -; chamada por 1 arquivo(s) do front
- `generate-mockup` — tabelas: mockup_prompt_configs; chamada por 1 arquivo(s) do front
- `generate-mockup-nanobanana` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `generate-product-seo` — tabelas: -; chamada por 1 arquivo(s) do front
- `get-app-logs` — tabelas: query_telemetry; chamada por 1 arquivo(s) do front
- `get-visitor-info` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `github-credentials-test` — tabelas: admin_audit_log, integration_credentials, user_roles; chamada por 1 arquivo(s) do front
- `github-fix-config` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `health-check` (verify_jwt=false) — tabelas: -; chamada por 0 arquivo(s) do front
- `image-proxy` — tabelas: -; chamada por 1 arquivo(s) do front
- `kit-ai-builder` — tabelas: -; chamada por 1 arquivo(s) do front
- `kit-identity-suggest` — tabelas: -; chamada por 1 arquivo(s) do front
- `kit-public-view` — tabelas: custom_kits, kit_share_tokens, organization_members, organizations, profiles; chamada por 1 arquivo(s) do front
- `log-login-attempt` — tabelas: login_attempts; chamada por 2 arquivo(s) do front
- `magic-up-score` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `manage-users` — tabelas: admin_audit_log, profiles, user_roles; chamada por 2 arquivo(s) do front
- `market-intelligence-insights` — tabelas: ai_insights_cache, ai_usage_events, order_items, orders, quotes; chamada por 1 arquivo(s) do front
- `materials-api` — tabelas: material_groups, material_types, mv_material_group_stats, product_materials; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `mcp-keys-issue` — tabelas: mcp_api_keys; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `mcp-keys-revoke` — tabelas: mcp_api_keys; chamada por 2 arquivo(s) do front
- `mcp-keys-rotate` — tabelas: mcp_api_keys; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `mcp-keys-update` — tabelas: mcp_api_keys; chamada por 2 arquivo(s) do front
- `mcp-server` — tabelas: admin_audit_log, orders, quotes; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `migrate-helper` (verify_jwt=false) — tabelas: -; chamada por 0 arquivo(s) do front
- `migration-health-check` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `monthly-health-report` (verify_jwt=false) — tabelas: sicoob_orders, telemetry_query_performance; chamada por 0 arquivo(s) do front
- `ownership-audit` (verify_jwt=false) — tabelas: ownership_audit_reports; chamada por 1 arquivo(s) do front
- `ownership-repair` — tabelas: ownership_repair_logs, user_roles; chamada por 1 arquivo(s) do front
- `process-batch-export` (verify_jwt=false) — tabelas: export_audit_log, export_jobs, exports, quotes, workspace_notifications; chamada por 0 arquivo(s) do front, por SQL/cron
- `process-queue` (verify_jwt=false) — tabelas: workspace_notifications; chamada por 0 arquivo(s) do front
- `process-scheduled-reports` (verify_jwt=false) — tabelas: orders, quotes, scheduled_reports; chamada por 0 arquivo(s) do front
- `product-webhook` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `qa-block-monitor` — tabelas: query_telemetry; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `quote-approval` (verify_jwt=false) — tabelas: -; chamada por 2 arquivo(s) do front
- `quote-followup-reminders` (verify_jwt=false) — tabelas: follow_up_reminders, quote_approval_tokens, quotes; chamada por 0 arquivo(s) do front
- `quote-price-attestation` — tabelas: product_images, product_variants, products, quote_item_personalizations, quote_items, quotes; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `quote-public-view` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `quote-sync` — tabelas: profiles, quote_items, quotes; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `rate-limit-check` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `rls-audit` — tabelas: profiles, quotes; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `rls-integration-tests` — tabelas: user_roles; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `rls-matrix-export` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `secrets-manager` — tabelas: admin_audit_log, integration_credentials, secret_rotation_log, user_roles; chamada por 4 arquivo(s) do front
- `secure-upload` — tabelas: file_scan_logs; chamada por 2 arquivo(s) do front
- `semantic-search` — tabelas: -; chamada por 1 arquivo(s) do front
- `send-digest` (verify_jwt=false) — tabelas: workspace_notifications; chamada por 0 arquivo(s) do front
- `send-notification` (verify_jwt=false) — tabelas: notification_digests, notification_logs, notification_preferences, scheduled_notifications, workspace_notifications; chamada por 0 arquivo(s) do front
- `send-scheduled-reports` (verify_jwt=false) — tabelas: orders, quotes, scheduled_reports; chamada por 0 arquivo(s) do front
- `send-transactional-email` — tabelas: -; chamada por 1 arquivo(s) do front
- `sicoob-approval-notifications` (verify_jwt=false) — tabelas: sicoob_approval_requests; chamada por 0 arquivo(s) do front, por SQL/cron
- `sicoob-approval-reconciliation` — tabelas: sicoob_approval_deliveries; chamada por 1 arquivo(s) do front
- `sicoob-artwork-register` — tabelas: -; chamada por 1 arquivo(s) do front
- `sicoob-document-ingest` — tabelas: sicoob_document_registry; chamada por 1 arquivo(s) do front
- `sicoob-kit-quote` — tabelas: -; chamada por 1 arquivo(s) do front
- `sicoob-reorder` — tabelas: quote_item_personalizations, quote_items, quotes, sicoob_order_items, sicoob_orders; chamada por 2 arquivo(s) do front
- `sicoob-seed` — tabelas: admin_audit_log, cooperativas, pa_budgets, postos_atendimento, profiles, sicoob_centrais, user_roles; chamada por 1 arquivo(s) do front
- `sicoob-seed-debug` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `sicoob-seed-qa` — tabelas: cooperativas, pa_budgets, postos_atendimento, profiles, qa_run_steps, qa_runs, sicoob_approval_requests, sicoob_orders, user_roles; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `step-up-verify` — tabelas: step_up_audit_log, step_up_challenges; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `sync-quote-bitrix` — tabelas: companies, product_variants, quote_item_personalizations, quote_items, quotes; chamada por 1 arquivo(s) do front
- `system-healthcheck` — tabelas: profiles; chamada por 1 arquivo(s) do front
- `trends-insights` — tabelas: product_views, profiles, search_analytics; chamada por 1 arquivo(s) do front
- `validate-access` — tabelas: access_blocked_log, access_security_settings, city_whitelist, ip_whitelist, login_attempts; chamada por 1 arquivo(s) do front
- `verify-email` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `visual-search` — tabelas: products; chamada por 1 arquivo(s) do front
- `voice-agent` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `webhook-dispatcher` (verify_jwt=false) — tabelas: outbound_webhooks, webhook_deliveries; chamada por 2 arquivo(s) do front, por SQL/cron
- `webhook-inbound` — tabelas: inbound_webhook_endpoints, inbound_webhook_events; chamada por 0 arquivo(s) do front — **ÓRFÃ**

## Cron jobs (pg_cron / vercel)
- `archive-old-admin-audit-logs` 0 2 * * * (20260916120000_admin_audit_log_operations.sql)
- `audit-sicoob-rls` 0 0 * * * (20260502151242_d1ada440-f79e-40a8-838a-210eb0f65d1f.sql)
- `auto-block-extreme-offenders` */15 * * * * (20260419125044_030d3b11-a20a-4092-8fd3-f30da17ff7e8.sql)
- `auto-revoke-orphan-mcp-full-keys` */15 * * * * (20260426122751_c0bc82e4-dc78-47da-8da4-74691b181d3d.sql)
- `cleanup-discount-test-data` 10 4 * * * (20260916120000_admin_audit_log_operations.sql)
- `cleanup-expired-collection-trash` 0 3 * * * (20260916120000_admin_audit_log_operations.sql)
- `cleanup-expired-favorite-trash` 10 3 * * * (20260916120000_admin_audit_log_operations.sql)
- `cleanup-expired-public-comparisons` 20 3 * * * (20260916120000_admin_audit_log_operations.sql)
- `cleanup-expired-step-up` */15 * * * * (20260916120000_admin_audit_log_operations.sql)
- `cleanup-old-notifications` 30 3 * * * (20260916120000_admin_audit_log_operations.sql)
- `cleanup-rate-limits` 0 * * * * (20260916120000_admin_audit_log_operations.sql)
- `cleanup-security-logs` 40 3 * * * (20260916120000_admin_audit_log_operations.sql)
- `cleanup-webhook-logs` 50 3 * * * (20260916120000_admin_audit_log_operations.sql)
- `connections-auto-test` */15 * * * * → edge connections-auto-test (20260429163414_schedule_connections_auto_test_cron.sql)
- `connections-health-check` 7,22,37,52 * * * * (20261118130000_harden_storage_and_public_favorites_acl.sql)
- `ensure-admin-audit-log-partitions` 0 3 1 * * (20260916120000_admin_audit_log_operations.sql)
- `external-db-bridge-keepalive` */4 * * * * → edge external-db-bridge (20260424154125_0988f1e1-658b-423c-ae58-d4166a59fc10.sql)
- `hardening-regression-check-daily` 0 4 * * * (20260419121414_3259f186-81ef-478e-80da-0d5950fc86fe.sql)
- `process-export-queue` * * * * * → edge process-batch-export (20260503155739_dc1cd5cb-7912-499a-847e-9c792abb6777.sql)
- `sicoob-approval-outbox-monitor` */2 * * * * (20260922225500_monitor_sicoob_approval_worker.sql)
- `sicoob-approval-outbox-retention` 23 3 * * * (20260922225300_sicoob_approval_outbox_reconciliation.sql)
- `sicoob-approval-outbox-worker` * * * * * (20260922224300_schedule_sicoob_approval_worker.sql)
- `sicoob-materialize-overdue-payments` 17 * * * * (20260922225200_materialize_overdue_sicoob_payments.sql)
- `snapshot-hardening-daily` 5 4 * * * (20260419125044_030d3b11-a20a-4092-8fd3-f30da17ff7e8.sql)
- `trim-connection-test-history` 0 4 * * * (20260916120000_admin_audit_log_operations.sql)
- `webhook-logs-cleanup-daily` 30 3 * * * (20260419132122_f0173d5d-9d5c-4974-bf22-bfb2f22f7000.sql)
- `webhook-retry-failed` */10 * * * * (20260419132122_f0173d5d-9d5c-4974-bf22-bfb2f22f7000.sql)

## Integrações externas
- SDKs: ElevenLabs, Sentry, Supabase, react-query, zod
- hosts mais citados: wa.me, cfmzkthhgliqelozlmwu.supabase.co, api.resend.com, ai.gateway.lovable.dev, simulacao.invalid, qa-sicoob-123.supabase.co, doufsxqlfjyuvxuezpln.supabase.co, test.supabase.co, api.supabase.com, hooks.slack.com, imagedelivery.net, portal.invalid, youtube.com, api.elevenlabs.io, api.ipify.org
- webhooks recebidos: cleanup-notifications, collections-watcher, comparison-price-watcher, connections-health-check, crm-db-bridge, expert-chat, external-db-bridge, favorites-watcher, health-check, migrate-helper, monthly-health-report, ownership-audit, process-batch-export, process-queue, process-scheduled-reports, quote-approval, quote-followup-reminders, send-digest, send-notification, send-scheduled-reports, sicoob-approval-notifications, webhook-dispatcher
- env de integração (só nomes): BITRIX24_WEBHOOK_URL, BI_SHARE_SECRET, CNPJA_API_KEY, DROPBOX_ACCESS_TOKEN, E2E_CLEANUP_TOKEN, ELEVENLABS_API_KEY, LOVABLE_API_KEY, N8N_QUOTE_WEBHOOK_URL, QUOTE_SYNC_API_KEY, RESEND_API_KEY, SALESPRO_WEBHOOK_URL, SICOOB_APPROVAL_WORKER_SECRET, SICOOB_MALWARE_SCANNER_TOKEN, VIRUSTOTAL_API_KEY, VITE_SENTRY_DSN

## Permissões / papéis
- papéis no código: alert (59), status (54), dev (43), supervisor (29), user (29), vendedor (24), admin (22), agente (16), system (16), button (14), dialog (12), group (11), list (11), listitem (11), combobox (7), img (7), progressbar (6), tab (6), tablist (6), assistant (5), manager (5), navigation (5), radio (5), radiogroup (5), region (5), switch (5), authenticated (4), listbox (4), public (4), alertdialog (3), gerente_pa (3), gestor_pa (3), gestor_singular (3), main (3), presentation (3), separator (3), agent (2), all (2), anon (2), gestor_compras (2), log (2), option (2), owner (2), string (2), toolbar (2), tooltip (2), article (1), banner (1), complementary (1), comprador_singular (1), contentinfo (1), document (1), editor (1), grid (1), gridcell (1), heading (1), link (1), menu (1), none (1), publico (1), seller (1), service_role (1), sicoob_central (1), sicoob_gestor (1), sicoob_pa (1), sicoob_singular (1), sup (1)
- enums de papel: app_role: admin|manager|vendedor|supervisor|dev|gestor_compras|gerente_pa|comprador_pac|comprador_singular|comprador_pac|comprador_singular; org_role: owner|admin|member; role_migration_status: pending|running|completed|failed|partial|dry_run; role_migration_item_status: pending|success|failed|skipped|dry_run
- guards: src/components/admin/telemetry/RegressionGuardrailBanner.tsx, src/components/layout/ProtectedRoute.tsx · rotas protegidas: 108 · públicas: /*, /*, /403, /approve/:token, /colecao-publica/:token, /comparar-publica/:token, /convite/:token, /demonstracao, /dossie/:token, /gestor/delegacoes, /instalar, /kit/:token, /lista-publica/:token, /login, /login, /loja-demo, /proposta/:token, /public/colecao/:token, /public/comparativo/:token, /public/dossie/:token, /public/favoritos/:token, /public/kit/:token, /public/orcamento/:token/aprovacao, /reset-password, /reset-password, /sso/callback, /sso/callback, /verificacao, /verificacao
- feature flags: ENABLE_DEMO_PAGES, ENABLE_RLS, FEATURE_GROUPS, FEATURE_X, nova-tela, novo-inbox

## Alertas (baseline.json → alertas)
- rotas_sem_arquivo: 1 — ex.: /*
- componentes_ambiguos: 0
- menu_sem_destino: 14 — ex.: Ação -> #fab, Bem-vindo ao Brindes Sicoob! -> welcome, Busca Inteligente -> search
- edges_orfas: 33 — ex.: ai-recommendations, bitrix-sync, cleanup-novelties
- edges_chamadas_sem_pasta: 0
- tabelas_sem_rls: 18 — ex.: admin_audit_log_default, admin_audit_log_y2024, admin_audit_log_y2025
- tabelas_usadas_sem_definicao: 16 — ex.: avatars, categories_tree_visual, contacts
- tabelas_com_drift_migration_vs_types: 37 — ex.: admin_settings, art_file_attachments, audit_log
- rpcs_sem_definicao: 10 — ex.: fn_get_customization_price, fn_get_product_customization_options, get_active_commemorative_dates
- componentes_orfaos: 72 — ex.: src/components/admin/CatalogQualityDashboard.tsx, src/components/admin/connections/ConnectionErrorDetailsDialog.tsx, src/components/admin/DiscountApprovalQueue.tsx
- componentes_com_nome_duplicado: 40 — ex.: BreadcrumbItem, BulkAction, CardSkeleton
- scripts_orfaos: 0
- env_usadas_nao_declaradas: 16 — ex.: DEV, MODE, PROD
- ciclos_de_import: 15
- possiveis_segredos_no_codigo: 1 — ex.: scripts/ai-context/cenarios.mjs:103

## Grafo de código (graphify)
- 36552 nós · 60764 arestas · 2709 comunidades · grafo do commit `cf2d42bc`
- comunidades maiores: ref_hooks (589), ref_components (418), ref_lib (290), ref_integrations (262), sonner (231), ref_node_fs (224), framer-motion (207), ref_contexts (206), react-router-dom (204), date-fns (202), expert-chat/index.ts (194), react (167)
- símbolos mais chamados: q() (scripts/supabase_snapshot/snapshot.py), useExternalDatabase() (src/hooks/useExternalDatabase.ts), .collect() (scripts/supabase_snapshot/test_snapshot.py), excluded_sql() (scripts/supabase_snapshot/snapshot.py), fail() (scripts/automation.mjs), fail() (scripts/graphify-local.mjs), .metadata() (scripts/supabase_snapshot/test_snapshot.py), MaintenanceError (scripts/maintenance/lib.mjs), header() (scripts/regras_negocio/generate.py), jsonResponse() (supabase/functions/crm-db-bridge/index.ts), uniq() (scripts/ai-context/gerar.mjs), SectionCard() (src/components/admin/products/ProductFormHelpers.tsx)
- consulta local: `graphify query "<pergunta>"`, `graphify path "<A>" "<B>"`, `graphify explain "<X>"`

## Hotspots (arquivos mais alterados, 90 dias)
- docs/plano-melhorias-50-etapas.md (24)
- docs/correcoes-validacao-2026-09-14.md (23)
- package.json (22)
- scripts/db/apply-sicoob-migrations.mjs (22)
- PENDENCIAS.md (21)
- RELATORIO_CI.md (20)
- .github/workflows/sicoob-ci.yml (18)
- package-lock.json (18)
- .github/workflows/ci.yml (17)
- .github/workflows/codeql.yml (17)
- .github/workflows/e2e.yml (16)
- .github/workflows/lighthouse.yml (15)
- src/integrations/supabase/types.ts (14)
- .github/workflows/deploy-sicoob-functions.yml (13)
- .github/workflows/bundle-check.yml (12)

## Workflows
- `apply-sicoob-migrations.yml` — Aplicar migrations Sicoob (workflow_dispatch)
- `automation-local.yml` — Automação local (pull_request, push, workflow_dispatch)
- `branch-protection-sentinel.yml` — Branch Protection Sentinel (push, workflow_dispatch)
- `bundle-check.yml` — Bundle Size Check (pull_request)
- `ci.yml` — Qualidade contínua (pull_request, push)
- `codeql.yml` — CodeQL (pull_request, push, schedule; cron 0 9 * * 1)
- `contexto.yml` — Contexto para agentes de IA (10 min) (push, schedule, workflow_dispatch; cron 7 * * * *)
- `db-performance-audit.yml` — Monthly DB Audit (schedule, workflow_dispatch; cron 0 0 1 * *)
- `dependency-review.yml` — Dependency Review (pull_request)
- `deploy-sicoob-functions.yml` — Publicar funções Sicoob (workflow_dispatch)
- `e2e.yml` — E2E (Playwright) (pull_request, workflow_dispatch)
- `inventario-estado-semanal.yml` — Inventário do estado real (semanal) (schedule, workflow_dispatch; cron 41 10 * * 1)
- `lighthouse.yml` — Lighthouse Performance Audit (pull_request)
- `migration-ledger-drift.yml` — Migration ledger drift (schedule, workflow_dispatch; cron 0 6 * * *)
- `security-compliance.yml` — Enterprise Compliance & Audit Reporting (push, schedule, workflow_dispatch; cron 0 0 * * 0)
- `security.yml` — Security Scan (pull_request, push, schedule; cron 30 6 * * 1)
- `sicoob-ci.yml` — Portal Sicoob (pull_request, push)

## Scripts npm
- `maintenance:doctor`: `sh scripts/maintenance/run.sh doctor --root .`
- `maintenance:check`: `sh scripts/maintenance/run.sh check --root . --ref origin/main`
- `maintenance:heal`: `sh scripts/maintenance/run.sh heal --root . --ref origin/main`
- `test:maintenance`: `node --test scripts/maintenance/maintenance.unit.mjs`
- `dev`: `vite`
- `build`: `vite build`
- `build:dev`: `npm run typecheck:baseline && vite build --mode development`
- `preview`: `vite preview`
- `test`: `vitest run`
- `test:coverage:ci`: `vitest run --coverage --coverage.reporter=text --coverage.reporter=json-summary --coverage.reporter=html --coverage.reporter=lcov --coverage.thresholds.statements=80 --coverage.thresholds.branches=80`
- `test:run`: `vitest run`
- `test:coverage`: `vitest run --coverage`
- `coverage`: `vitest run --coverage`
- `test:price-freshness`: `bash -c 'set -euo pipefail; files=( tests/utils/price-freshness*.test.ts tests/components/PriceFreshnessBadge*.test.tsx ); vitest run "${files[@]}" --coverage --coverage.reporter=text --coverage.reporter=json-summary --coverage.reporter=html --coverage.include=src/utils/price-freshness.ts --coverage.include=src/components/products/PriceFreshnessBadge.tsx --coverage.thresholds.statements=0 --coverage.thresholds.branches=0 --coverage.thresholds.functions=0 --coverage.thresholds.lines=0 && node scripts/check-price-freshness-coverage.mjs'`
- `lint`: `npm run lint:check`
- `lint:check`: `eslint src`
- `lint:baseline`: `node scripts/check-eslint-baseline.mjs`
- `lint:baseline:update`: `node scripts/eslint-baseline-generate.mjs`
- `typecheck`: `tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json`
- `typecheck:baseline`: `node scripts/check-typecheck-baseline.mjs`
- `typecheck:baseline:update`: `node scripts/check-typecheck-baseline.mjs --update`
- `typecheck:files`: `node scripts/tscheck-files.mjs`
- `gaps`: `node scripts/rules/run.mjs`
- `autofix`: `node scripts/autofix/run.mjs`
- `autofix:apply`: `node scripts/autofix/run.mjs --apply`
- `format`: `prettier --write "src/**/*.{ts,tsx,css}"`
- `format:check`: `prettier --check "src/**/*.{ts,tsx,css}"`
- `prepare`: `husky`
- `test:e2e`: `rm -rf e2e-artifacts playwright-report && npx playwright test --grep-invert '@smoke|@header-sticky'`
- `test:e2e:ui`: `npx playwright test --grep-invert '@smoke|@header-sticky' --ui`
- `test:e2e:headed`: `npx playwright test --grep-invert '@smoke|@header-sticky' --headed`
- `test:e2e:debug`: `npx playwright test --grep-invert '@smoke|@header-sticky' --debug`
- `test:e2e:report`: `npx playwright show-report`
- `test:e2e:install`: `npx playwright install --with-deps chromium`
- `test:e2e:pwa`: `npx playwright test --config=playwright.pwa.config.ts`
- `test:cleanup`: `node scripts/e2e-cleanup.mjs`
- `check:seller-scope`: `node scripts/check-seller-scope.mjs`
- `check:route-error-element`: `node scripts/check-route-error-element.mjs`
- `check:aschild-nesting`: `node scripts/check-aschild-nesting.mjs`
- `check:route-ref-usage`: `node scripts/check-route-ref-usage.mjs`
- `test:strict-ref`: `STRICT_REF_WARNINGS=1 vitest run && node scripts/consolidate-console-snapshot.mjs`
- `smoke`: `node scripts/smoke-tests.mjs`
- `test:e2e:smoke`: `node scripts/run-smoke-filtered.mjs`
- `test:e2e:smoke:2h`: `node scripts/run-smoke-filtered.mjs --tag @smoke-2h`
- `test:e2e:smoke:headed`: `npx playwright test --project=chromium-smoke --workers=1 --headed`
- `test:e2e:smoke:ui`: `npx playwright test --project=chromium-smoke --workers=1 --ui`
- `test:e2e:smoke:debug`: `npx playwright test --project=chromium-smoke --workers=1 --debug`
- `test:e2e:smoke:report`: `npm run test:e2e:smoke; node scripts/e2e-smoke-summary.mjs; node scripts/e2e-feature-summary.mjs`
- `test:e2e:regression`: `npx playwright test --project=chromium-public --project=chromium-authed --project=routes-public --project=routes-authed --grep-invert '@smoke|@header-sticky'`
- `test:e2e:regression:headed`: `npx playwright test --project=chromium-public --project=chromium-authed --project=routes-public --project=routes-authed --grep-invert '@smoke|@header-sticky' --headed`
- `test:e2e:regression:ui`: `npx playwright test --project=chromium-public --project=chromium-authed --project=routes-public --project=routes-authed --grep-invert '@smoke|@header-sticky' --ui`
- `test:e2e:regression:report`: `npm run test:e2e:regression; node scripts/e2e-feature-summary.mjs`
- `test:e2e:mobile`: `npx playwright test --project=routes-mobile`
- `test:e2e:header-sticky`: `npx playwright test e2e/flows/22-header-sticky.spec.ts --max-failures=1 --reporter=github,list`
- `test:e2e:all`: `npm run test:e2e:smoke && npm run test:e2e:header-sticky && npm run test:e2e:regression`
- `e2e:summary`: `node scripts/e2e-feature-summary.mjs`
- `e2e:smoke-summary`: `node scripts/e2e-smoke-summary.mjs`
- `e2e:smoke-tags-check`: `node scripts/check-smoke-tags.mjs`
- `e2e:smoke-coverage-doc`: `node scripts/e2e-smoke-coverage-doc.mjs`
- `e2e:smoke-coverage-check`: `node scripts/e2e-smoke-coverage-doc.mjs --check`
- `check:security-definer-acl`: `node scripts/check-security-definer-acl.mjs`
- `check:critical-test-skips`: `node scripts/check-critical-test-skip-budget.mjs`
- `check:npm-audit`: `node scripts/check-npm-audit.mjs`
- `check:agents-md`: `node scripts/ci/check-agents-md-integrity.mjs`
- `graph:setup`: `bash scripts/graphify/setup.sh`
- `graph:update`: `graphify update .`
- `contexto:ia`: `node scripts/ai-context/gerar.mjs --out docs/contexto/codigo`
- `contexto:ia:test`: `node --test scripts/ai-context/gerar.unit.mjs`
- `contexto:ia:cenarios`: `node scripts/ai-context/cenarios.mjs`
- `contexto:regras`: `python3 scripts/regras_negocio/generate.py --repo . --out docs/contexto/regras --profile regras --schema-snapshot docs/contexto/supabase --index-path docs/contexto/00-INDEX.md --no-pointer`
- `contexto:regras:test`: `python3 scripts/regras_negocio/test_generate.py`
- `inventario:banco`: `node scripts/inventario/gerar-banco.mjs`
- `inventario:rotas`: `node scripts/inventario/gerar-rotas.mjs`
- `inventario:rotas:check`: `node scripts/inventario/gerar-rotas.mjs --check`
- `inventario:repo`: `node scripts/inventario/gerar-repo.mjs`
- `inventario:mudou`: `node scripts/inventario/mudou-conteudo.mjs`
- `inventario:test`: `node --test scripts/inventario/gerar-banco.unit.mjs scripts/inventario/mudou-conteudo.unit.mjs`
- `check:live-api-inventory`: `node scripts/db/check-live-api-inventory.mjs`
- `seed:qa`: `node scripts/seed-qa.mjs`
- `test:rls`: `node scripts/test-rls.mjs`
- `healthcheck`: `node scripts/healthcheck.mjs`
- `test:simulation`: `node scripts/simulate-webhooks.mjs`
- `test:load`: `node scripts/load-test.mjs`
- `test:fuzzing`: `vitest run tests/unit/fuzzing.test.ts`
- `test:scenarios`: `node --test tests/scenarios/*.mjs`
- `qa:visual:login`: `node scripts/qa/login-browser.mjs`
- `qa:visual:demo`: `node scripts/qa/demo-browser.mjs`
- `audit:dossier`: `playwright install chromium && node scripts/enterprise-dossier-builder.mjs`
- `automation:doctor`: `node scripts/automation.mjs doctor`
- `automation:test`: `node scripts/automation.mjs test`
- `automation:check`: `node scripts/automation.mjs check --ref HEAD`
- `automation:heal`: `node scripts/automation.mjs heal --ref origin/main`
- `automation:nightly`: `node scripts/automation.mjs nightly --ref origin/main`
- `automation:graph`: `node scripts/automation.mjs graph`
- `automation:status`: `node scripts/automation.mjs graph status`
- `automation:install-hooks`: `node scripts/automation.mjs install-hooks`
- `automation:uninstall-hooks`: `node scripts/automation.mjs uninstall-hooks`

## Documentos (raiz e docs/)
- `.github/PULL_REQUEST_TEMPLATE.md` (27 linhas)
- `.github/pull_request_template.md` (27 linhas)
- `AGENTS.md` — AGENTS.md — Brindes Sicoob V2 (149 linhas)
- `AUDIT_EXPORT_FILTERED.md` — 📂 EXPORTAÇÃO DE INVENTÁRIO FILTRADA (49 linhas)
- `CHANGELOG.md` — Changelog (77 linhas)
- `CLAUDE.md` (2 linhas)
- `CONTRIBUTING.md` — Guia de Contribuição (115 linhas)
- `PENDENCIAS.md` — Pendências de CI — adm01-debug/Brindes_Sicoob_V2 (733 linhas)
- `README.md` — 🎁 Brindes Sicoob V2 — Portal corporativo de brindes (367 linhas)
- `RELATORIO_AUDITORIA_EXAUSTIVA.md` — Relatório de Auditoria Exaustiva — Brindes Sicoob V2 (382 linhas)
- `RELATORIO_CI.md` — Relatório CI — adm01-debug/Brindes_Sicoob_V2 (962 linhas)
- `SECURITY.md` — Política de Segurança (50 linhas)
- `SICOOB_TESTING.md` — Módulo Sicoob - Documentação de Usuários de Teste (37 linhas)
- `docs/01_CRIAR_PRIMEIRA_ORGANIZATION.md` — 🏢 Como Criar sua Primeira Organization (440 linhas)
- `docs/02_INTEGRACAO_FRONTEND_REACT.md` — 💻 Integração Frontend (React) (845 linhas)
- `docs/03_ARQUITETURA_DO_SISTEMA.md` — 🏗️ Arquitetura do Sistema (587 linhas)
- `docs/04_EXPLICACAO_DAS_POLICIES.md` — 🔐 Explicação das Policies (RLS) (946 linhas)
- `docs/05_ROADMAP_PROXIMOS_PASSOS.md` — 🚀 Roadmap - Próximos Passos (728 linhas)
- `docs/ACCESSIBILITY.md` — ♿ Guia de Acessibilidade (a11y) (145 linhas)
- `docs/ANALISE_109_TABELAS_BANCO_EXTERNO.md` — 📊 Análise Exaustiva das 109 Tabelas do Banco de Dados Externo (432 linhas)
- `docs/API.md` — 📡 Documentação de APIs - Gifts Store (237 linhas)
- `docs/API_DEPENDENCY_MAP.md` — 🗺️ Mapa de Endpoints e Dependências Sicoob (81 linhas)
- `docs/AUDIT_FRONTEND_DATABASE.md` — Auditoria Técnica: Front-end ↔ Banco de Dados (519 linhas)
- `docs/AUDIT_FRONTEND_DATABASE_summary.md` — Sumário Executivo — Auditoria Front-end ↔ DB (Promo_Gifts) (28 linhas)
- `docs/AUTH_PASSKEYS.md` — 🔐 Autenticação: Passkeys (WebAuthn) — Guia de Implementação Full 10/10 (51 linhas)
- `docs/AUTOMACAO_LOCAL.md` — Automação local — Brindes_Sicoob_V2 (230 linhas)
- `docs/BRANCH_PROTECTION.md` — Proteção da branch `main` (63 linhas)
- `docs/CASOS_TESTE_E2E_POR_PAPEL.md` — Casos de Teste E2E por Papel (41 linhas)
- `docs/CI_CD.md` — CI e entrega — Brindes Sicoob V2 (39 linhas)
- `docs/CONFIGURACAO_LOCALE_PT_BR.md` — 🇧🇷 REMOÇÃO DE i18n E CONFIGURAÇÃO PT-BR - GIFTS-STORE (514 linhas)
- `docs/CONNECTORS_INVENTORY.md` — Inventário de Conectores e Integrações — Connections Hub (40 linhas)
- `docs/DARK_MODE.md` — 🌙 Guia de Dark Mode - Gifts Store (80 linhas)
- `docs/DATA_DICTIONARY.md` — Data Dictionary — Promo Gifts (Local Supabase) (99 linhas)
- `docs/DEPLOYMENT.md` — Publicação e migrations (66 linhas)
- `docs/DR.md` — 🆘 Plano de Recuperação de Desastres (DR) (37 linhas)
- `docs/E2E_SMOKE_COVERAGE.md` — Auditoria de cobertura — Smoke E2E (71 linhas)
- `docs/EDGE_FUNCTIONS.md` — Edge Functions — Referência histórica (96 linhas)
- `docs/EDGE_FUNCTIONS_DRIFT.md` — Relatório de Divergência de Edge Functions (14 linhas)
- `docs/EXCEL_INTEGRATION_GUIDE.md` — 📊 Guia de Integração - Botão Export Excel (140 linhas)
- `docs/FIXTURES_E2E_POR_PAPEL.md` — Fixtures E2E por Papel (19 linhas)
- `docs/FORM_VALIDATION.md` (5 linhas)
- `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` — 📋 Inventário Completo de Funcionalidades e Ferramentas (1298 linhas)
- `docs/GO_LIVE_CHECKLIST.md` — Checklist de Go-Live — Sicoob Platform (v2026) (33 linhas)
- `docs/HOOKS_USAGE_GUIDE.md` — 📚 Guia de Uso dos Hooks (122 linhas)
- `docs/HOTFIX_PROCEDURE.md` — Procedimento de correção urgente (36 linhas)
- `docs/INVENTARIO_FUNCIONALIDADES_v2.md` — Inventário Exaustivo de Funcionalidades v2 — Promo Gifts (78 linhas)
- `docs/MAGIC_UP_ONDA5_A11Y.md` — ♿ Magic Up — Onda 5 a11y guideline (81 linhas)
- `docs/MOBILE.md` — 📱 Guia de Responsividade Mobile (100 linhas)
- `docs/MODULES.md` — Master Module Index (mem://) (41 linhas)
- `docs/NOTIFICATION_SYSTEM.md` — 🔔 SISTEMA UNIFICADO DE NOTIFICAÇÕES (319 linhas)
- `docs/OBSERVABILITY.md` — Observabilidade — Promo Gifts (184 linhas)
- `docs/ONBOARDING.md` — Onboarding — Promo Gifts (Setup < 4h) (61 linhas)
- `docs/PERFORMANCE.md` — Performance Optimization (29 linhas)
- `docs/PERFORMANCE_AUDIT.md` — Performance Audit — N+1 & Hot Queries (65 linhas)
- `docs/POLITICA_IDIOMA_PT_BR.md` — 🚫 POLÍTICA DE IDIOMA - GIFTS-STORE (232 linhas)
- `docs/POSTMORTEM_TEMPLATE.md` — Post-Mortem — [Título do Incidente] (47 linhas)
- `docs/RBAC_HELPERS.md` — Helpers semânticos de RBAC (RLS) (46 linhas)
- `docs/README.md` — Documentação do Portal de Brindes Sicoob V2 (56 linhas)
- `docs/REMOTE_ONLY_MIGRATIONS_STRATEGY.md` — Estratégia para 5 migrations só no remoto (44 linhas)
- `docs/ROUTES.md` — 🗺️ Mapa Automático de Rotas (155 linhas)
- `docs/RUNBOOK.md` — 📘 Runbook Operacional — Promo Brindes (212 linhas)
- `docs/RUNBOOK_CONNECTIONS.md` — 🔌 Runbook — Módulo `/admin/conexoes` (184 linhas)
- `docs/SCOPE_ALIGNMENT.md` — 🎯 Alinhamento de Escopo: Portal Sicoob Brindes (64 linhas)
- `docs/SECURITY.md` — Security Best Practices (30 linhas)
- `docs/SECURITY_ALERTS.md` — 🛡️ Security Alerts — Configuração Completa (109 linhas)
- `docs/SECURITY_PLAN.md` — 🛡️ Cronograma de Segurança e Monitoramento (26 linhas)
- `docs/SECURITY_RUNBOOK.md` — Security Runbook — Promo Gifts (66 linhas)
- `docs/SKINS_INVENTORY.md` — Inventário Visual de Skins — Skins Factory (45 linhas)
- `docs/SLA_REVIEW.md` — 📑 Revisão de SLAs e Acordos de Serviço (22 linhas)
- `docs/SLO.md` — 📉 Metas de Nível de Serviço (SLO) (29 linhas)
- `docs/TESTING.md` — Guia de testes (59 linhas)
- `docs/auditoria-validacao-2026-09-22.md` — Auditoria de validação — 22/09/2026 (227 linhas)
- `docs/branch-protection-pendente.md` — Proteção de branch em `main` — pendente de aprovação (68 linhas)
- `docs/correcoes-validacao-2026-09-13.md` — Validação do plano de 50 etapas — correções encontradas (2026-09-13) (56 linhas)
- `docs/correcoes-validacao-2026-09-14.md` — Validação do plano — sessão 2026-09-14 (6683 linhas)
- `docs/deploy-flow.md` — Fluxo de Deploy — Promo Brindes (92 linhas)
- `docs/order-workflow.md` — Workflow de Pedidos - Documentação Técnica (35 linhas)
- `docs/plano-melhorias-50-etapas.md` — Runbook de correções e melhorias — 50 etapas (102 linhas)
- `docs/secrets.md` — Inventário de segredos e variáveis de ambiente (133 linhas)
- subpastas de docs/: docs/pendencias (685), docs/execucao (92), docs/plano-implementacao (24), docs/pesquisa (11), docs/RECUPERACAO (10), docs/adr (10), docs/audits (9), docs/agentes (6), docs/RUNBOOKS (2), docs/architecture (2), docs/security (2), docs/testing (2), docs/externo (1)
- CHANGELOG topo: [Unreleased]

## Últimos commits
- 2026-11-21 `cf2d42b` fix: hidratação tardia de preço no editor de orçamento (cache lazy do catálogo) (#397)
- 2026-11-21 `4555801` fix: importação de coleção preserva preço fresco, contato real e cliente no bulk (#395 findings) (#396)
- 2026-11-21 `ca1fccc` fix: coleção → orçamento agora pré-carrega produtos e cliente (FE-060) (#395)
- 2026-11-21 `e324c64` feat: e-mail transacional via Resend na edge send-transactional-email (#393)
- 2026-11-20 `e7e6753` docs: provar aplicação em produção dos P0 SIC-021/040/041/060 (#391)
- 2026-11-20 `ca511cf` fix: links internos quebrados (ADM-15) (#390)
- 2026-11-20 `8b37b64` fix(bitrix): after-merge EDG-12 color_name e SIC-054 libera comprador_singular (#389)
- 2026-11-20 `9bcfb62` chore: fundação docs/pendencias do goal (683 itens do backlog) (#388)
- 2026-11-19 `e877d0c` fix(orcamentos): restaura fluxo sugestoes BI -> criador de orcamentos (#387)
- 2026-11-19 `67f5a8a` chore: padroniza template de PR (recupera trabalho alheio) (#386)
- 2026-11-19 `449faf1` feat(pedidos): filtros da lista persistidos na URL (recupera PR #100) (#379)
- 2026-11-19 `0f4d547` feat(orcamentos): filtros da lista persistidos na URL (recupera PR #100) (#378)
- 2026-11-19 `9515c40` test(edge): catraca para o espalhamento de versões do supabase-js (#377)
- 2026-11-19 `e1ef799` chore(deps): sobe os 10 avancos reais do grupo production-minor-patch (#376)
- 2026-11-19 `726efa7` feat(nav): resgata menu de histórico de navegação (KPI nav.history-jump) (#384)

## Arquivos deste diretório
- `docs/contexto/codigo/rotas.json`
- `docs/contexto/codigo/modulos.json`
- `docs/contexto/codigo/componentes.json`
- `docs/contexto/codigo/hooks.json`
- `docs/contexto/codigo/edge-functions.json`
- `docs/contexto/codigo/banco.json`
- `docs/contexto/codigo/ferramentas.json`
- `docs/contexto/codigo/scripts.json`
- `docs/contexto/codigo/testes.json`
- `docs/contexto/codigo/logica.json`
- `docs/contexto/codigo/grafo.json`
- `docs/contexto/codigo/grafo-arestas.json`
- `docs/contexto/codigo/convencoes.json`
- `docs/contexto/codigo/grafo-graphify.json`
- `docs/contexto/codigo/baseline.json`
- `docs/contexto/codigo/manifest.json` (commit, data, hashes, erros — único arquivo com data/hora)
