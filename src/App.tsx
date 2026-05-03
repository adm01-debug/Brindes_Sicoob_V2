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

const AppWithAuth = ({ children }: { children: ReactNode }) => {
  useCatalogPrefetch();
  return <>{children}</>;
};

const RouteSuspense = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  return <Suspense fallback={getFallback(pathname)}>{children}</Suspense>;
};

const Index = lazyWithRetry(() => import("./pages/Index"));
const CustomizableDashboard = lazyWithRetry(() => import("./pages/CustomizableDashboard"));
const OrdersPage = lazyWithRetry(() => import("./pages/OrdersPage"));
const OrderDetailPage = lazyWithRetry(() => import("./pages/OrderDetailPage"));
const ClientsPage = lazyWithRetry(() => import("./pages/ClientsPage"));
const ClientDetailPage = lazyWithRetry(() => import("./pages/ClientDetailPage"));
const TrendsPage = lazyWithRetry(() => import("./pages/TrendsPage"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const AdminTemasPage = lazyWithRetry(() => import("./pages/admin/AdminTemasPage"));
const ColorDocumentationPage = lazyWithRetry(() => import("./pages/admin/ColorDocumentationPage"));

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
                          {(publicRoutes as any).map((r: any) => (
                            <Route key={r.path} path={r.path} element={<r.component />} />
                          ))}

                          {/* Static Redirects & Legacy (Unprotected) */}
                          <Route path="/configuracoes" element={<Navigate to="/admin/usuarios" replace />} />
                          <Route path="/perfil" element={<Navigate to="/admin/usuarios" replace />} />

                          {/* Protected Layout Route */}
                          <Route element={<ProtectedRoute />}>
                            <Route path="/" element={<Index />} />
                            <Route path="/dashboard" element={<CustomizableDashboard />} />

                            {/* Modular Routes */}
                            {(productRoutes as any).map((r: any) => (
                              <Route key={r.path} path={r.path} element={<r.component />} />
                            ))}
                            {(quoteRoutes as any).map((r: any) => (
                              <Route key={r.path} path={r.path} element={<r.component />} />
                            ))}
                            {(toolRoutes as any).map((r: any) => (
                              <Route key={r.path} path={r.path} element={<r.component />} />
                            ))}

                            <Route path="/admin/temas" element={<AdminTemasPage />} />

                            {/* Admin Routes */}
                            <Route element={<AdminRoute />}>
                              {(adminRoutes as any).map((r: any) => (
                                <Route key={r.path} path={r.path} element={<r.component />} />
                              ))}
                              
                              <Route element={<AdminRoute requiredRole="gestor_compras" />}>
                                {(sicoobRoutes as any).filter((r: any) => r.path !== "/sicoob/vendas").map((r: any) => (
                                  <Route key={r.path} path={r.path} element={<r.component />} />
                                ))}
                                <Route path="/admin/design-system/colors" element={<ColorDocumentationPage />} />
                              </Route>

                              <Route element={<ProtectedRoute requiredRole="vendedor" />}>
                                {(sicoobRoutes as any).filter((r: any) => r.path === "/sicoob/vendas").map((r: any) => (
                                  <Route key={r.path} path={r.path} element={<r.component />} />
                                ))}
                              </Route>
                            </Route>

                            {/* Dev Routes */}
                            <Route element={<DevRoute />}>
                              {(devRoutes as any).map((r: any) => (
                                <Route key={r.path} path={r.path} element={<r.component />} />
                              ))}
                            </Route>

                            {/* Common App Routes */}
                            <Route path="/pedidos" element={<OrdersPage />} />
                            <Route path="/pedidos/:id" element={<OrderDetailPage />} />
                            <Route path="/clientes" element={<ClientsPage />} />
                            <Route path="/clientes/:id" element={<ClientDetailPage />} />
                            <Route path="/tendencias" element={<TrendsPage />} />

                            {/* Error Fallback */}
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
