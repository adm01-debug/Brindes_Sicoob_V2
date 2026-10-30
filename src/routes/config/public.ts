/* global __ENABLE_DEMO_PAGES__ */
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { defineRoute } from "@/lib/router-utils";

/**
 * Rotas Públicas - Portal Sicoob
 * Refatoradas para excelência técnica 10/10
 */
export const publicRoutes = [
  ...(__ENABLE_DEMO_PAGES__ ? [
    defineRoute({
      path: "/loja-demo",
      component: lazyWithRetry(() => import("@/pages/sicoob/StorefrontDemoPage")),
    }),
    defineRoute({
      path: "/demonstracao",
      component: lazyWithRetry(() => import("@/pages/sicoob/DemoPortalPage")),
    }),
  ] : []),
  defineRoute({ 
    path: "/login", 
    component: lazyWithRetry(() => import("@/pages/Auth")) 
  }),
  defineRoute({ 
    path: "/reset-password", 
    component: lazyWithRetry(() => import("@/pages/ResetPassword")) 
  }),
  defineRoute({
    path: "/convite/:token",
    component: lazyWithRetry(() => import("@/pages/sicoob/SicoobInvitationAcceptPage")),
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
    path: "/colecao-publica/:token",
    component: lazyWithRetry(() => import("@/pages/PublicCollectionPage")) 
  }),
  defineRoute({ 
    path: "/approve/:token",
    component: lazyWithRetry(() => import("@/pages/QuoteApprovalPage"))
  }),
  defineRoute({ 
    path: "/proposta/:token",
    component: lazyWithRetry(() => import("@/pages/QuoteApprovalPage"))
  }),
  defineRoute({
    path: "/kit/:token",
    component: lazyWithRetry(() => import("@/pages/PublicKitViewPage"))
  }),
  defineRoute({
    path: "/comparar-publica/:token",
    component: lazyWithRetry(() => import("@/pages/PublicComparisonPage"))
  }),
  defineRoute({
    path: "/dossie/:token",
    component: lazyWithRetry(() => import("@/pages/PublicDossierPage"))
  }),
  defineRoute({
    path: "/lista-publica/:token",
    component: lazyWithRetry(() => import("@/pages/PublicFavoriteListPage"))
  }),
  defineRoute({
    path: "/public/colecao/:token",
    component: lazyWithRetry(() => import("@/pages/PublicCollectionPage"))
  }),
  defineRoute({
    path: "/public/orcamento/:token/aprovacao",
    component: lazyWithRetry(() => import("@/pages/QuoteApprovalPage"))
  }),
  defineRoute({
    path: "/public/kit/:token",
    component: lazyWithRetry(() => import("@/pages/PublicKitViewPage")) 
  }),
  defineRoute({ 
    path: "/public/comparativo/:token",
    component: lazyWithRetry(() => import("@/pages/PublicComparisonPage")) 
  }),
  defineRoute({ 
    path: "/public/dossie/:token",
    component: lazyWithRetry(() => import("@/pages/PublicDossierPage")) 
  }),
  defineRoute({ 
    path: "/public/favoritos/:token",
    component: lazyWithRetry(() => import("@/pages/PublicFavoriteListPage")) 
  }),
] as const;
