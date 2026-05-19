import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { defineRoute } from "@/lib/router-utils";

/**
 * Rotas Públicas - Portal Sicoob
 * Refatoradas para excelência técnica 10/10
 */
export const publicRoutes = [
  defineRoute({ 
    path: "/login", 
    component: lazyWithRetry(() => import("@/pages/Auth")) 
  }),
  defineRoute({ 
    path: "/reset-password", 
    component: lazyWithRetry(() => import("@/pages/ResetPassword")) 
  }),
  defineRoute({ 
    path: "/verificacao", 
    component: lazyWithRetry(() => import("@/pages/VerificationPage")) 
  }),
  defineRoute({ 
    path: "/sso/callback", 
    component: lazyWithRetry(() => import("@/pages/SSOCallbackPage")) 
  }),
  defineRoute({ 
    path: "/public/colecao/:id", 
    component: lazyWithRetry(() => import("@/pages/PublicCollectionPage")) 
  }),
  defineRoute({ 
    path: "/public/orcamento/:id/aprovacao", 
    component: lazyWithRetry(() => import("@/pages/PublicQuoteApprovalPage")) 
  }),
  defineRoute({ 
    path: "/public/kit/:id", 
    component: lazyWithRetry(() => import("@/pages/PublicKitViewPage")) 
  }),
  defineRoute({ 
    path: "/public/comparativo/:id", 
    component: lazyWithRetry(() => import("@/pages/PublicComparisonPage")) 
  }),
  defineRoute({ 
    path: "/public/dossie/:id", 
    component: lazyWithRetry(() => import("@/pages/PublicDossierPage")) 
  }),
  defineRoute({ 
    path: "/public/favoritos/:id", 
    component: lazyWithRetry(() => import("@/pages/PublicFavoriteListPage")) 
  }),
] as const;
