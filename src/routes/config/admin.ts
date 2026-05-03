import { lazyWithRetry } from "@/lib/lazyWithRetry";

export const adminRoutes = [
  { path: "/admin/usuarios", component: lazyWithRetry(() => import("@/pages/admin/AdminUsuariosPage")) },
  { path: "/admin/usuarios/promover", component: lazyWithRetry(() => import("@/pages/admin/AdminPromoverUsuarioPage")) },
  { path: "/admin/limites-desconto", component: lazyWithRetry(() => import("@/pages/admin/SellerDiscountLimitsAdminPage")) },
  { path: "/admin/rls-denials", component: lazyWithRetry(() => import("@/pages/admin/RlsDenialsAdminPage")) },
  { path: "/admin/auditoria-propriedade", component: lazyWithRetry(() => import("@/pages/admin/OwnershipAuditAdminPage")) },
  { path: "/admin/cadastros", component: lazyWithRetry(() => import("@/pages/admin/AdminCadastrosPage")) },
  { path: "/admin/cadastros/produto/:id", component: lazyWithRetry(() => import("@/pages/admin/AdminProductFormPage")) },
  { path: "/admin/permissoes", component: lazyWithRetry(() => import("@/pages/PermissionsPage")) },
  { path: "/admin/roles", component: lazyWithRetry(() => import("@/pages/RolesPage")) },
  { path: "/admin/role-permissoes", component: lazyWithRetry(() => import("@/pages/RolePermissionsPage")) },
  { path: "/admin/video-variantes", component: lazyWithRetry(() => import("@/pages/admin/AdminVideoVariantsPage")) },
  { path: "/admin/kit-templates", component: lazyWithRetry(() => import("@/pages/admin/KitTemplatesAdminPage")) },
  { path: "/admin/kit-templates/metricas", component: lazyWithRetry(() => import("@/pages/admin/KitTemplatesMetricsPage")) },
];
