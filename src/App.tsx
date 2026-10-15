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
import { SicoobRoute } from "@/components/layout/SicoobRoute";
import { AccessibilityProvider, AriaLiveProvider, RouteAnnouncer } from "@/components/a11y";
import { useGlobalErrorCatcher } from "@/hooks/useErrorHandler";
import { markBootSuccessful } from "@/lib/chunk-recovery";
import { getFallback } from "@/components/layout/SkeletonLoaders";
import { RouteScrollReset } from "@/components/common/RouteScrollReset";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useWebVitals } from "@/hooks/infrastructure/useWebVitals";

import { publicRoutes } from "./routes/config/public";
import { productRoutes } from "./routes/config/products";
import { adminRoutes } from "./routes/config/admin";
import { toolRoutes } from "./routes/config/tools";
import { devRoutes } from "./routes/config/dev";
import { quoteRoutes } from "./routes/config/quotes";
import { sicoobRoutes } from "./routes/config/sicoob";

import "./App.css";

const queryClient = createQueryClient();

import { ThemeInitializer } from '@/components/system/ThemeInitializer';

const RouteSuspense = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  return (
    <Suspense fallback={<div data-route-pending="lazy">{getFallback(pathname)}</div>}>
      {children}
    </Suspense>
  );
};

const Index = lazyWithRetry(() => import("./pages/Index"));
const CustomizableDashboard = lazyWithRetry(() => import("./pages/CustomizableDashboard"));
const OrdersPage = lazyWithRetry(() => import("./pages/OrdersPage").then((module) => ({ default: module.OrdersPage })));
const OrderDetailPage = lazyWithRetry(() => import("./pages/OrderDetailPage"));
const ClientsPage = lazyWithRetry(() => import("./pages/ClientsPage"));
const ClientDetailPage = lazyWithRetry(() => import("./pages/ClientDetailPage"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const NotificationsPage = lazyWithRetry(() => import("./pages/NotificationsPage"));
const AdminTemasPage = lazyWithRetry(() => import("./pages/admin/AdminTemasPage"));
const ColorDocumentationPage = lazyWithRetry(() => import("./pages/admin/ColorDocumentationPage"));
const ForbiddenPage = lazyWithRetry(() => import("./pages/ForbiddenPage"));
const OrderAuditPage = lazyWithRetry(() => import("./pages/OrderAuditPage"));
const TestDashboard = lazyWithRetry(() => import("./pages/TestDashboard"));
const AuthenticatedShell = lazyWithRetry(() => import("@/components/layout/AuthenticatedShell").then((module) => ({ default: module.AuthenticatedShell })));
const MainLayout = lazyWithRetry(() => import("@/components/layout/MainLayout").then((module) => ({ default: module.MainLayout })));
const App = () => {
  useGlobalErrorCatcher();
  useWebVitals({ debug: import.meta.env.DEV });

  useEffect(() => {
    markBootSuccessful();
  }, []);

  return (
    <ErrorBoundary name="Root">
      <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemeInitializer />
        <AccessibilityProvider>
          <AriaLiveProvider>
            <TooltipProvider>
              <BrowserRouter>
                <AuthProvider>
                  <Toaster />
                  <Sonner />
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
                        <Route path="*" element={<RouteSuspense><NotFound /></RouteSuspense>} />

                        {/* Protected Routes */}
                        <Route element={<ProtectedRoute />}>
                          <Route element={<RouteSuspense><AuthenticatedShell /></RouteSuspense>}>
                          <Route element={<RouteSuspense><MainLayout /></RouteSuspense>}>
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
                              <Route path="/admin/aprovacoes-desconto" element={<Navigate to="/admin/usuarios?tab=discounts" replace />} />
                              {adminRoutes.map(r => (
                                <Route key={r.path} path={r.path} element={<RouteSuspense><r.component /></RouteSuspense>} />
                              ))}
                              
                              <Route path="/admin/design-system/colors" element={<RouteSuspense><ColorDocumentationPage /></RouteSuspense>} />
                              <Route path="/admin/saude-testes" element={<RouteSuspense><TestDashboard /></RouteSuspense>} />
                              <Route path="/clientes" element={<RouteSuspense><ClientsPage /></RouteSuspense>} />
                              <Route path="/clientes/:id" element={<RouteSuspense><ClientDetailPage /></RouteSuspense>} />
                            </Route>

                            <Route element={<SicoobRoute />}>
                              {sicoobRoutes.map(r => (
                                <Route key={r.path} path={r.path} element={<RouteSuspense><r.component /></RouteSuspense>} />
                              ))}
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
                            <Route path="/notificacoes" element={<RouteSuspense><NotificationsPage /></RouteSuspense>} />
                            <Route path="/pedidos/:id/auditoria" element={<RouteSuspense><OrderAuditPage /></RouteSuspense>} />

                          </Route>
                          </Route>
                        </Route>
                  </Routes>
                </AuthProvider>
              </BrowserRouter>
            </TooltipProvider>
          </AriaLiveProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
