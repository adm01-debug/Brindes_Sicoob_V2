import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { defineRoute } from "@/lib/router-utils";

export const devRoutes = [
  defineRoute({ path: "/admin/seguranca", component: lazyWithRetry(() => import("@/pages/admin/AdminSegurancaPage")) }),
  defineRoute({ path: "/admin/seguranca-acesso", component: lazyWithRetry(() => import("@/pages/admin/AdminSegurancaAcessoPage")) }),
  defineRoute({ path: "/admin/seguranca/chaves", component: lazyWithRetry(() => import("@/pages/admin/AdminSegurancaChavesPage")) }),
  defineRoute({ path: "/admin/seguranca/exemplos-challenge", component: lazyWithRetry(() => import("@/pages/admin/DevChallengeExamplesPage")) }),
  defineRoute({ path: "/admin/seguranca/migracao-papeis", component: lazyWithRetry(() => import("@/pages/admin/AdminMigracaoPapeisPage")) }),
  defineRoute({ path: "/admin/prompts-ia", component: lazyWithRetry(() => import("@/pages/admin/AdminPromptsIAPage")) }),
  defineRoute({ path: "/admin/validade-precos", component: lazyWithRetry(() => import("@/pages/admin/PriceFreshnessSettings")) }),
  defineRoute({ path: "/admin/telemetria", component: lazyWithRetry(() => import("@/pages/admin/AdminTelemetriaPage")) }),
  defineRoute({ path: "/admin/rate-limit", component: lazyWithRetry(() => import("@/pages/RateLimitDashboardPage")) }),
  defineRoute({ path: "/admin/workflows", component: lazyWithRetry(() => import("@/pages/admin/AdminWorkflowsPage")) }),
  defineRoute({ path: "/admin/login-attempts", component: lazyWithRetry(() => import("@/pages/admin/AdminLoginAttemptsPage")) }),
  defineRoute({ path: "/admin/external-db", component: lazyWithRetry(() => import("@/pages/admin/AdminExternalDbPage")) }),
  defineRoute({ path: "/admin/consumo-ia", component: lazyWithRetry(() => import("@/pages/admin/AdminAiUsagePage")) }),
  defineRoute({ path: "/admin/conexoes", component: lazyWithRetry(() => import("@/pages/admin/AdminConexoesPage")) }),
  defineRoute({ path: "/admin/conexoes/status", component: lazyWithRetry(() => import("@/pages/admin/AdminConexoesStatusPage")) }),
  defineRoute({ path: "/status", component: lazyWithRetry(() => import("@/pages/SystemStatusPage")) }),
  defineRoute({ path: "/external-db-test", component: lazyWithRetry(() => import("@/pages/ExternalDatabaseTest")) }),
  defineRoute({ path: "/admin/rbac-rotas", component: lazyWithRetry(() => import("@/pages/admin/AdminRbacRoutesPage")) }),
  defineRoute({ path: "/admin/qa", component: lazyWithRetry(() => import("@/pages/QAPage")) }),
] as const;
