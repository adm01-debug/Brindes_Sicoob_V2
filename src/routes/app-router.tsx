import { Suspense, type ReactNode } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  useLocation,
} from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { RouteAnnouncer } from '@/components/a11y';
import { RouteScrollReset } from '@/components/common/RouteScrollReset';
import { NavigationBlockerBridge } from '@/components/navigation/NavigationBlockerBridge';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AdminRoute } from '@/components/layout/AdminRoute';
import { DevRoute } from '@/components/layout/DevRoute';
import { SicoobRoute } from '@/components/layout/SicoobRoute';
import { getFallback } from '@/components/layout/SkeletonLoaders';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { publicRoutes } from '@/routes/config/public';
import { productRoutes } from '@/routes/config/products';
import { adminRoutes } from '@/routes/config/admin';
import { toolRoutes } from '@/routes/config/tools';
import { devRoutes } from '@/routes/config/dev';
import { quoteRoutes } from '@/routes/config/quotes';
import { sicoobRoutes } from '@/routes/config/sicoob';

function RouteSuspense({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <Suspense fallback={<div data-route-pending="lazy">{getFallback(pathname)}</div>}>
      {children}
    </Suspense>
  );
}

function AppRouterRuntime() {
  useScrollRestoration();
  return (
    <AuthProvider>
      <Toaster />
      <Sonner />
      <RouteScrollReset />
      <RouteAnnouncer />
      <NavigationBlockerBridge />
      <Outlet />
    </AuthProvider>
  );
}

const Index = lazyWithRetry(() => import('@/pages/Index'));
const CustomizableDashboard = lazyWithRetry(() => import('@/pages/CustomizableDashboard'));
const OrdersPage = lazyWithRetry(() => import('@/pages/OrdersPage').then((module) => ({ default: module.OrdersPage })));
const OrderDetailPage = lazyWithRetry(() => import('@/pages/OrderDetailPage'));
const ClientsPage = lazyWithRetry(() => import('@/pages/ClientsPage'));
const ClientDetailPage = lazyWithRetry(() => import('@/pages/ClientDetailPage'));
const NotFound = lazyWithRetry(() => import('@/pages/NotFound'));
const NotificationsPage = lazyWithRetry(() => import('@/pages/NotificationsPage'));
const AdminTemasPage = lazyWithRetry(() => import('@/pages/admin/AdminTemasPage'));
const ColorDocumentationPage = lazyWithRetry(() => import('@/pages/admin/ColorDocumentationPage'));
const ForbiddenPage = lazyWithRetry(() => import('@/pages/ForbiddenPage'));
const OrderAuditPage = lazyWithRetry(() => import('@/pages/OrderAuditPage'));
const TestDashboard = lazyWithRetry(() => import('@/pages/TestDashboard'));
const AuthenticatedShell = lazyWithRetry(() => import('@/components/layout/AuthenticatedShell').then((module) => ({ default: module.AuthenticatedShell })));
const MainLayout = lazyWithRetry(() => import('@/components/layout/MainLayout').then((module) => ({ default: module.MainLayout })));

export function buildAppRoutes() {
  return createRoutesFromElements(
    <Route id="root" element={<AppRouterRuntime />}>
      {publicRoutes.map((route) => (
        <Route key={route.path} path={route.path} element={<RouteSuspense><route.component /></RouteSuspense>} />
      ))}
      <Route path="/configuracoes" element={<Navigate to="/admin/usuarios" replace />} />
      <Route path="/perfil" element={<Navigate to="/admin/usuarios" replace />} />
      <Route path="/403" element={<RouteSuspense><ForbiddenPage /></RouteSuspense>} />
      <Route path="*" element={<RouteSuspense><NotFound /></RouteSuspense>} />

      <Route id="protected" element={<ProtectedRoute />}>
        <Route id="authenticated-shell" element={<RouteSuspense><AuthenticatedShell /></RouteSuspense>}>
          <Route id="main-layout" element={<RouteSuspense><MainLayout /></RouteSuspense>}>
            <Route path="/" element={<RouteSuspense><Index /></RouteSuspense>} />
            <Route path="/dashboard" element={<RouteSuspense><CustomizableDashboard /></RouteSuspense>} />
            {productRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={<RouteSuspense><route.component /></RouteSuspense>} />
            ))}
            {quoteRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={<RouteSuspense><route.component /></RouteSuspense>} />
            ))}
            {toolRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={<RouteSuspense><route.component /></RouteSuspense>} />
            ))}
            <Route path="/admin/temas" element={<RouteSuspense><AdminTemasPage /></RouteSuspense>} />

            <Route id="admin" element={<AdminRoute />}>
              <Route path="/admin/aprovacoes-desconto" element={<Navigate to="/admin/usuarios?tab=discounts" replace />} />
              {adminRoutes.map((route) => (
                <Route key={route.path} path={route.path} element={<RouteSuspense><route.component /></RouteSuspense>} />
              ))}
              <Route path="/admin/design-system/colors" element={<RouteSuspense><ColorDocumentationPage /></RouteSuspense>} />
              <Route path="/admin/saude-testes" element={<RouteSuspense><TestDashboard /></RouteSuspense>} />
              <Route path="/clientes" element={<RouteSuspense><ClientsPage /></RouteSuspense>} />
              <Route path="/clientes/:id" element={<RouteSuspense><ClientDetailPage /></RouteSuspense>} />
            </Route>

            <Route id="sicoob" element={<SicoobRoute />}>
              {sicoobRoutes.map((route) => (
                <Route key={route.path} path={route.path} element={<RouteSuspense><route.component /></RouteSuspense>} />
              ))}
            </Route>

            <Route id="dev" element={<DevRoute />}>
              {devRoutes.map((route) => (
                <Route key={route.path} path={route.path} element={<RouteSuspense><route.component /></RouteSuspense>} />
              ))}
            </Route>

            <Route path="/pedidos" element={<RouteSuspense><OrdersPage /></RouteSuspense>} />
            <Route path="/pedidos/:id" element={<RouteSuspense><OrderDetailPage /></RouteSuspense>} />
            <Route path="/notificacoes" element={<RouteSuspense><NotificationsPage /></RouteSuspense>} />
            <Route path="/pedidos/:id/auditoria" element={<RouteSuspense><OrderAuditPage /></RouteSuspense>} />
          </Route>
        </Route>
      </Route>
    </Route>,
  );
}

export const appRouter = createBrowserRouter(buildAppRoutes());
