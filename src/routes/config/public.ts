import { lazyWithRetry } from "@/lib/lazyWithRetry";

export const publicRoutes = [
  { path: "/login", component: lazyWithRetry(() => import("@/pages/Auth")) },
  { path: "/reset-password", component: lazyWithRetry(() => import("@/pages/ResetPassword")) },
  { path: "/approve/:token", component: lazyWithRetry(() => import("@/pages/PublicQuoteApprovalPage")) },
  { path: "/proposta/:token", component: lazyWithRetry(() => import("@/pages/PublicQuoteApprovalPage")) },
  { path: "/kit/:token", component: lazyWithRetry(() => import("@/pages/PublicKitViewPage")) },
  { path: "/lista-publica/:token", component: lazyWithRetry(() => import("@/pages/PublicFavoriteListPage")) },
  { path: "/colecao-publica/:token", component: lazyWithRetry(() => import("@/pages/PublicCollectionPage")) },
  { path: "/comparar-publica/:token", component: lazyWithRetry(() => import("@/pages/PublicComparisonPage")) },
  { path: "/dossie/:token", component: lazyWithRetry(() => import("@/pages/PublicDossierPage")) },
  { path: "/auth/callback", component: lazyWithRetry(() => import("@/pages/SSOCallbackPage")) },
];
