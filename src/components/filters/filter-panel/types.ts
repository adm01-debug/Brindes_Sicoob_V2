import React from "react";
import {
  Palette, LayoutGrid, Package, DollarSign, Truck, Users,
  Calendar, Briefcase, Gem, Building2, Paintbrush, Tag,
  Sparkles, Filter, Target, TrendingUp, Zap,
} from "lucide-react";

// ============================================
// TIPOS E DEFAULTS
// ============================================

export interface FilterState {
  search: string;
  colorGroups: string[];
  colorVariations: string[];
  colorNuances: string[];
  colors: string[];
  categories: string[];
  suppliers: string[];
  publicoAlvo: string[];
  datasComemorativas: string[];
  endomarketing: string[];
  ramosAtividade: string[];
  segmentosAtividade: string[];
  materialGroups: string[];
  materialTypes: string[];
  materiais: string[];
  techniques: string[];
  tags: string[];
  priceRange: [number, number];
  minStock: number;
  minQuantity?: number;
  sicoobThemes: string[];
  inStock: boolean;
  isKit: boolean;
  featured: boolean;
  isNew: boolean;
  hasPersonalization: boolean;
  hasCommercialPackaging: boolean;
  gender: string[];
  sizes: string[];
  sortBy: string;
}

export interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  activeFiltersCount: number;
  products?: Array<{ tags?: { publicoAlvo?: string[]; endomarketing?: string[]; ramo?: string[]; nicho?: string[] } }>;
  viewMode?: "grid" | "list";
  onViewModeChange?: (mode: "grid" | "list") => void;
  gridColumns?: import("@/components/products/ColumnSelector").ColumnCount;
  onGridColumnsChange?: (cols: import("@/components/products/ColumnSelector").ColumnCount) => void;
  filteredResultsCount?: number;
}

export const defaultFilters: FilterState = {
  search: '',
  colorGroups: [],
  colorVariations: [],
  colorNuances: [],
  colors: [],
  categories: [],
  suppliers: [],
  publicoAlvo: [],
  datasComemorativas: [],
  endomarketing: [],
  ramosAtividade: [],
  segmentosAtividade: [],
  materialGroups: [],
  materialTypes: [],
  materiais: [],
  techniques: [],
  tags: [],
  priceRange: [0, 9999],
  minStock: 0,
  minQuantity: 0,
  sicoobThemes: [],
  inStock: false,
  isKit: false,
  featured: false,
  isNew: false,
  hasPersonalization: false,
  hasCommercialPackaging: false,
  gender: [],
  sizes: [],
  sortBy: 'name',
};

export const SECTION_CONFIG: Record<string, { title: string; icon: React.ReactNode }> = {
  cores: { title: "Cores", icon: React.createElement(Palette, { className: "h-4 w-4" }) },
  categorias: { title: "Categorias", icon: React.createElement(LayoutGrid, { className: "h-4 w-4" }) },
  estoque: { title: "Estoque", icon: React.createElement(Package, { className: "h-4 w-4" }) },
  preco: { title: "Faixa de Preço", icon: React.createElement(DollarSign, { className: "h-4 w-4" }) },
  fornecedores: { title: "Fornecedores", icon: React.createElement(Truck, { className: "h-4 w-4" }) },
  publico: { title: "Público-Alvo", icon: React.createElement(Users, { className: "h-4 w-4" }) },
  "datas-comemorativas": { title: "Datas Comemorativas", icon: React.createElement(Calendar, { className: "h-4 w-4" }) },
  endomarketing: { title: "Endomarketing", icon: React.createElement(Briefcase, { className: "h-4 w-4" }) },
  materiais: { title: "Materiais", icon: React.createElement(Gem, { className: "h-4 w-4" }) },
  "ramos-atividade": { title: "Nichos/Segmentos", icon: React.createElement(Building2, { className: "h-4 w-4" }) },
  tecnicas: { title: "Técnicas de Gravação", icon: React.createElement(Paintbrush, { className: "h-4 w-4" }) },
  genero: { title: "Gênero", icon: React.createElement(Users, { className: "h-4 w-4" }) },
  tamanhos: { title: "Tamanhos", icon: React.createElement(Package, { className: "h-4 w-4" }) },
  tags: { title: "Tags", icon: React.createElement(Tag, { className: "h-4 w-4" }) },
  "opcoes-rapidas": { title: "Opções Rápidas", icon: React.createElement(Sparkles, { className: "h-4 w-4" }) },
  ordenacao: { title: "Ordenar por", icon: React.createElement(Filter, { className: "h-4 w-4" }) },
  temas: { title: "Regionalismo/Temas", icon: React.createElement(Gem, { className: "h-4 w-4" }) },
  "tiragem-minima": { title: "Tiragem Mínima", icon: React.createElement(Package, { className: "h-4 w-4" }) },
};

export const SECTION_GROUPS = [
  { label: "SICOOB CATALOG", sections: ["temas", "tiragem-minima", "categorias", "estoque", "preco"], icon: Target },
  { label: "PRODUTO", sections: ["cores", "materiais", "genero", "tamanhos"], icon: Package },
  { label: "COMERCIAL", sections: ["fornecedores", "tecnicas"], icon: TrendingUp },
  { label: "MARKETING", sections: ["publico", "datas-comemorativas", "endomarketing", "ramos-atividade"], icon: Target },
  { label: "ATALHOS", sections: ["tags", "opcoes-rapidas"], icon: Zap },
];
