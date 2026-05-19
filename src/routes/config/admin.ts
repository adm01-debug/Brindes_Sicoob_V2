import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { defineRoute } from "@/lib/router-utils";

/**
 * Rotas Administrativas - Portal Sicoob
 * Refatoradas para excelência técnica 10/10
 */
export const adminRoutes = [
  defineRoute({ 
    path: "/admin/usuarios", 
    component: lazyWithRetry(() => import("@/pages/RolesPage")) 
  }),
  defineRoute({ 
    path: "/admin/cadastros", 
    component: lazyWithRetry(() => import("@/pages/ProductRegistrationPage")) 
  }),
  defineRoute({ 
    path: "/admin/categories", 
    component: lazyWithRetry(() => import("@/pages/admin/AdminCategoriesPage")) 
  }),
  defineRoute({ 
    path: "/admin/singulares", 
    component: lazyWithRetry(() => import("@/pages/admin/sicoob/SicoobManagementPage")) 
  }),
  defineRoute({ 
    path: "/admin/pas", 
    component: lazyWithRetry(() => import("@/pages/admin/sicoob/SicoobManagementPage")) 
  }),
  defineRoute({ 
    path: "/admin/cooperativas", 
    component: lazyWithRetry(() => import("@/pages/admin/sicoob/SicoobManagementPage")) 
  }),
  defineRoute({ 
    path: "/admin/cms", 
    component: lazyWithRetry(() => import("@/pages/admin/AdminCMSPage")) 
  }),
  defineRoute({ 
    path: "/admin/verbas", 
    component: lazyWithRetry(() => import("@/pages/admin/sicoob/SicoobManagementPage")) 
  }),
] as const;

