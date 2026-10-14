# 🗺️ Mapa Automático de Rotas

> Documento gerado automaticamente via `scripts/generate-routes-map.mjs`

## 📂 Seção: ADMIN
| Rota | Componente |
|------|------------|
| `/admin/sicoob` | `@/pages/admin/sicoob/SicoobManagementPage` |
| `/admin/sicoob/notificacoes` | `@/pages/admin/sicoob/SicoobApprovalReconciliationPage` |
| `/admin/usuarios` | `@/pages/admin/AdminUsuariosPage` |
| `/admin/cadastros` | `@/pages/admin/AdminCadastrosPage` |
| `/admin/cadastros/produto/:id` | `@/pages/admin/AdminProductFormPage` |
| `/admin/categories` | `@/pages/admin/AdminCategoriesPage` |
| `/admin/singulares` | `@/pages/admin/AdminSingularesPage` |
| `/admin/pas` | `@/pages/admin/AdminPAsPage` |
| `/admin/cooperativas` | `@/pages/admin/AdminCooperativasPage` |
| `/admin/cms` | `@/pages/admin/AdminCMSPage` |
| `/admin/newsletter` | `@/pages/admin/AdminNewsletterPage` |
| `/admin/campanhas` | `@/pages/admin/AdminCampanhasPage` |
| `/admin/verbas` | `@/pages/admin/AdminVerbasPage` |
| `/admin/limites-desconto` | `@/pages/admin/SellerDiscountLimitsAdminPage` |
| `/admin/permissoes` | `@/pages/PermissionsPage` |
| `/admin/roles` | `@/pages/RolesPage` |
| `/admin/role-permissoes` | `@/pages/RolePermissionsPage` |
| `/admin/video-variantes` | `@/pages/admin/AdminVideoVariantsPage` |
| `/admin/kit-templates` | `@/pages/admin/KitTemplatesAdminPage` |

## 📂 Seção: DEV
| Rota | Componente |
|------|------------|
| `/sicoob/qa/preflight` | `@/pages/admin/qa/PreflightPage` |
| `/admin/telemetria` | `@/pages/admin/AdminTelemetriaPage` |
| `/admin/performance` | `@/pages/admin/AdminPerformancePage` |
| `/admin/seguranca` | `@/pages/admin/AdminSegurancaPage` |
| `/admin/seguranca-acesso` | `@/pages/admin/AdminSegurancaAcessoPage` |
| `/admin/conexoes` | `@/pages/admin/AdminConexoesPage` |
| `/admin/conexoes/status` | `@/pages/admin/AdminConexoesPage` |
| `/admin/external-db` | `@/pages/admin/AdminExternalDbPage` |
| `/external-db-test` | `@/pages/ExternalDatabaseTest` |
| `/admin/prompts-ia` | `@/pages/admin/AdminPromptsIAPage` |
| `/admin/workflows` | `@/pages/admin/AdminWorkflowsPage` |
| `/admin/rbac-rotas` | `@/pages/admin/AdminRbacRoutesPage` |
| `/admin/qa/preflight` | `@/pages/admin/qa/PreflightPage` |
| `/admin/qa/release-evidences` | `@/pages/admin/qa/ReleaseEvidencesPage` |
| `/admin/seguranca/rls` | `@/pages/admin/RLSAuditPage` |
| `/admin/seguranca/chaves` | `@/pages/admin/AdminSegurancaChavesPage` |
| `/admin/seguranca/migracao-papeis` | `@/pages/admin/AdminMigracaoPapeisPage` |
| `/admin/validade-precos` | `@/pages/admin/PriceFreshnessSettings` |
| `/admin/rate-limit` | `@/pages/RateLimitDashboardPage` |
| `/admin/login-attempts` | `@/pages/admin/AdminLoginAttemptsPage` |
| `/admin/consumo-ia` | `@/pages/admin/AdminAiUsagePage` |
| `/admin/rls-denials` | `@/pages/admin/RlsDenialsAdminPage` |
| `/admin/auditoria-propriedade` | `@/pages/admin/OwnershipAuditAdminPage` |
| `/status` | `@/pages/SystemStatusPage` |

## 📂 Seção: PRODUCTS
| Rota | Componente |
|------|------------|
| `/produtos` | `@/pages/FiltersPage` |
| `/produto/:id` | `@/pages/ProductDetail` |
| `/novidades` | `@/pages/NoveltiesPage` |
| `/filtros` | `@/pages/FiltersPage` |
| `/colecoes` | `@/pages/CollectionsPage` |
| `/colecoes/:id` | `@/pages/CollectionDetailPage` |
| `/estoque` | `@/pages/StockDashboardPage` |
| `/favoritos` | `@/pages/FavoritesPage` |
| `/comparar` | `@/pages/ComparePage` |
| `/reposicao` | `@/pages/ReplenishmentsPage` |
| `/meus-kits` | `@/pages/KitLibraryPage` |
| `/mockups/historico` | `@/pages/MockupHistoryPage` |
| `/tendencias` | `@/pages/TrendsPage` |
| `/inteligencia-comercial` | `@/pages/CommercialIntelligencePage` |
| `/ferramentas/bi` | `@/pages/BusinessIntelligencePage` |
| `/ferramentas/bi/comparar` | `@/pages/ClientComparatorPage` |
| `/dropbox` | `@/pages/DropboxBrowserPage` |

