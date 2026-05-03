import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { defineRoute } from "@/lib/router-utils";

export const adminRoutes = [
  defineRoute({ path: "/admin/usuarios", component: lazyWithRetry(() => import("@/pages/admin/AdminUsuariosPage")) }),
  defineRoute({ path: "/admin/usuarios/promover", component: lazyWithRetry(() => import("@/pages/admin/AdminPromoverUsuarioPage")) }),
  defineRoute({ path: "/admin/limites-desconto", component: lazyWithRetry(() => import("@/pages/admin/SellerDiscountLimitsAdminPage")) }),
  defineRoute({ path: "/admin/rls-denials", component: lazyWithRetry(() => import("@/pages/admin/RlsDenialsAdminPage")) }),
  defineRoute({ path: "/admin/auditoria-propriedade", component: lazyWithRetry(() => import("@/pages/admin/OwnershipAuditAdminPage")) }),
  defineRoute({ path: "/admin/cadastros", component: lazyWithRetry(() => import("@/pages/admin/AdminCadastrosPage")) }),
  defineRoute({ path: "/admin/cadastros/produto/:id", component: lazyWithRetry(() => import("@/pages/admin/AdminProductFormPage")) }),
  defineRoute({ path: "/admin/permissoes", component: lazyWithRetry(() => import("@/pages/PermissionsPage")) }),
  defineRoute({ path: "/admin/roles", component: lazyWithRetry(() => import("@/pages/RolesPage")) }),
  defineRoute({ path: "/admin/role-permissoes", component: lazyWithRetry(() => import("@/pages/RolePermissionsPage")) }),
  defineRoute({ path: "/admin/video-variantes", component: lazyWithRetry(() => import("@/pages/admin/AdminVideoVariantsPage")) }),
  defineRoute({ path: "/admin/kit-templates", component: lazyWithRetry(() => import("@/pages/admin/KitTemplatesAdminPage")) }),
  defineRoute({ path: "/admin/kit-templates/metricas", component: lazyWithRetry(() => import("@/pages/admin/KitTemplatesMetricsPage")) }),
] as const;
