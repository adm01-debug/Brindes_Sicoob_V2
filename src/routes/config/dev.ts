import { lazyWithRetry } from "@/lib/lazyWithRetry";

export const devRoutes = [
  { path: "/admin/seguranca", component: lazyWithRetry(() => import("@/pages/admin/AdminSegurancaPage")) },
  { path: "/admin/seguranca-acesso", component: lazyWithRetry(() => import("@/pages/admin/AdminSegurancaAcessoPage")) },
  { path: "/admin/seguranca/chaves", component: lazyWithRetry(() => import("@/pages/admin/AdminSegurancaChavesPage")) },
  { path: "/admin/seguranca/exemplos-challenge", component: lazyWithRetry(() => import("@/pages/admin/DevChallengeExamplesPage")) },
  { path: "/admin/seguranca/migracao-papeis", component: lazyWithRetry(() => import("@/pages/admin/AdminMigracaoPapeisPage")) },
  { path: "/admin/prompts-ia", component: lazyWithRetry(() => import("@/pages/admin/AdminPromptsIAPage")) },
  { path: "/admin/validade-precos", component: lazyWithRetry(() => import("@/pages/admin/PriceFreshnessSettings")) },
  { path: "/admin/telemetria", component: lazyWithRetry(() => import("@/pages/admin/AdminTelemetriaPage")) },
  { path: "/admin/rate-limit", component: lazyWithRetry(() => import("@/pages/RateLimitDashboardPage")) },
  { path: "/admin/workflows", component: lazyWithRetry(() => import("@/pages/admin/AdminWorkflowsPage")) },
  { path: "/admin/login-attempts", component: lazyWithRetry(() => import("@/pages/admin/AdminLoginAttemptsPage")) },
  { path: "/admin/external-db", component: lazyWithRetry(() => import("@/pages/admin/AdminExternalDbPage")) },
  { path: "/admin/consumo-ia", component: lazyWithRetry(() => import("@/pages/admin/AdminAiUsagePage")) },
  { path: "/admin/conexoes", component: lazyWithRetry(() => import("@/pages/admin/AdminConexoesPage")) },
  { path: "/admin/conexoes/status", component: lazyWithRetry(() => import("@/pages/admin/AdminConexoesStatusPage")) },
  { path: "/status", component: lazyWithRetry(() => import("@/pages/SystemStatusPage")) },
  { path: "/external-db-test", component: lazyWithRetry(() => import("@/pages/ExternalDatabaseTest")) },
  { path: "/admin/rbac-rotas", component: lazyWithRetry(() => import("@/pages/admin/AdminRbacRoutesPage")) },
  { path: "/admin/qa", component: lazyWithRetry(() => import("@/pages/QAPage")) },
];
