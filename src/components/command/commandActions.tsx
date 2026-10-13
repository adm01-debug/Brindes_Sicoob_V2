/**
 * commandActions — Definição centralizada das ações do CommandBar
 */
import {
  Package, FileText, Calculator, Settings, Home, Palette, Layers, Box,
  Calendar, Zap, BarChart3, Filter, PlusCircle, RefreshCw, Download,
  Printer, HelpCircle, Moon, Sun, BookOpen, Grid,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Theme } from "@/contexts/ThemeContext";

export interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: ReactNode;
  shortcut?: string;
  action: () => void;
  keywords?: string[];
  category: "navigation" | "action" | "recent" | "quick" | "settings" | "help";
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  /**
   * Path da rota associada (quando aplicável). Permite que
   * `filterByRoutePermission` esconda a ação para usuários que não
   * podem navegar até a rota (ver `RBAC_ROUTES`).
   */
  path?: string;
}

export interface RecentItem {
  id: string;
  type: "product" | "client" | "quote" | "page";
  label: string;
  path: string;
  timestamp: number;
}

export const RECENT_ITEMS_KEY = "command-bar-recent";

interface BuildActionsParams {
  goTo: (path: string, label: string, type?: RecentItem["type"]) => void;
  actualTheme: string;
  setTheme: (t: Theme) => void;
  setOpen: (v: boolean) => void;
}

