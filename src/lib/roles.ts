/**
 * Configuração canônica de roles para a UI.
 *
 * Hierarquia oficial SICOOB: dev > gestor_compras > comprador_singular > gerente_pa > comprador_pac > agente.
 * 'vendedor' e 'supervisor' são mapeados conforme o contexto.
 */
import {
  Code2, 
  ShieldCheck, 
  User, 
  Landmark, 
  Building2,
  ShoppingCart,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";

const SUPERVISOR_CLASS_NAME = "bg-primary text-primary-foreground border-primary";
const SUPERVISOR_DESCRIPTION = "Aprova orçamentos e descontos, gerencia equipe e operação.";

export type AppRole = 
  | "dev" 
  | "gestor_compras" 
  | "comprador_singular" 
  | "gerente_pa" 
  | "comprador_pac" 
  | "agente"
  | "vendedor" 
  | "supervisor";

// Aliases legados mapeados para a nova hierarquia
export const ROLE_ALIASES: Record<string, AppRole> = {
  admin: "supervisor",
  manager: "supervisor",
};

export type RoleVisual = {
  /** Rótulo exibido ao usuário (sempre em português). */
  label: string;
  /** Ícone Lucide associado ao role. */
  Icon: LucideIcon;
  /** Variante do <Badge> shadcn. */
  variant: "default" | "secondary" | "outline" | "accent" | "success" | "warning";
  /** Classes adicionais usando tokens semânticos do design system. */
  className: string;
  /** Descrição curta para tooltips/legendas. */
  description: string;
};

export const ROLE_VISUAL: Record<string, RoleVisual> = {
  dev: {
    label: "Desenvolvedor",
    Icon: Code2,
    variant: "default",
    className: "bg-reward text-reward-foreground border-reward",
    description: "Acesso técnico total: integrações, chaves MCP e auditoria.",
  },
  gestor_compras: {
    label: "Gestor de Compras",
    Icon: ShieldAlert,
    variant: "default",
    className: "bg-sicoob-green text-white border-sicoob-green",
    description: "Gestão estratégica centralizada de compras e fornecedores.",
  },
  comprador_singular: {
    label: "Gestor Singular",
    Icon: Landmark,
    variant: "default",
    className: "bg-sicoob-green text-white border-sicoob-green",
    description: "Gestão estratégica da Cooperativa Singular.",
  },
  gerente_pa: {
    label: "Gerente PA",
    Icon: Building2,
    variant: "secondary",
    className: "bg-sicoob-green-light/20 text-sicoob-green-dark border-sicoob-green-light/30",
    description: "Gestão operacional do Ponto de Atendimento.",
  },
  comprador_pac: {
    label: "Comprador PAC",
    Icon: ShoppingCart,
    variant: "outline",
    className: "border-primary/30 text-primary bg-primary/5",
    description: "Responsável por compras e orçamentos do PA.",
  },
  agente: {
    label: "Agente",
    Icon: User,
    variant: "secondary",
    className: "bg-secondary/15 text-secondary border-secondary/20",
    description: "Cria orçamentos e atende clientes dentro de sua alçada.",
  },
  vendedor: {
    label: "Vendedor",
    Icon: Users,
    variant: "secondary",
    className: "bg-secondary/15 text-secondary border-secondary/20",
    description: "Vendedor focado em atendimento comercial.",
  },
  supervisor: {
    label: "Supervisor",
    Icon: ShieldCheck,
    variant: "default",
    className: SUPERVISOR_CLASS_NAME,
    description: SUPERVISOR_DESCRIPTION,
  },
  // ── Aliases legados ──
  admin: {
    label: "Supervisor",
    Icon: ShieldCheck,
    variant: "default",
    className: SUPERVISOR_CLASS_NAME,
    description: SUPERVISOR_DESCRIPTION,
  },
  manager: {
    label: "Supervisor",
    Icon: ShieldCheck,
    variant: "default",
    className: SUPERVISOR_CLASS_NAME,
    description: SUPERVISOR_DESCRIPTION,
  },
};

/** Retorna o rótulo amigável de uma role (com fallback seguro). */
export function getRoleLabel(role: string | null | undefined): string {
  if (!role) return "Agente";
  return ROLE_VISUAL[role]?.label ?? "Agente";
}

/** Retorna a configuração visual completa (com fallback para Agente). */
export function getRoleVisual(role: string | null | undefined): RoleVisual {
  const visual = role ? ROLE_VISUAL[role] : undefined;
  const fallback = ROLE_VISUAL.agente;
  if (visual) return visual;
  if (fallback) return fallback;
  throw new Error("Configuração visual da função Agente não encontrada");
}
