import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { defineRoute } from "@/lib/router-utils";

/**
 * Rotas de Ferramentas e Dev - Portal Sicoob
 * Refatoradas para excelência técnica 10/10
 */
export const devRoutes = [
  defineRoute({ 
    path: "/admin/telemetria", 
    component: lazyWithRetry(() => import("@/pages/admin/TelemetryPage")) 
  }),
  defineRoute({ 
    path: "/admin/seguranca", 
    component: lazyWithRetry(() => import("@/pages/admin/SecurityPage")) 
  }),
  defineRoute({ 
    path: "/admin/seguranca-acesso", 
    component: lazyWithRetry(() => import("@/pages/admin/AccessSecurityPage")) 
  }),
  defineRoute({ 
    path: "/admin/conexoes", 
    component: lazyWithRetry(() => import("@/pages/admin/ConnectionsPage")) 
  }),
  defineRoute({ 
    path: "/admin/prompts-ia", 
    component: lazyWithRetry(() => import("@/pages/admin/AIPromptsPage")) 
  }),
  defineRoute({ 
    path: "/admin/workflows", 
    component: lazyWithRetry(() => import("@/pages/admin/WorkflowsPage")) 
  }),
  defineRoute({ 
    path: "/admin/rbac-rotas", 
    component: lazyWithRetry(() => import("@/pages/admin/RBACAuditPage")) 
  }),
  defineRoute({ 
    path: "/admin/qa/preflight", 
    component: lazyWithRetry(() => import("@/pages/admin/qa/PreflightPage")) 
  }),
] as const;
