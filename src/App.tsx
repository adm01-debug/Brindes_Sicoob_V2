import { useEffect, type ReactNode, Suspense, forwardRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-config";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminRoute } from "@/components/layout/AdminRoute";
import { DevRoute } from "@/components/layout/DevRoute";
import { SicoobRoute } from "@/components/layout/SicoobRoute";
import { AppProviders } from "@/components/providers/AppProviders";
import { AccessibilityProvider, AriaLiveProvider, RouteAnnouncer } from "@/components/a11y";
import { useGlobalErrorCatcher } from "@/hooks/useErrorHandler";
import { markBootSuccessful } from "@/lib/chunk-recovery";
import { getFallback } from "@/components/layout/SkeletonLoaders";
import { BridgeStatusBanner } from "@/components/system/BridgeStatusBanner";
import { MainLayout } from "@/components/layout/MainLayout";
import { CloudStatusBanner } from "@/components/system/CloudStatusBanner";
import { DevOnlyBridgeOverlay } from "@/components/dev/DevOnlyBridgeOverlay";
import { AuthDiagnosticsWidget } from "@/components/dev/AuthDiagnosticsWidget";
import { RouteScrollReset } from "@/components/common/RouteScrollReset";
import { startBridgeTelemetry } from "@/lib/external-db/bridge-telemetry-client";
import { startColdStartRecorder } from "@/lib/external-db/cold-start-recorder";
import { DiagnosticOverlay } from "@/components/dev/DiagnosticOverlay";
import { diagnostics } from "@/lib/diagnostics";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

import { publicRoutes } from "./routes/config/public";
import { productRoutes } from "./routes/config/products";
import { adminRoutes } from "./routes/config/admin";
import { toolRoutes } from "./routes/config/tools";
import { devRoutes } from "./routes/config/dev";
import { quoteRoutes } from "./routes/config/quotes";
import { sicoobRoutes } from "./routes/config/sicoob";

import "./App.css";

// Log app start
diagnostics.log('event', 'App', 'Iniciando aplicação...');

startBridgeTelemetry();
startColdStartRecorder();

const queryClient = createQueryClient();

import { useCatalogPrefetch } from '@/hooks/useCatalogPrefetch';
import { ThemeInitializer } from '@/components/system/ThemeInitializer';

const AppWithAuth = forwardRef<HTMLDivElement, { children: ReactNode }>(({ children }, ref) => {
  useCatalogPrefetch();
  return <div ref={ref}>{children}</div>;
});

AppWithAuth.displayName = 'AppWithAuth';

const RouteSuspense = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  return (
    <Suspense fallback={getFallback(pathname)}>{children}</Suspense>
  );
};