export function buildActions({ goTo, actualTheme, setTheme, setOpen }: BuildActionsParams): CommandAction[] {
  return [
    // Quick Actions
    {
      id: "new-quote",
      label: "Novo Orçamento",
      description: "Criar um novo orçamento rápido",
      icon: <PlusCircle className="h-4 w-4" />,
      shortcut: "⌘N",
      action: () => goTo("/orcamentos/novo", "Novo Orçamento"),
      path: "/orcamentos/novo",
      keywords: ["criar", "orçamento", "novo", "quote"],
      category: "quick",
      badge: "Ação",
      badgeVariant: "default",
    },
    {
      id: "simulator",
      label: "Abrir Simulador",
      description: "Simular preços de personalização",
      icon: <Calculator className="h-4 w-4" />,
      shortcut: "⌘S",
      action: () => goTo("/simulador", "Simulador"),
      path: "/simulador",
      keywords: ["simulador", "calcular", "preço", "personalização"],
      category: "quick",
      badge: "Popular",
      badgeVariant: "secondary",
    },
    {
      id: "compare",
      label: "Comparar Produtos",
      description: "Comparar produtos lado a lado",
      icon: <Layers className="h-4 w-4" />,
      action: () => goTo("/comparar", "Comparar Produtos"),
      path: "/comparar",
      keywords: ["comparar", "produto", "compare"],
      category: "quick",
    },
    // Navigation
    {
      id: "home",
      label: "Dashboard",
      description: "Voltar para o início",
      icon: <Home className="h-4 w-4" />,
      shortcut: "⌘H",
      action: () => goTo("/", "Dashboard"),
      path: "/",
      keywords: ["home", "início", "dashboard", "principal"],
      category: "navigation",
    },
    {
      id: "products",
      label: "Catálogo de Produtos",
      description: "Ver todos os produtos",
      icon: <Package className="h-4 w-4" />,
      action: () => goTo("/filtros", "Catálogo"),
      path: "/filtros",
      keywords: ["produtos", "catálogo", "catalog", "items"],
      category: "navigation",
    },
    {
      id: "novelties",
      label: "Novidades",
      description: "Produtos recém-adicionados",
      icon: <Zap className="h-4 w-4" />,
      action: () => goTo("/novidades", "Novidades"),
      path: "/novidades",
      keywords: ["novidades", "novo", "lançamento", "new"],
      category: "navigation",
      badge: "Novo",
      badgeVariant: "destructive",
    },
    {
      id: "quotes",
      label: "Orçamentos",
      description: "Ver todos os orçamentos",
      icon: <FileText className="h-4 w-4" />,
      action: () => goTo("/orcamentos", "Orçamentos"),
      path: "/orcamentos",
      keywords: ["orçamentos", "quotes", "propostas"],
      category: "navigation",
    },
    {
      id: "techniques",
      label: "Técnicas de Personalização",
      description: "Gerenciar técnicas",
      icon: <Palette className="h-4 w-4" />,
      action: () => goTo("/admin/cadastros?tab=personalizacao", "Técnicas"),
      path: "/admin/cadastros",
      keywords: ["técnicas", "personalização", "gravação", "silk"],
      category: "navigation",
    },
    {
      id: "collections",
      label: "Coleções",
      description: "Ver coleções de produtos",
      icon: <Grid className="h-4 w-4" />,
      action: () => goTo("/colecoes", "Coleções"),
      path: "/colecoes",
      keywords: ["coleções", "collections", "grupos"],
      category: "navigation",
    },
    {
      id: "filters",
      label: "Filtros Avançados",
      description: "Filtrar produtos com múltiplos critérios",
      icon: <Filter className="h-4 w-4" />,
      action: () => goTo("/filtros", "Filtros"),
      path: "/filtros",
      keywords: ["filtros", "busca", "search", "advanced"],
      category: "navigation",
    },
    {
      id: "stock",
      label: "Controle de Estoque",
      description: "Monitorar estoque e alertas",
      icon: <Box className="h-4 w-4" />,
      action: () => goTo("/estoque", "Estoque"),
      path: "/estoque",
      keywords: ["estoque", "stock", "inventário", "alertas"],
      category: "navigation",
    },
    {
      id: "dates",
      label: "Datas Comemorativas",
      description: "Ver calendário de datas especiais no dashboard",
      icon: <Calendar className="h-4 w-4" />,
      action: () => goTo("/dashboard", "Datas Comemorativas"),
      path: "/dashboard",
      keywords: ["datas", "comemorativas", "calendar", "eventos"],
      category: "navigation",
    },
    {
      id: "reports",
      label: "Relatórios",
      description: "Ver relatórios e métricas",
      icon: <BarChart3 className="h-4 w-4" />,
      action: () => goTo("/relatorios/sicoob", "Relatórios"),
      path: "/relatorios/sicoob",
      keywords: ["relatórios", "reports", "métricas", "analytics"],
      category: "navigation",
    },
    // Actions
    {
      id: "export-pdf",
      label: "Salvar página como PDF",
      description: "Abrir a impressão para salvar a página em PDF",
      icon: <Download className="h-4 w-4" />,
      action: () => {
        window.print();
        setOpen(false);
      },
      keywords: ["exportar", "pdf", "download", "export"],
      category: "action",
    },
    {
      id: "print",
      label: "Imprimir",
      description: "Imprimir página atual",
      icon: <Printer className="h-4 w-4" />,
      shortcut: "⌘P",
      action: () => {
        window.print();
        setOpen(false);
      },
      keywords: ["imprimir", "print"],
      category: "action",
    },
    {
      id: "refresh",
      label: "Atualizar Dados",
      description: "Recarregar dados da página",
      icon: <RefreshCw className="h-4 w-4" />,
      shortcut: "⌘R",
      action: () => { window.location.reload(); },
      keywords: ["atualizar", "refresh", "reload"],
      category: "action",
    },
    // Settings
    {
      id: "settings",
      label: "Configurações",
      description: "Configurar a identidade visual do portal",
      icon: <Settings className="h-4 w-4" />,
      action: () => goTo("/admin/temas", "Configurações"),
      path: "/admin/temas",
      keywords: ["configurações", "settings", "preferências"],
      category: "settings",
    },
    {
      id: "theme-toggle",
      label: actualTheme === "dark" ? "Modo Claro" : "Modo Escuro",
      description: "Alternar tema do sistema",
      icon: actualTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      shortcut: "⌘D",
      action: () => { setTheme(actualTheme === "dark" ? "light" : "dark"); },
      keywords: ["tema", "theme", "dark", "light", "escuro", "claro"],
      category: "settings",
    },
    // Help
    {
      id: "help",
      label: "Central de Ajuda",
      description: "Tutoriais e documentação",
      icon: <HelpCircle className="h-4 w-4" />,
      shortcut: "⌘/",
      action: () => goTo("/ajuda", "Ajuda"),
      path: "/ajuda",
      keywords: ["ajuda", "help", "suporte", "tutorial"],
      category: "help",
    },
    {
      id: "shortcuts",
      label: "Atalhos de Teclado",
      description: "Ver todos os atalhos disponíveis",
      icon: <BookOpen className="h-4 w-4" />,
      action: () => goTo("/ajuda#atalhos", "Atalhos de Teclado"),
      path: "/ajuda",
      keywords: ["atalhos", "shortcuts", "keyboard", "teclado"],
      category: "help",
    },
  ];
}
