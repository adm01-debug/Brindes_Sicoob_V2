# 🗺️ Mapa Automático de Rotas

> Documento gerado automaticamente via `scripts/generate-routes-map.mjs`

## 📂 Seção: ADMIN
| Rota | Componente |
|------|------------|
| `/admin/usuarios` | `@/pages/admin/AdminUsuariosPage` |
| `/admin/usuarios/promover` | `@/pages/admin/AdminPromoverUsuarioPage` |
| `/admin/limites-desconto` | `@/pages/admin/SellerDiscountLimitsAdminPage` |
| `/admin/rls-denials` | `@/pages/admin/RlsDenialsAdminPage` |
| `/admin/auditoria-propriedade` | `@/pages/admin/OwnershipAuditAdminPage` |
| `/admin/cadastros` | `@/pages/admin/AdminCadastrosPage` |
| `/admin/cadastros/produto/:id` | `@/pages/admin/AdminProductFormPage` |
| `/admin/permissoes` | `@/pages/PermissionsPage` |
| `/admin/roles` | `@/pages/RolesPage` |
| `/admin/role-permissoes` | `@/pages/RolePermissionsPage` |
| `/admin/video-variantes` | `@/pages/admin/AdminVideoVariantsPage` |
| `/admin/kit-templates` | `@/pages/admin/KitTemplatesAdminPage` |
| `/admin/kit-templates/metricas` | `@/pages/admin/KitTemplatesMetricsPage` |

## 📂 Seção: DEV
| Rota | Componente |
|------|------------|
| `/admin/seguranca` | `@/pages/admin/AdminSegurancaPage` |
| `/admin/seguranca-acesso` | `@/pages/admin/AdminSegurancaAcessoPage` |
| `/admin/seguranca/chaves` | `@/pages/admin/AdminSegurancaChavesPage` |
| `/admin/seguranca/exemplos-challenge` | `@/pages/admin/DevChallengeExamplesPage` |
| `/admin/seguranca/migracao-papeis` | `@/pages/admin/AdminMigracaoPapeisPage` |
| `/admin/prompts-ia` | `@/pages/admin/AdminPromptsIAPage` |
| `/admin/validade-precos` | `@/pages/admin/PriceFreshnessSettings` |
| `/admin/telemetria` | `@/pages/admin/AdminTelemetriaPage` |
| `/admin/rate-limit` | `@/pages/RateLimitDashboardPage` |
| `/admin/workflows` | `@/pages/admin/AdminWorkflowsPage` |
| `/admin/login-attempts` | `@/pages/admin/AdminLoginAttemptsPage` |
| `/admin/external-db` | `@/pages/admin/AdminExternalDbPage` |
| `/admin/consumo-ia` | `@/pages/admin/AdminAiUsagePage` |
| `/admin/conexoes` | `@/pages/admin/AdminConexoesPage` |
| `/admin/conexoes/status` | `@/pages/admin/AdminConexoesStatusPage` |
| `/status` | `@/pages/SystemStatusPage` |
| `/external-db-test` | `@/pages/ExternalDatabaseTest` |
| `/admin/rbac-rotas` | `@/pages/admin/AdminRbacRoutesPage` |
| `/admin/qa` | `@/pages/QAPage` |

## 📂 Seção: PRODUCTS
| Rota | Componente |
|------|------------|
| `/produtos` | `@/pages/FiltersPage` |
| `/filtros` | `@/pages/FiltersPage` |
| `/produto/:id` | `@/pages/ProductDetail` |
| `/novidades` | `@/pages/NoveltiesPage` |
| `/reposicao` | `@/pages/ReplenishmentsPage` |
| `/favoritos` | `@/pages/FiltersPage` |
| `/carrinhos` | `@/pages/SellerCartsPage` |
| `/carrinhos/:cartId` | `@/pages/SellerCartsPage` |
| `/comparar` | `@/pages/ComparePage` |
| `/colecoes` | `@/pages/CollectionsPage` |
| `/colecoes/:id` | `@/pages/CollectionDetailPage` |

## 📂 Seção: PUBLIC
| Rota | Componente |
|------|------------|
| `/login` | `@/pages/Auth` |
| `/reset-password` | `@/pages/ResetPassword` |
| `/approve/:token` | `@/pages/PublicQuoteApprovalPage` |
| `/proposta/:token` | `@/pages/PublicQuoteApprovalPage` |
| `/kit/:token` | `@/pages/PublicKitViewPage` |
| `/lista-publica/:token` | `@/pages/PublicFavoriteListPage` |
| `/colecao-publica/:token` | `@/pages/PublicCollectionPage` |
| `/comparar-publica/:token` | `@/pages/PublicComparisonPage` |
| `/dossie/:token` | `@/pages/PublicDossierPage` |
| `/auth/callback` | `@/pages/SSOCallbackPage` |

## 📂 Seção: QUOTES
| Rota | Componente |
|------|------------|
| `/orcamentos` | `@/pages/QuotesListPage` |
| `/orcamentos/dashboard` | `@/pages/QuotesDashboardPage` |
| `/orcamentos/lista` | `@/pages/QuotesListPage` |
| `/orcamentos/kanban` | `@/pages/QuotesKanbanPage` |
| `/orcamentos/templates` | `@/pages/QuoteTemplatesPage` |
| `/orcamentos/novo` | `@/pages/QuoteBuilderPage` |
| `/orcamentos/:id/editar` | `@/pages/QuoteBuilderPage` |
| `/orcamentos/:id` | `@/pages/QuoteViewPage` |

## 📂 Seção: SICOOB
| Rota | Componente |
|------|------------|
| `/admin/sicoob` | `@/pages/admin/sicoob/SicoobManagementPage` |
| `/sicoob/pedidos` | `@/pages/sicoob/orders/OrdersPage` |
| `/sicoob/pedidos/kanban` | `@/pages/sicoob/orders/OrdersKanbanPage` |
| `/sicoob/pedidos/:id` | `@/pages/sicoob/orders/OrderDetailPage` |
| `/sicoob/logistica` | `@/pages/sicoob/LogisticsReportPage` |
| `/sicoob/vendas` | `@/pages/sicoob/orders/SellerPanelPage` |

## 📂 Seção: TOOLS
| Rota | Componente |
|------|------------|
| `/simulador` | `@/pages/SimuladorWizard` |
| `/simulador-precos` | `@/pages/PriceSimulatorPage` |
| `/estoque` | `@/pages/StockDashboardPage` |
| `/busca-preco` | `@/pages/AdvancedPriceSearchPage` |
| `/montar-kit` | `@/pages/KitBuilderPage` |
| `/meus-kits` | `@/pages/KitLibraryPage` |
| `/mockup-generator` | `@/pages/MockupGenerator` |
| `/mockups/historico` | `@/pages/MockupHistoryPage` |
| `/magic-up` | `@/pages/MagicUp` |
| `/inteligencia-comercial` | `@/pages/CommercialIntelligencePage` |
| `/ferramentas/bi` | `@/pages/BusinessIntelligencePage` |
| `/ferramentas/bi/comparar` | `@/pages/ClientComparatorPage` |
| `/match` | `@/pages/ProductMatchPage` |
| `/dropbox` | `@/pages/DropboxBrowserPage` |

