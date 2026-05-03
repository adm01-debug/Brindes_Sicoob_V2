/**
 * Configuração canônica de roles para a UI.
 *
 * Hierarquia oficial: dev > supervisor > vendedor (=agente no UI).
 * 'admin' e 'manager' são aliases legados — exibidos como Supervisor.
 */
import type { LucideIcon } from "lucide-react";
import { Code2, ShieldCheck, User, Landmark, Building2, Briefcase } from "lucide-react";

export type AppRole = "dev" | "supervisor" | "vendedor" | "admin" | "manager" | "gestor_singular" | "gestor_pa";

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

export const ROLE_VISUAL: Record<AppRole, RoleVisual> = {
  dev: {
    label: "Dev",
    Icon: Code2,
    variant: "default",
    className: "bg-reward text-reward-foreground border-reward",
    description: "Acesso técnico total: integrações, chaves MCP e auditoria.",
  },
  supervisor: {
    label: "Supervisor",
    Icon: ShieldCheck,
    variant: "default",
    className: "bg-primary text-primary-foreground border-primary",
    description: "Aprova orçamentos e descontos, gerencia equipe e operação.",
  },
  vendedor: {
    label: "Agente",
    Icon: User,
    variant: "secondary",
    className: "bg-secondary/15 text-secondary border-secondary/20",
    description: "Cria orçamentos e atende clientes dentro de sua alçada.",
  },
  // ── SICOOB Specific Roles ──
  gestor_singular: {
    label: "Gestor Singular",
    Icon: Landmark,
    variant: "default",
    className: "bg-sicoob-green text-white border-sicoob-green",
    description: "Gestão estratégica da Cooperativa Singular.",
  },
  gestor_pa: {
    label: "Gestor PA",
    Icon: Building2,
    variant: "secondary",
    className: "bg-sicoob-green-light/20 text-sicoob-green-dark border-sicoob-green-light/30",
    description: "Gestão operacional do Ponto de Atendimento.",
  },
  // ── Aliases legados ──
  admin: {
    label: "Supervisor",
    Icon: ShieldCheck,
    variant: "default",
    className: "bg-primary text-primary-foreground border-primary",
    description: "Aprova orçamentos e descontos, gerencia equipe e operação.",
  },
  manager: {
    label: "Supervisor",
    Icon: ShieldCheck,
    variant: "default",
    className: "bg-primary text-primary-foreground border-primary",
    description: "Aprova orçamentos e descontos, gerencia equipe e operação.",
  },
};

/** Retorna o rótulo amigável de uma role (com fallback seguro). */
export function getRoleLabel(role: string | null | undefined): string {
  if (!role) return "Agente";
  return ROLE_VISUAL[role as AppRole]?.label ?? "Agente";
}

/** Retorna a configuração visual completa (com fallback para Agente). */
export function getRoleVisual(role: string | null | undefined): RoleVisual {
  if (!role) return ROLE_VISUAL.vendedor;
  return ROLE_VISUAL[role as AppRole] ?? ROLE_VISUAL.vendedor;
}
