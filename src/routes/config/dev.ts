import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { defineRoute } from "@/lib/router-utils";

/**
 * Rotas de Ferramentas e Dev - Portal Sicoob
 * Refatoradas para excelência técnica 10/10
 */
export const devRoutes = [
  defineRoute({ path: "/sicoob/qa/preflight", component: lazyWithRetry(() => import("@/pages/admin/qa/PreflightPage")) }),
  defineRoute({ 
    path: "/admin/telemetria", 
    component: lazyWithRetry(() => import("@/pages/admin/AdminTelemetriaPage")) 
  }),
  defineRoute({ 
    path: "/admin/performance", 
    component: lazyWithRetry(() => import("@/pages/admin/AdminPerformancePage")) 
  }),
  defineRoute({ 
    path: "/admin/seguranca", 
    component: lazyWithRetry(() => import("@/pages/admin/AdminSegurancaPage")) 
  }),
  defineRoute({ 
    path: "/admin/seguranca-acesso", 
    component: lazyWithRetry(() => import("@/pages/admin/AdminSegurancaAcessoPage")) 
  }),
  defineRoute({ 
    path: "/admin/conexoes", 
    component: lazyWithRetry(() => import("@/pages/admin/AdminConexoesPage")) 
  }),
  defineRoute({
    path: "/admin/conexoes/status",
    component: lazyWithRetry(() => import("@/pages/admin/AdminConexoesPage")),
  }),
  defineRoute({
    path: "/admin/external-db",
    component: lazyWithRetry(() => import("@/pages/admin/AdminExternalDbPage")),
  }),
  defineRoute({
    path: "/external-db-test",
    component: lazyWithRetry(() => import("@/pages/ExternalDatabaseTest")),
  }),
  defineRoute({ 
    path: "/admin/prompts-ia", 
    component: lazyWithRetry(() => import("@/pages/admin/AdminPromptsIAPage")) 
  }),
  defineRoute({ 
    path: "/admin/workflows", 
    component: lazyWithRetry(() => import("@/pages/admin/AdminWorkflowsPage")) 
  }),
  defineRoute({ 
    path: "/admin/rbac-rotas", 
    component: lazyWithRetry(() => import("@/pages/admin/AdminRbacRoutesPage")) 
  }),

  defineRoute({ 
    path: "/admin/qa/preflight", 
    component: lazyWithRetry(() => import("@/pages/admin/qa/PreflightPage")) 
  }),
  defineRoute({
    path: "/admin/seguranca/chaves",
    component: lazyWithRetry(() => import("@/pages/admin/AdminSegurancaChavesPage"))
  }),
  defineRoute({
    path: "/admin/seguranca/migracao-papeis",
    component: lazyWithRetry(() => import("@/pages/admin/AdminMigracaoPapeisPage"))
  }),
  defineRoute({
    path: "/admin/validade-precos",
    component: lazyWithRetry(() => import("@/pages/admin/PriceFreshnessSettings"))
  }),
  defineRoute({
    path: "/admin/rate-limit",
    component: lazyWithRetry(() => import("@/pages/RateLimitDashboardPage"))
  }),
  defineRoute({
    path: "/admin/login-attempts",
    component: lazyWithRetry(() => import("@/pages/admin/AdminLoginAttemptsPage"))
  }),
  defineRoute({
    path: "/admin/consumo-ia",
    component: lazyWithRetry(() => import("@/pages/admin/AdminAiUsagePage"))
  }),
  defineRoute({
    path: "/admin/rls-denials",
    component: lazyWithRetry(() => import("@/pages/admin/RlsDenialsAdminPage"))
  }),
  defineRoute({
    path: "/admin/auditoria-propriedade",
    component: lazyWithRetry(() => import("@/pages/admin/OwnershipAuditAdminPage"))
  }),
  defineRoute({
    path: "/status",
    component: lazyWithRetry(() => import("@/pages/SystemStatusPage"))
  }),
] as const;
