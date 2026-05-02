import { useEffect, type ReactNode, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-config";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminRoute } from "@/components/layout/AdminRoute";
import { DevRoute } from "@/components/layout/DevRoute";
import { DeprecatedRoute } from "@/components/layout/DeprecatedRoute";
import { AppProviders } from "@/components/providers/AppProviders";
import { AccessibilityProvider, AriaLiveProvider } from "@/components/a11y";
import { useGlobalErrorCatcher } from "@/hooks/useErrorHandler";
import { markBootSuccessful } from "@/lib/chunk-recovery";
import { getFallback } from "@/components/layout/SkeletonLoaders";
import { BridgeStatusBanner } from "@/components/BridgeStatusBanner";
import { CloudStatusBanner } from "@/components/system/CloudStatusBanner";
import { DevOnlyBridgeOverlay } from "@/components/dev/DevOnlyBridgeOverlay";
import { AuthDiagnosticsWidget } from "@/components/dev/AuthDiagnosticsWidget";
import { RouteScrollReset } from "@/components/common/RouteScrollReset";
import { startBridgeTelemetry } from "@/lib/external-db/bridge-telemetry-client";
import { startColdStartRecorder } from "@/lib/external-db/cold-start-recorder";
import { DiagnosticOverlay } from "@/components/dev/DiagnosticOverlay";
import { diagnostics } from "@/lib/diagnostics";
import "./App.css";

// Log app start
diagnostics.log('event', 'App', 'Iniciando aplicação...');


// Inicia o bridge telemetry e o recorder de cold-start (idempotentes).
startBridgeTelemetry();
startColdStartRecorder();

// Auth Pages
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Index = lazyWithRetry(() => import("./pages/Index"));
const PublicQuoteApproval = lazyWithRetry(() => import("./pages/PublicQuoteApprovalPage"));
const PublicKitView = lazyWithRetry(() => import("./pages/PublicKitViewPage"));
const PublicFavoriteList = lazyWithRetry(() => import("./pages/PublicFavoriteListPage"));
const PublicCollectionPage = lazyWithRetry(() => import("./pages/PublicCollectionPage"));
const PublicComparisonPage = lazyWithRetry(() => import("./pages/PublicComparisonPage"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

// Product Pages
const ProductDetail = lazyWithRetry(() => import("./pages/ProductDetail"));
const FiltersPage = lazyWithRetry(() => import("./pages/FiltersPage"));
const NoveltiesPage = lazyWithRetry(() => import("./pages/NoveltiesPage"));
const ReplenishmentsPage = lazyWithRetry(() => import("./pages/ReplenishmentsPage"));
const FavoritesPage = lazyWithRetry(() => import("./pages/FavoritesPage"));
const SellerCartsPage = lazyWithRetry(() => import("./pages/SellerCartsPage"));
const ComparePage = lazyWithRetry(() => import("./pages/ComparePage"));
const CollectionsPage = lazyWithRetry(() => import("./pages/CollectionsPage"));
const CollectionDetailPage = lazyWithRetry(() => import("./pages/CollectionDetailPage"));

// Quote Pages
const QuoteTemplatesPage = lazyWithRetry(() => import("./pages/QuoteTemplatesPage"));
const QuotesListPage = lazyWithRetry(() => import("./pages/QuotesListPage"));
const QuotesDashboardPage = lazyWithRetry(() => import("./pages/QuotesDashboardPage"));
const QuoteBuilderPage = lazyWithRetry(() => import("./pages/QuoteBuilderPage"));
const QuoteViewPage = lazyWithRetry(() => import("./pages/QuoteViewPage"));
const QuotesKanbanPage = lazyWithRetry(() => import("./pages/QuotesKanbanPage"));

// Admin Pages
const AdminUsuariosPage = lazyWithRetry(() => import("./pages/admin/AdminUsuariosPage"));
const AdminPromoverUsuarioPage = lazyWithRetry(() => import("./pages/admin/AdminPromoverUsuarioPage"));
const AdminSegurancaPage = lazyWithRetry(() => import("./pages/admin/AdminSegurancaPage"));
const AdminCadastrosPage = lazyWithRetry(() => import("./pages/admin/AdminCadastrosPage"));
const AdminPromptsIAPage = lazyWithRetry(() => import("./pages/admin/AdminPromptsIAPage"));
const AdminProductFormPage = lazyWithRetry(() => import("./pages/admin/AdminProductFormPage"));
const AdminTelemetriaPage = lazyWithRetry(() => import("./pages/admin/AdminTelemetriaPage"));
const AdminTemasPage = lazyWithRetry(() => import("./pages/admin/AdminTemasPage"));
const AdminWorkflowsPage = lazyWithRetry(() => import("./pages/admin/AdminWorkflowsPage"));
const AdminLoginAttemptsPage = lazyWithRetry(() => import("./pages/admin/AdminLoginAttemptsPage"));
const AdminExternalDbPage = lazyWithRetry(() => import("./pages/admin/AdminExternalDbPage"));
const AdminVideoVariantsPage = lazyWithRetry(() => import("./pages/admin/AdminVideoVariantsPage"));
const AdminAiUsagePage = lazyWithRetry(() => import("./pages/admin/AdminAiUsagePage"));
const KitTemplatesAdminPage = lazyWithRetry(() => import("./pages/admin/KitTemplatesAdminPage"));
const KitTemplatesMetricsPage = lazyWithRetry(() => import("./pages/admin/KitTemplatesMetricsPage"));
const PriceFreshnessSettingsPage = lazyWithRetry(() => import("./pages/admin/PriceFreshnessSettings"));

const AdminSegurancaAcessoPage = lazyWithRetry(() => import("./pages/admin/AdminSegurancaAcessoPage"));
const AdminSegurancaChavesPage = lazyWithRetry(() => import("./pages/admin/AdminSegurancaChavesPage"));
const DevChallengeExamplesPage = lazyWithRetry(() => import("./pages/admin/DevChallengeExamplesPage"));
const ColorDocumentationPage = lazyWithRetry(() => import("./pages/admin/ColorDocumentationPage"));
const AdminMigracaoPapeisPage = lazyWithRetry(() => import("./pages/admin/AdminMigracaoPapeisPage"));
const AdminConexoesPage = lazyWithRetry(() => import("./pages/admin/AdminConexoesPage"));
const AdminConexoesStatusPage = lazyWithRetry(() => import("./pages/admin/AdminConexoesStatusPage"));
const AdminRbacRoutesPage = lazyWithRetry(() => import("./pages/admin/AdminRbacRoutesPage"));
const SellerDiscountLimitsAdminPage = lazyWithRetry(() => import("./pages/admin/SellerDiscountLimitsAdminPage"));
const RlsDenialsAdminPage = lazyWithRetry(() => import("./pages/admin/RlsDenialsAdminPage"));
const OwnershipAuditAdminPage = lazyWithRetry(() => import("./pages/admin/OwnershipAuditAdminPage"));
const SicoobManagementPage = lazyWithRetry(() => import("./pages/admin/sicoob/SicoobManagementPage"));

// Tools Pages
const SimuladorWizard = lazyWithRetry(() => import("./pages/SimuladorWizard"));
const MockupGenerator = lazyWithRetry(() => import("./pages/MockupGenerator"));
const MagicUp = lazyWithRetry(() => import("./pages/MagicUp"));
const PriceSimulatorPage = lazyWithRetry(() => import("./pages/PriceSimulatorPage"));
const StockDashboardPage = lazyWithRetry(() => import("./pages/StockDashboardPage"));
const AdvancedPriceSearchPage = lazyWithRetry(() => import("./pages/AdvancedPriceSearchPage"));
const KitBuilderPage = lazyWithRetry(() => import("./pages/KitBuilderPage"));

const MeusKitsPage = lazyWithRetry(() => import("./pages/KitLibraryPage"));
const MockupHistoryPage = lazyWithRetry(() => import("./pages/MockupHistoryPage"));
const DropboxBrowserPage = lazyWithRetry(() => import("./pages/DropboxBrowserPage"));
const CommercialIntelligencePage = lazyWithRetry(() => import("./pages/CommercialIntelligencePage"));
const ProductMatchPage = lazyWithRetry(() => import("./pages/ProductMatchPage"));
const BusinessIntelligencePage = lazyWithRetry(() => import("./pages/BusinessIntelligencePage"));
const ClientComparatorPage = lazyWithRetry(() => import("./pages/ClientComparatorPage"));
const PublicDossierPage = lazyWithRetry(() => import("./pages/PublicDossierPage"));

// Orders Pages
const OrdersPage = lazyWithRetry(() => import("./pages/OrdersPage"));
const OrderDetailPage = lazyWithRetry(() => import("./pages/OrderDetailPage"));

// Sicoob Orders
const SicoobOrdersPage = lazyWithRetry(() => import("./pages/sicoob/orders/OrdersPage"));
const SicoobOrdersKanbanPage = lazyWithRetry(() => import("./pages/sicoob/orders/OrdersKanbanPage"));
const SicoobOrderDetailPage = lazyWithRetry(() => import("./pages/sicoob/orders/OrderDetailPage"));
const SicoobSellerPanelPage = lazyWithRetry(() => import("./pages/sicoob/orders/SellerPanelPage"));
const SicoobLogisticsReportPage = lazyWithRetry(() => import("./pages/sicoob/LogisticsReportPage"));

// Clients (CRM) Pages
const ClientsPage = lazyWithRetry(() => import("./pages/ClientsPage"));
const ClientDetailPage = lazyWithRetry(() => import("./pages/ClientDetailPage"));


// Analytics Pages
const TrendsPage = lazyWithRetry(() => import("./pages/TrendsPage"));


// System Pages
const SystemStatusPage = lazyWithRetry(() => import("./pages/SystemStatusPage"));
const RateLimitDashboard = lazyWithRetry(() => import("./pages/RateLimitDashboardPage"));
const ExternalDatabaseTest = lazyWithRetry(() => import("./pages/ExternalDatabaseTest"));

// Admin - Roles & Permissions
const PermissionsPage = lazyWithRetry(() => import("./pages/PermissionsPage"));
const RolesPage = lazyWithRetry(() => import("./pages/RolesPage"));
const RolePermissionsPage = lazyWithRetry(() => import("./pages/RolePermissionsPage"));

// Dashboard
const CustomizableDashboard = lazyWithRetry(() => import("./pages/CustomizableDashboard"));

// Auth Callbacks
const QAPage = lazyWithRetry(() => import("./pages/QAPage"));
const SSOCallbackPage = lazyWithRetry(() => import("./pages/SSOCallbackPage"));

const queryClient = createQueryClient();

import { useCatalogPrefetch } from '@/hooks/useCatalogPrefetch';
import { loadThemeConfig, applyThemePreset, applyRadius } from '@/lib/theme-presets';
import { ThemeInitializer } from '@/components/ThemeInitializer';

/** Componente interno que roda hooks que dependem de AuthProvider */
const AppWithAuth = ({ children }: { children: ReactNode }) => {
  useCatalogPrefetch();
  return <>{children}</>;
};

/** Location-aware Suspense that renders route-specific skeletons */
const RouteSuspense = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  return <Suspense fallback={getFallback(pathname)}>{children}</Suspense>;
};

const App = () => {
  useGlobalErrorCatcher();

  // Apply saved theme on boot (ThemeInitializer handles re-apply on mode change)
  useEffect(() => {
    const cfg = loadThemeConfig();
    const mode = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    applyThemePreset(cfg.presetId, mode);
    applyRadius(cfg.radius);
    // Limpa o marcador de chunk-recovery após boot bem-sucedido,
    // para que reloads anteriores não contem como "tentativas restantes".
    markBootSuccessful();
  }, []);

  useEffect(() => {
    const handleOnline = () => {};
    const handleOffline = () => {};

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemeInitializer />
        <AccessibilityProvider>
          <AriaLiveProvider>
            <TooltipProvider>
              <BrowserRouter future={{ v7_relativeSplatPath: true }}>
                <AuthProvider>
                  <AppWithAuth>
                    <AppProviders>
                      <Toaster />
                      <Sonner />
                      <CloudStatusBanner />
                      <BridgeStatusBanner />
                      <DevOnlyBridgeOverlay />
                      <AuthDiagnosticsWidget />
                      <DiagnosticOverlay />
                      <RouteScrollReset />

                      <RouteSuspense>
                        <Routes>
                          {/* Public Routes */}
                          <Route path="/login" element={<Auth />} />
                          <Route path="/reset-password" element={<ResetPassword />} />
                          <Route path="/approve/:token" element={<PublicQuoteApproval />} />
                          <Route path="/proposta/:token" element={<PublicQuoteApproval />} />
                          <Route path="/kit/:token" element={<PublicKitView />} />
                          <Route path="/lista-publica/:token" element={<PublicFavoriteList />} />
                          <Route path="/colecao-publica/:token" element={<PublicCollectionPage />} />
                          <Route path="/comparar-publica/:token" element={<PublicComparisonPage />} />
                          <Route path="/dossie/:token" element={<PublicDossierPage />} />
                          <Route path="/auth/callback" element={<SSOCallbackPage />} />

                          {/* Protected Layout Route */}
                          <Route element={<ProtectedRoute />}>
                            {/* Home */}
                            <Route path="/" element={<Index />} />
                            <Route path="/dashboard" element={<CustomizableDashboard />} />

                            {/* Products */}
                            <Route path="/produtos" element={<FiltersPage />} />
                            <Route path="/produto" element={<Navigate to="/produtos" replace />} />
                            <Route path="/produto/:id" element={<ProductDetail />} />
                            <Route path="/filtros" element={<FiltersPage />} />
                            <Route path="/novidades" element={<NoveltiesPage />} />
                            <Route path="/reposicao" element={<ReplenishmentsPage />} />
                            <Route path="/favoritos" element={<FavoritesPage />} />
                            <Route path="/carrinhos" element={<SellerCartsPage />} />
                            
                            <Route path="/carrinhos/:cartId" element={<SellerCartsPage />} />
                            <Route path="/comparar" element={<ComparePage />} />
                            <Route path="/colecoes" element={<CollectionsPage />} />
                            <Route path="/colecoes/:id" element={<CollectionDetailPage />} />

                            {/* Quotes */}
                            <Route path="/orcamentos" element={<QuotesListPage />} />
                            <Route path="/orcamentos/dashboard" element={<QuotesDashboardPage />} />
                            <Route path="/orcamentos/lista" element={<QuotesListPage />} />
                            <Route path="/orcamentos/kanban" element={<QuotesKanbanPage />} />
                            <Route path="/orcamentos/templates" element={<QuoteTemplatesPage />} />
                            <Route path="/orcamentos/novo" element={<QuoteBuilderPage />} />
                            <Route path="/orcamentos/:id/editar" element={<QuoteBuilderPage />} />
                            <Route path="/orcamentos/:id" element={<QuoteViewPage />} />

                            {/* Skins / Temas — disponível para todos os usuários autenticados (preferência local). */}
                            <Route path="/admin/temas" element={<AdminTemasPage />} />

                            {/* Admin Layout Route — supervisor + dev (gestão de negócio) */}
                            <Route element={<AdminRoute />}>
                              <Route path="/admin" element={<Navigate to="/admin/usuarios" replace />} />
                              <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
                              <Route path="/admin/usuarios/promover" element={<AdminPromoverUsuarioPage />} />
                              <Route path="/admin/limites-desconto" element={<SellerDiscountLimitsAdminPage />} />
                              <Route path="/admin/rls-denials" element={<RlsDenialsAdminPage />} />
                              <Route path="/admin/auditoria-propriedade" element={<OwnershipAuditAdminPage />} />
                              <Route path="/admin/cadastros" element={<AdminCadastrosPage />} />
                              <Route path="/admin/cadastros/produto/:id" element={<AdminProductFormPage />} />
                              <Route path="/admin/permissoes" element={<PermissionsPage />} />
                              <Route path="/admin/roles" element={<RolesPage />} />
                              <Route path="/admin/role-permissoes" element={<RolePermissionsPage />} />
                              <Route path="/admin/video-variantes" element={<AdminVideoVariantsPage />} />
                              <Route path="/admin/kit-templates" element={<KitTemplatesAdminPage />} />
                              <Route path="/admin/kit-templates/metricas" element={<KitTemplatesMetricsPage />} />
                              <Route element={<AdminRoute requiredRole="gestor_compras" />}>
                                 <Route path="/admin/sicoob" element={<SicoobManagementPage />} />
                                 <Route path="/admin/design-system/colors" element={<ColorDocumentationPage />} />
                                <Route path="/sicoob/pedidos" element={<SicoobOrdersPage />} />
                                <Route path="/sicoob/pedidos/kanban" element={<SicoobOrdersKanbanPage />} />
                                 <Route path="/sicoob/pedidos/:id" element={<SicoobOrderDetailPage />} />
                                 <Route path="/sicoob/logistica" element={<SicoobLogisticsReportPage />} />
                               </Route>
                              <Route element={<ProtectedRoute allowedRoles={['vendedor']} />}>
                                <Route path="/sicoob/vendas" element={<SicoobSellerPanelPage />} />
                              </Route>
                              <Route path="/admin/aprovacoes-desconto" element={<DeprecatedRoute message="A gestão de descontos foi movida para a aba 'Descontos' em Usuários." redirectTo="/admin/usuarios?tab=discounts" />} />
                              <Route path="/admin/performance" element={<DeprecatedRoute message="O módulo de Performance foi descontinuado. Use o BI Comercial para análises." redirectTo="/ferramentas/bi" />} />
                              <Route path="/admin/performance-comercial" element={<DeprecatedRoute message="O módulo de Performance Comercial foi descontinuado. Use o BI Comercial para análises." redirectTo="/ferramentas/bi" />} />
                              <Route path="/admin/comissoes" element={<DeprecatedRoute message="O módulo de Comissões foi descontinuado nesta plataforma." redirectTo="/admin/usuarios" />} />
                              <Route path="/tendencias" element={<TrendsPage />} />

                              {/* DEV-ONLY — páginas técnicas com risco elevado (telemetria, conexões, secrets, MCP, audit técnico, prompts IA) */}
                              <Route element={<DevRoute />}>
                                <Route path="/admin/seguranca" element={<AdminSegurancaPage />} />
                                <Route path="/admin/seguranca-acesso" element={<AdminSegurancaAcessoPage />} />
                                <Route path="/admin/seguranca/chaves" element={<AdminSegurancaChavesPage />} />
                                <Route path="/admin/seguranca/exemplos-challenge" element={<DevChallengeExamplesPage />} />
                                <Route path="/admin/seguranca/migracao-papeis" element={<AdminMigracaoPapeisPage />} />
                                <Route path="/admin/prompts-ia" element={<AdminPromptsIAPage />} />
                                <Route path="/admin/validade-precos" element={<PriceFreshnessSettingsPage />} />
                                <Route path="/admin/telemetria" element={<AdminTelemetriaPage />} />
                                <Route path="/admin/rate-limit" element={<RateLimitDashboard />} />
                                <Route path="/admin/workflows" element={<AdminWorkflowsPage />} />
                                <Route path="/admin/login-attempts" element={<AdminLoginAttemptsPage />} />
                                <Route path="/admin/external-db" element={<AdminExternalDbPage />} />
                                <Route path="/admin/consumo-ia" element={<AdminAiUsagePage />} />
                                <Route path="/admin/conexoes" element={<AdminConexoesPage />} />
                                <Route path="/admin/conexoes/status" element={<AdminConexoesStatusPage />} />
                                <Route path="/status" element={<SystemStatusPage />} />
                                 <Route path="/external-db-test" element={<ExternalDatabaseTest />} />
                                 <Route path="/admin/rbac-rotas" element={<AdminRbacRoutesPage />} />
                                 <Route path="/admin/qa" element={<QAPage />} />
                               </Route>
                            </Route>

                            {/* Redirects */}
                            <Route path="/configuracoes" element={<Navigate to="/admin/usuarios" replace />} />
                            <Route path="/admin/personalizacao" element={<Navigate to="/admin/cadastros" replace />} />
                            <Route path="/cadastro-produtos" element={<Navigate to="/admin/cadastros" replace />} />
                            <Route path="/cadastro-gravacao" element={<Navigate to="/admin/cadastros" replace />} />
                            <Route path="/comissoes" element={<DeprecatedRoute message="O módulo de Comissões foi descontinuado nesta plataforma." redirectTo="/" />} />

                            {/* Tools */}
                            <Route path="/simulador" element={<SimuladorWizard />} />
                            <Route path="/simulador-precos" element={<PriceSimulatorPage />} />
                            <Route path="/estoque" element={<StockDashboardPage />} />
                            <Route path="/busca-preco" element={<AdvancedPriceSearchPage />} />
                            <Route path="/montar-kit" element={<KitBuilderPage />} />
                            <Route path="/kit-builder" element={<Navigate to="/montar-kit" replace />} />
                            <Route path="/meus-kits" element={<MeusKitsPage />} />
                            <Route path="/mockup" element={<Navigate to="/mockup-generator" replace />} />
                            <Route path="/gerador-mockup" element={<Navigate to="/mockup-generator" replace />} />
                            <Route path="/mockup-generator" element={<MockupGenerator />} />
                            <Route path="/mockups/historico" element={<MockupHistoryPage />} />
                            <Route path="/magic-up" element={<MagicUp />} />
                            <Route path="/inteligencia-comercial" element={<CommercialIntelligencePage />} />
                            <Route path="/ferramentas/bi" element={<BusinessIntelligencePage />} />
                            <Route path="/ferramentas/bi/comparar" element={<ClientComparatorPage />} />
                            <Route path="/match" element={<ProductMatchPage />} />
                            <Route path="/dropbox" element={<DropboxBrowserPage />} />

                            {/* Orders */}
                            <Route path="/pedidos" element={<OrdersPage />} />
                            <Route path="/pedidos/:id" element={<OrderDetailPage />} />

                            {/* Clients (CRM) */}
                            <Route path="/clientes" element={<ClientsPage />} />
                            <Route path="/clientes/:id" element={<ClientDetailPage />} />

                            {/* Redirects legados */}
                            <Route path="/perfil" element={<Navigate to="/admin/usuarios" replace />} />
                            <Route path="/seguranca" element={<Navigate to="/admin/usuarios" replace />} />

                            {/* Fallback */}
                            <Route path="*" element={<NotFound />} />
                          </Route>
                        </Routes>
                      </RouteSuspense>
                    </AppProviders>
                  </AppWithAuth>
                </AuthProvider>
              </BrowserRouter>
            </TooltipProvider>
          </AriaLiveProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