## 📂 Seção: PUBLIC
| Rota | Componente |
|------|------------|
| `/loja-demo` | `@/pages/sicoob/StorefrontDemoPage` |
| `/demonstracao` | `@/pages/sicoob/DemoPortalPage` |
| `/login` | `@/pages/Auth` |
| `/reset-password` | `@/pages/ResetPassword` |
| `/convite/:token` | `@/pages/sicoob/SicoobInvitationAcceptPage` |
| `/verificacao` | `@/pages/VerificationPage` |
| `/sso/callback` | `@/pages/SSOCallbackPage` |
| `/colecao-publica/:token` | `@/pages/PublicCollectionPage` |
| `/approve/:token` | `@/pages/QuoteApprovalPage` |
| `/proposta/:token` | `@/pages/QuoteApprovalPage` |
| `/kit/:token` | `@/pages/PublicKitViewPage` |
| `/comparar-publica/:token` | `@/pages/PublicComparisonPage` |
| `/dossie/:token` | `@/pages/PublicDossierPage` |
| `/lista-publica/:token` | `@/pages/PublicFavoriteListPage` |
| `/public/colecao/:token` | `@/pages/PublicCollectionPage` |
| `/public/orcamento/:token/aprovacao` | `@/pages/QuoteApprovalPage` |
| `/public/kit/:token` | `@/pages/PublicKitViewPage` |
| `/public/comparativo/:token` | `@/pages/PublicComparisonPage` |
| `/public/dossie/:token` | `@/pages/PublicDossierPage` |
| `/public/favoritos/:token` | `@/pages/PublicFavoriteListPage` |

## 📂 Seção: QUOTES
| Rota | Componente |
|------|------------|
| `/orcamentos` | `@/pages/QuotesListPage` |
| `/orcamentos/dashboard` | `@/pages/QuotesDashboardPage` |
| `/orcamentos/lista` | `@/pages/QuotesListPage` |
| `/orcamentos/kanban` | `@/pages/QuotesKanbanPage` |
| `/orcamentos/templates` | `@/pages/QuoteTemplatesPage` |
| `/orcamentos/novo` | `@/pages/QuoteBuilderPage` |
| `/meus-orcamentos` | `@/pages/MeusOrcamentos` |
| `/orcamentos/:id` | `@/pages/QuoteViewPage` |
| `/orcamentos/:id/editar` | `@/pages/QuoteBuilderPage` |
| `/orcamentos/:id/visualizar` | `@/pages/QuoteViewPage` |
| `/gestor/orcamentos` | `@/pages/GestorOrcamentos` |
| `/carrinhos` | `@/pages/SellerCartsPage` |
| `/carrinhos/novo` | `@/pages/SellerCartsPage` |
| `/carrinhos/:cartId` | `@/pages/SellerCartsPage` |

## 📂 Seção: SICOOB-RBAC
| Rota | Componente |
|------|------------|
| `/pa/verba` | `@/pages/sicoob/PAWalletPage` |
| `/dashboard-pa` | `@/pages/sicoob/PADashboardPage` |
| `/gestor/compras` | `@/pages/GestorCompras` |
| `/gestor` | `@/pages/sicoob/GestorDashboardPage` |
| `/gestor/agregados` | `@/pages/sicoob/GestorConsolidatedOrdersPage` |
| `/gestor/convites` | `@/pages/sicoob/SicoobInvitationsPage` |
| `/gestor/aprovacoes` | `@/pages/sicoob/GestorApprovalsPage` |
| `/gestor/auditoria` | `@/pages/sicoob/GestorAuditPage` |
| `/vendedor/dashboard` | `@/pages/sicoob/vendedor/SellerDashboardPage` |
| `/relatorios/sicoob` | `@/pages/sicoob/reports/SicoobReportsPage` |
| `/kpis/sicoob` | `@/pages/sicoob/reports/SicoobKpiPage` |

## 📂 Seção: SICOOB
| Rota | Componente |
|------|------------|
| `/sicoob/pedidos` | `@/pages/sicoob/orders/OrdersPage` |
| `/sicoob/pedidos/kanban` | `@/pages/sicoob/orders/OrdersKanbanPage` |
| `/sicoob/pedidos/:id` | `@/pages/sicoob/orders/OrderDetailPage` |
| `/sicoob/logistica` | `@/pages/sicoob/LogisticsReportPage` |
| `/sicoob/vendas` | `@/pages/sicoob/orders/SellerPanelPage` |

## 📂 Seção: TOOLS
| Rota | Componente |
|------|------------|
| `/ajuda` | `@/pages/HelpCenterPage` |
| `/mockup-generator` | `@/pages/MockupGenerator` |
| `/magic-up` | `@/pages/MagicUp` |
| `/match` | `@/pages/ProductMatchPage` |
| `/montar-kit` | `@/pages/KitBuilderPage` |
| `/simulador` | `@/pages/SimuladorWizard` |
| `/simulador-precos` | `@/pages/PriceSimulatorPage` |
| `/busca-preco` | `@/pages/AdvancedPriceSearchPage` |
