
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position: "top" | "bottom" | "left" | "right";
  route?: string;
}

const SIDEBAR_TOUR_SELECTOR = "[data-tour='sidebar']";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Bem-vindo ao Brindes Sicoob!",
    description: "Vamos fazer um tour completo pelas funcionalidades do sistema. Você descobrirá recursos poderosos para turbinar suas vendas!",
    targetSelector: SIDEBAR_TOUR_SELECTOR,
    position: "right",
  },
  {
    id: "products",
    title: "Catálogo de Produtos",
    description: "Explore milhares de produtos com filtros avançados, busca inteligente e visualização em grid ou lista. Favorite itens para acesso rápido!",
    targetSelector: "[data-tour='products']",
    position: "right",
    route: "/",
  },
  {
    id: "search",
    title: "Busca Inteligente",
    description: "Use Ctrl+K para busca rápida! Suporte a busca por voz 🎤, busca visual por imagem 📷, e busca semântica com IA.",
    targetSelector: "[data-tour='search']",
    position: "bottom",
  },
  {
    id: "quotes",
    title: "Gestão de Orçamentos",
    description: "Crie orçamentos profissionais com cálculo automático de personalização. Use o Kanban para acompanhar o funil de vendas!",
    targetSelector: "[data-tour='quotes']",
    position: "right",
    route: "/orcamentos",
  },
  {
    id: "clients",
    title: "CRM de Clientes",
    description: "Gerencie clientes com análise RFM, histórico completo de interações, preferências de cores e recomendações personalizadas por IA.",
    targetSelector: "[data-tour='clients']",
    position: "right",
  },
  {
    id: "collections",
    title: "Coleções Personalizadas",
    description: "Organize produtos em coleções temáticas. Ideal para apresentar seleções especiais para diferentes clientes ou campanhas!",
    targetSelector: SIDEBAR_TOUR_SELECTOR,
    position: "right",
    route: "/colecoes",
  },
  {
    id: "simulator",
    title: "Simulador de Personalização",
    description: "Calcule custos de personalização em tempo real. Configure técnicas (silk, bordado, laser), posições, cores e quantidades!",
    targetSelector: SIDEBAR_TOUR_SELECTOR,
    position: "right",
    route: "/simulador",
  },
  {
    id: "mockup",
    title: "Gerador de Mockups",
    description: "Crie visualizações profissionais com logo do cliente! Posicione a arte, ajuste tamanho e gere mockups para apresentações.",
    targetSelector: SIDEBAR_TOUR_SELECTOR,
    position: "right",
    route: "/mockup-generator",
  },
  {
    id: "trends",
    title: "Análise de Tendências",
    description: "Descubra produtos em alta, categorias mais buscadas e padrões de compra. Antecipe demandas e surpreenda seus clientes!",
    targetSelector: SIDEBAR_TOUR_SELECTOR,
    position: "right",
    route: "/tendencias",
  },
  {
    id: "notifications",
    title: "Central de Notificações",
    description: "Receba alertas importantes, lembretes de follow-up e atualizações de orçamentos. Configure lembretes para nunca perder um deal!",
    targetSelector: "[data-tour='notifications']",
    position: "bottom",
  },
  {
    id: "expert-chat",
    title: "Chat com Especialista IA",
    description: "Precisa de ajuda? O botão flutuante de chat conecta você a um especialista IA que conhece todo o catálogo e pode sugerir produtos!",
    targetSelector: SIDEBAR_TOUR_SELECTOR,
    position: "right",
  },
  {
    id: "compare",
    title: "Comparador de Produtos",
    description: "Selecione até 4 produtos para comparar lado a lado. Compare preços, especificações e opções de personalização de fornecedores!",
    targetSelector: SIDEBAR_TOUR_SELECTOR,
    position: "right",
    route: "/comparar",
  },
  {
    id: "orders",
    title: "Gestão de Pedidos",
    description: "Acompanhe pedidos do início ao fim. Controle status de produção, fulfillment, rastreamento e histórico completo de alterações.",
    targetSelector: SIDEBAR_TOUR_SELECTOR,
    position: "right",
    route: "/pedidos",
  },
  {
    id: "complete",
    title: "Pronto para vender!",
    description: "Você completou o tour! Explore todas as funcionalidades e use o botão de ajuda (?) no canto inferior direito para refazer o tour.",
    targetSelector: SIDEBAR_TOUR_SELECTOR,
    position: "right",
  },
];
