import { useEffect, type ReactNode, Suspense } from "react";
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
import { loadThemeConfig, applyThemePreset, applyRadius } from '@/lib/theme-presets';
import { ThemeInitializer } from '@/components/ThemeInitializer';

import { forwardRef } from 'react';

const AppWithAuth = forwardRef<HTMLDivElement, { children: ReactNode }>(({ children }, ref) => {
  useCatalogPrefetch();
  return <div ref={ref}>{children}</div>;
});

AppWithAuth.displayName = 'AppWithAuth';

const RouteSuspense = forwardRef<HTMLDivElement, { children: ReactNode }>(({ children }, ref) => {
  const { pathname } = useLocation();
  return (
    <div ref={ref}>
      <Suspense fallback={getFallback(pathname)}>{children}</Suspense>
    </div>
  );
});

RouteSuspense.displayName = 'RouteSuspense';

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



const App = () => {
  useGlobalErrorCatcher();

  useEffect(() => {
    const cfg = loadThemeConfig();
    const mode = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    applyThemePreset(cfg.presetId, mode);
    applyRadius(cfg.radius);
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

                      <RouteSuspense>
                        <Routes>
                          {/* Public Routes */}
                          {publicRoutes.map(r => (
                            <Route key={r.path} path={r.path} element={<r.component />} />
                          ))}

                          {/* Static Redirects & Legacy (Unprotected) */}
                          <Route path="/configuracoes" element={<div data-testid="redirect-config"><Navigate to="/admin/usuarios" replace /></div>} />
                          <Route path="/perfil" element={<div data-testid="redirect-perfil"><Navigate to="/admin/usuarios" replace /></div>} />
                          <Route path="/403" element={<div data-testid="app-forbidden"><ForbiddenPage /></div>} />


                          {/* Protected Layout Route */}
                          <Route element={<ProtectedRoute />}>
                            <Route path="/" element={<Index />} />
                            <Route path="/dashboard" element={<CustomizableDashboard />} />

                            {/* Modular Routes */}
                            {productRoutes.map(r => (
                              <Route key={r.path} path={r.path} element={<r.component />} />
                            ))}
                            {quoteRoutes.map(r => (
                              <Route key={r.path} path={r.path} element={<r.component />} />
                            ))}
                            {toolRoutes.map(r => (
                              <Route key={r.path} path={r.path} element={<r.component />} />
                            ))}

                            <Route path="/admin/temas" element={<AdminTemasPage />} />

                            {/* Admin Routes */}
                            <Route element={<AdminRoute />}>
                              {adminRoutes.map(r => (
                                <Route key={r.path} path={r.path} element={<r.component />} />
                              ))}
                              
                              <Route element={<ProtectedRoute requiredRole="gestor_compras" />}>
                                {sicoobRoutes.filter(r => r.path !== "/sicoob/vendas").map(r => (
                                  <Route key={r.path} path={r.path} element={<r.component />} />
                                ))}
                                <Route path="/admin/design-system/colors" element={<ColorDocumentationPage />} />
                              </Route>

                              <Route element={<ProtectedRoute requiredRole="vendedor" />}>
                                {sicoobRoutes.filter(r => r.path === "/sicoob/vendas").map(r => (
                                  <Route key={r.path} path={r.path} element={<r.component />} />
                                ))}
                              </Route>
                            </Route>

                            {/* Dev Routes */}
                            <Route element={<DevRoute />}>
                              {devRoutes.map(r => (
                                <Route key={r.path} path={r.path} element={<r.component />} />
                              ))}
                            </Route>

                            {/* Common App Routes */}
                            <Route path="/pedidos" element={<OrdersPage />} />
                            <Route path="/pedidos/:id" element={<OrderDetailPage />} />
                            <Route path="/clientes" element={<ClientsPage />} />
                            <Route path="/clientes/:id" element={<ClientDetailPage />} />
                            <Route path="/tendencias" element={<TrendsPage />} />
                            <Route path="/notificacoes" element={<NotificationsPage />} />
                            <Route path="/gestor/compras" element={<GestorComprasPage />} />

                            {/* Error Fallback */}
                            <Route path="*" element={<div data-testid="page-not-found"><NotFound /></div>} />

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