const Index = lazyWithRetry(() => import("./pages/Index"));
const CustomizableDashboard = lazyWithRetry(() => import("./pages/CustomizableDashboard"));
const OrdersPage = lazyWithRetry(() => import("./pages/OrdersPage"));
const OrderDetailPage = lazyWithRetry(() => import("./pages/OrderDetailPage"));
const ClientsPage = lazyWithRetry(() => import("./pages/ClientsPage"));
const ClientDetailPage = lazyWithRetry(() => import("./pages/ClientDetailPage"));
const TrendsPage = lazyWithRetry(() => import("./pages/TrendsPage"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const NotificationsPage = lazyWithRetry(() => import("./pages/NotificationsPage"));
const GestorComprasPage = lazyWithRetry(() => import("./pages/GestorCompras"));
const AdminTemasPage = lazyWithRetry(() => import("./pages/admin/AdminTemasPage"));
const ColorDocumentationPage = lazyWithRetry(() => import("./pages/admin/ColorDocumentationPage"));
const ForbiddenPage = lazyWithRetry(() => import("./pages/ForbiddenPage"));
const OrderAuditPage = lazyWithRetry(() => import("./pages/OrderAuditPage"));
const TestDashboard = lazyWithRetry(() => import("./pages/TestDashboard"));
const GestorApprovalsPage = lazyWithRetry(() => import("./pages/GestorApprovalsPage"));

const App = () => {
  useGlobalErrorCatcher();

  useEffect(() => {
    markBootSuccessful();
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
                      <RouteAnnouncer />

                      <Routes>
                        {/* Public Routes */}
                        {publicRoutes.map(r => (
                          <Route key={r.path} path={r.path} element={<RouteSuspense><r.component /></RouteSuspense>} />
                        ))}

                        {/* Static Redirects */}
                        <Route path="/configuracoes" element={<Navigate to="/admin/usuarios" replace />} />
                        <Route path="/perfil" element={<Navigate to="/admin/usuarios" replace />} />
                        <Route path="/403" element={<RouteSuspense><ForbiddenPage /></RouteSuspense>} />

                        {/* Protected Routes */}
                        <Route element={<ProtectedRoute />}>
                          <Route element={<MainLayout />}>
                            <Route path="/" element={<RouteSuspense><Index /></RouteSuspense>} />
                            <Route path="/dashboard" element={<RouteSuspense><CustomizableDashboard /></RouteSuspense>} />

                            {/* Feature Modules */}
                            {productRoutes.map(r => (
                              <Route key={r.path} path={r.path} element={<RouteSuspense><r.component /></RouteSuspense>} />
                            ))}
                            {quoteRoutes.map(r => (
                              <Route key={r.path} path={r.path} element={<RouteSuspense><r.component /></RouteSuspense>} />
                            ))}
                            {toolRoutes.map(r => (
                              <Route key={r.path} path={r.path} element={<RouteSuspense><r.component /></RouteSuspense>} />
                            ))}

                            <Route path="/admin/temas" element={<RouteSuspense><AdminTemasPage /></RouteSuspense>} />

                            {/* Admin & Sicoob Group */}
                            <Route element={<AdminRoute />}>
                              {adminRoutes.map(r => (
                                <Route key={r.path} path={r.path} element={<RouteSuspense><r.component /></RouteSuspense>} />
                              ))}
                              
                              <Route element={<SicoobRoute />}>
                                {sicoobRoutes.map(r => (
                                  <Route key={r.path} path={r.path} element={<RouteSuspense><r.component /></RouteSuspense>} />
                                ))}
                                <Route path="/admin/design-system/colors" element={<RouteSuspense><ColorDocumentationPage /></RouteSuspense>} />
                              </Route>
                            </Route>

                            {/* Dev Tools */}
                            <Route element={<DevRoute />}>
                              {devRoutes.map(r => (
                                <Route key={r.path} path={r.path} element={<RouteSuspense><r.component /></RouteSuspense>} />
                              ))}
                            </Route>

                            {/* Shared App Routes */}
                            <Route path="/pedidos" element={<RouteSuspense><OrdersPage /></RouteSuspense>} />
                            <Route path="/pedidos/:id" element={<RouteSuspense><OrderDetailPage /></RouteSuspense>} />
                            <Route path="/clientes" element={<RouteSuspense><ClientsPage /></RouteSuspense>} />
                            <Route path="/clientes/:id" element={<RouteSuspense><ClientDetailPage /></RouteSuspense>} />
                            <Route path="/tendencias" element={<RouteSuspense><TrendsPage /></RouteSuspense>} />
                            <Route path="/notificacoes" element={<RouteSuspense><NotificationsPage /></RouteSuspense>} />
                            <Route path="/gestor/compras" element={<RouteSuspense><GestorComprasPage /></RouteSuspense>} />
                            <Route path="/gestor/aprovacoes" element={<RouteSuspense><GestorApprovalsPage /></RouteSuspense>} />
                            <Route path="/pedidos/:id/auditoria" element={<RouteSuspense><OrderAuditPage /></RouteSuspense>} />
                            <Route path="/admin/saude-testes" element={<RouteSuspense><TestDashboard /></RouteSuspense>} />

                            {/* Fallback */}
                            <Route path="*" element={<RouteSuspense><NotFound /></RouteSuspense>} />
                          </Route>
                        </Route>
                      </Routes>
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
