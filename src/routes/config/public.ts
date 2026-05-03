import { defineRoute } from "@/lib/router-utils";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

export const publicRoutes = [
  defineRoute({ path: "/login", component: lazyWithRetry(() => import("@/pages/Auth")) }),
  defineRoute({ path: "/reset-password", component: lazyWithRetry(() => import("@/pages/ResetPassword")) }),
  defineRoute({ path: "/approve/:token", component: lazyWithRetry(() => import("@/pages/PublicQuoteApprovalPage")) }),
  defineRoute({ path: "/proposta/:token", component: lazyWithRetry(() => import("@/pages/PublicQuoteApprovalPage")) }),
  defineRoute({ path: "/kit/:token", component: lazyWithRetry(() => import("@/pages/PublicKitViewPage")) }),
  defineRoute({ path: "/lista-publica/:token", component: lazyWithRetry(() => import("@/pages/PublicFavoriteListPage")) }),
  defineRoute({ path: "/colecao-publica/:token", component: lazyWithRetry(() => import("@/pages/PublicCollectionPage")) }),
  defineRoute({ path: "/comparar-publica/:token", component: lazyWithRetry(() => import("@/pages/PublicComparisonPage")) }),
  defineRoute({ path: "/dossie/:token", component: lazyWithRetry(() => import("@/pages/PublicDossierPage")) }),
  defineRoute({ path: "/auth/callback", component: lazyWithRetry(() => import("@/pages/SSOCallbackPage")) }),
] as const;
