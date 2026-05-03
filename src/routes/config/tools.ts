import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { defineRoute } from "@/lib/router-utils";

export const toolRoutes = [
  defineRoute({ path: "/simulador", component: lazyWithRetry(() => import("@/pages/SimuladorWizard")) }),
  defineRoute({ path: "/simulador-precos", component: lazyWithRetry(() => import("@/pages/PriceSimulatorPage")) }),
  defineRoute({ path: "/estoque", component: lazyWithRetry(() => import("@/pages/StockDashboardPage")) }),
  defineRoute({ path: "/busca-preco", component: lazyWithRetry(() => import("@/pages/AdvancedPriceSearchPage")) }),
  defineRoute({ path: "/montar-kit", component: lazyWithRetry(() => import("@/pages/KitBuilderPage")) }),
  defineRoute({ path: "/meus-kits", component: lazyWithRetry(() => import("@/pages/KitLibraryPage")) }),
  defineRoute({ path: "/mockup-generator", component: lazyWithRetry(() => import("@/pages/MockupGenerator")) }),
  defineRoute({ path: "/mockups/historico", component: lazyWithRetry(() => import("@/pages/MockupHistoryPage")) }),
  defineRoute({ path: "/magic-up", component: lazyWithRetry(() => import("@/pages/MagicUp")) }),
  defineRoute({ path: "/inteligencia-comercial", component: lazyWithRetry(() => import("@/pages/CommercialIntelligencePage")) }),
  defineRoute({ path: "/ferramentas/bi", component: lazyWithRetry(() => import("@/pages/BusinessIntelligencePage")) }),
  defineRoute({ path: "/ferramentas/bi/comparar", component: lazyWithRetry(() => import("@/pages/ClientComparatorPage")) }),
  defineRoute({ path: "/match", component: lazyWithRetry(() => import("@/pages/ProductMatchPage")) }),
  defineRoute({ path: "/dropbox", component: lazyWithRetry(() => import("@/pages/DropboxBrowserPage")) }),
] as const;
