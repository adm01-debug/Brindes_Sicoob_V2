/**
 * Configuração centralizada de status de orçamentos
 * Fonte única de verdade para labels, cores e estilos de cada status.
 */

import type { QuoteStatus } from "@/types/quote";

export interface QuoteStatusConfig {
  label: string;
  /** HSL color token for charts / icons */
  color: string;
  /** Badge variant for QuoteViewPage */
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  /** Tailwind classes for list badges (bg + text + border) */
  badgeClassName: string;
  /** Lucide icon name hint (optional, for future use) */
  icon?: string;
}

export const QUOTE_STATUS_CONFIG: Record<string, QuoteStatusConfig> = {
  draft: {
    label: "Em rascunho",
    color: "hsl(var(--muted-foreground))",
    badgeVariant: "secondary",
    badgeClassName: "bg-warning/10 text-warning border-warning/40 border-dashed",
  },
  pending_approval: {
    label: "Alçada Admin",
    color: "hsl(38, 92%, 50%)",
    badgeVariant: "outline",
    badgeClassName: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    icon: "shield",
  },
  pending_singular_approval: {
    label: "Em análise Singular",
    color: "hsl(142, 71%, 45%)",
    badgeVariant: "outline",
    badgeClassName: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    icon: "clipboard-check",
  },
  approved_singular: {
    label: "Aprovado Singular",
    color: "hsl(142, 71%, 45%)",
    badgeVariant: "default",
    badgeClassName: "bg-emerald-600/15 text-emerald-700 border-emerald-600/30",
  },
  rejected_singular: {
    label: "Reprovado Singular",
    color: "hsl(var(--destructive))",
    badgeVariant: "destructive",
    badgeClassName: "bg-destructive/15 text-destructive border-destructive/30",
  },
  pending: {
    label: "Enviado",
    color: "hsl(var(--warning))",
    badgeVariant: "outline",
    badgeClassName: "bg-info/15 text-info border-info/30",
    icon: "pulse",
  },
  sent: {
    label: "Em análise",
    color: "hsl(var(--info))",
    badgeVariant: "default",
    badgeClassName: "bg-primary/15 text-primary border-primary/30",
  },
  approved: {
    label: "Aprovado",
    color: "hsl(var(--success))",
    badgeVariant: "default",
    badgeClassName: "bg-success/15 text-success border-success/30",
  },
  converted: {
    label: "Oficializado",
    color: "hsl(var(--success))",
    badgeVariant: "default",
    badgeClassName: "bg-success/15 text-success border-success/30",
  },
  rejected: {
    label: "Reprovado",
    color: "hsl(var(--destructive))",
    badgeVariant: "destructive",
    badgeClassName: "bg-destructive/15 text-destructive border-destructive/30",
  },
  expired: {
    label: "Expirado",
    color: "hsl(var(--muted-foreground))",
    badgeVariant: "secondary",
    badgeClassName: "bg-muted text-muted-foreground border-muted",
  },
};

/** Helper: get status label with fallback */
export function getQuoteStatusLabel(status: string): string {
  return QUOTE_STATUS_CONFIG[status]?.label || status;
}

/** Helper: get status color for charts */
export function getQuoteStatusColor(status: string): string {
  return QUOTE_STATUS_CONFIG[status]?.color || "hsl(var(--muted-foreground))";
}
