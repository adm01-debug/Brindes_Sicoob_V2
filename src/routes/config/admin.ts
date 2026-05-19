import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { defineRoute } from "@/lib/router-utils";

/**
 * Rotas Administrativas - Portal Sicoob
 * Refatoradas para excelência técnica 10/10
 */
export const adminRoutes = [
  defineRoute({ 
    path: "/admin/usuarios", 
    component: lazyWithRetry(() => import("@/pages/admin/RolesPage")) 
  }),
  defineRoute({ 
    path: "/admin/cadastros", 
    component: lazyWithRetry(() => import("@/pages/admin/ProductRegistrationPage")) 
  }),
  defineRoute({ 
    path: "/admin/categories", 
    component: lazyWithRetry(() => import("@/pages/admin/CategoriesPage")) 
  }),
  defineRoute({ 
    path: "/admin/singulares", 
    component: lazyWithRetry(() => import("@/pages/admin/sicoob/SingularesPage")) 
  }),
  defineRoute({ 
    path: "/admin/pas", 
    component: lazyWithRetry(() => import("@/pages/admin/sicoob/PAsPage")) 
  }),
  defineRoute({ 
    path: "/admin/cooperativas", 
    component: lazyWithRetry(() => import("@/pages/admin/sicoob/CooperativasParceirasPage")) 
  }),
  defineRoute({ 
    path: "/admin/cms", 
    component: lazyWithRetry(() => import("@/pages/admin/CMSManagementPage")) 
  }),
  defineRoute({ 
    path: "/admin/verbas", 
    component: lazyWithRetry(() => import("@/pages/admin/sicoob/VerbasPage")) 
  }),
] as const;
