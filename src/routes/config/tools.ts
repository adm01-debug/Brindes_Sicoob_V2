import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { defineRoute } from "@/lib/router-utils";

/**
 * Rotas de Ferramentas e Utilitários - Portal Sicoob
 * Refatoradas para excelência técnica 10/10
 */
export const toolRoutes = [
  defineRoute({ 
    path: "/mockup-generator", 
    component: lazyWithRetry(() => import("@/pages/MockupGenerator")) 
  }),
  defineRoute({ 
    path: "/magic-up", 
    component: lazyWithRetry(() => import("@/pages/MagicUp")) 
  }),
  defineRoute({ 
    path: "/match", 
    component: lazyWithRetry(() => import("@/pages/ProductMatchPage")) 
  }),
  defineRoute({ 
    path: "/montar-kit", 
    component: lazyWithRetry(() => import("@/pages/KitBuilderPage")) 
  }),
  defineRoute({ 
    path: "/simulador", 
    component: lazyWithRetry(() => import("@/pages/SimuladorWizard")) 
  }),
  defineRoute({ 
    path: "/simulador-precos", 
    component: lazyWithRetry(() => import("@/pages/PriceSimulatorPage")) 
  }),
  defineRoute({ 
    path: "/busca-preco", 
    component: lazyWithRetry(() => import("@/pages/AdvancedPriceSearchPage")) 
  }),
] as const;
