import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { defineRoute } from "@/lib/router-utils";

/**
 * Rotas SICOOB conforme Matriz de Papéis e Permissões (v2026-04-21)
 * Implementando lacunas de rotas administrativas e dashboards de gestão.
 */
export const sicoobRbacRoutes = [
  // Gestão de Verba e Dashboards PA
  defineRoute({ path: "/pa/verba", component: lazyWithRetry(() => import("@/pages/sicoob/PAWalletPage")) }),
  defineRoute({ path: "/dashboard-pa", component: lazyWithRetry(() => import("@/pages/sicoob/PADashboardPage")) }),
  
  // Módulo Gestor Singular
  defineRoute({ path: "/gestor", component: lazyWithRetry(() => import("@/pages/sicoob/GestorDashboardPage")) }),
  defineRoute({ path: "/gestor/agregados", component: lazyWithRetry(() => import("@/pages/sicoob/GestorConsolidatedOrdersPage")) }),
  defineRoute({ path: "/gestor/aprovacoes", component: lazyWithRetry(() => import("@/pages/sicoob/GestorApprovalsPage")) }),
  
  // Módulo Vendedor (Carteira)
  defineRoute({ path: "/vendedor/dashboard", component: lazyWithRetry(() => import("@/pages/sicoob/vendedor/SellerDashboardPage")) }),
  
  // Relatórios e KPIs
  defineRoute({ path: "/relatorios/sicoob", component: lazyWithRetry(() => import("@/pages/sicoob/reports/SicoobReportsPage")) }),
  defineRoute({ path: "/kpis/sicoob", component: lazyWithRetry(() => import("@/pages/sicoob/reports/SicoobKpiPage")) }),
  
  // QA e Auditoria Sicoob
  defineRoute({ path: "/sicoob/qa/preflight", component: lazyWithRetry(() => import("@/pages/admin/qa/PreflightPage")) }),
] as const;
