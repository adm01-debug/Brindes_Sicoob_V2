import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { defineRoute } from "@/lib/router-utils";

export const quoteRoutes = [
  defineRoute({ path: "/orcamentos", component: lazyWithRetry(() => import("@/pages/QuotesListPage")) }),
  defineRoute({ path: "/meus-orcamentos", component: lazyWithRetry(() => import("@/pages/MeusOrcamentos")) }),
  defineRoute({ path: "/gestor/orcamentos", component: lazyWithRetry(() => import("@/pages/GestorOrcamentos")) }),
  defineRoute({ path: "/orcamentos/dashboard", component: lazyWithRetry(() => import("@/pages/QuotesDashboardPage")) }),
  defineRoute({ path: "/orcamentos/lista", component: lazyWithRetry(() => import("@/pages/QuotesListPage")) }),
  defineRoute({ path: "/orcamentos/kanban", component: lazyWithRetry(() => import("@/pages/QuotesKanbanPage")) }),
  defineRoute({ path: "/orcamentos/templates", component: lazyWithRetry(() => import("@/pages/QuoteTemplatesPage")) }),
  defineRoute({ path: "/orcamentos/novo", component: lazyWithRetry(() => import("@/pages/QuoteBuilderPage")) }),
  defineRoute({ path: "/orcamentos/:id/editar", component: lazyWithRetry(() => import("@/pages/QuoteBuilderPage")) }),
  defineRoute({ path: "/orcamentos/:id", component: lazyWithRetry(() => import("@/pages/QuoteViewPage")) }),
] as const;
