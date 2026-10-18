/**
 * Configuração centralizada de status de orçamentos
 * Fonte única de verdade para labels, cores e estilos de cada status.
 */
import type { QuoteStatus } from "@/hooks/quotes/quoteTypes";

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

const MUTED_FOREGROUND_COLOR = "hsl(var(--muted-foreground))";

export const QUOTE_STATUS_CONFIG: Record<string, QuoteStatusConfig> & Record<QuoteStatus, QuoteStatusConfig> = {
  draft: {
    label: "Rascunho",
    color: MUTED_FOREGROUND_COLOR,
    badgeVariant: "secondary",
    badgeClassName: "bg-warning/10 text-warning border-warning/40 border-dashed",
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
  viewed: {
    label: "Visualizado",
    color: "hsl(var(--info))",
    badgeVariant: "outline",
    badgeClassName: "bg-info/10 text-info border-info/30",
  },
  revision: {
    label: "Em revisão",
    color: "hsl(var(--warning))",
    badgeVariant: "outline",
    badgeClassName: "bg-warning/10 text-warning border-warning/30 border-dashed",
  },
  approved: {
    label: "Aprovado",
    color: "hsl(var(--success))",
    badgeVariant: "default",
    badgeClassName: "bg-success/15 text-success border-success/30",
  },
  rejected: {
    label: "Recusado",
    color: "hsl(var(--destructive))",
    badgeVariant: "destructive",
    badgeClassName: "bg-destructive/15 text-destructive border-destructive/30",
  },
  pending_approval: {
    label: "Alçada Admin",
    color: "hsl(38, 92%, 50%)",
    badgeVariant: "outline",
    badgeClassName: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    icon: "shield",
  },
  pending_singular_approval: {
    label: "Pendente Singular",
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
  converted: {
    label: "Oficializado",
    color: "hsl(var(--success))",
    badgeVariant: "default",
    badgeClassName: "bg-success/15 text-success border-success/30",
  },
  expired: {
    label: "Expirado",
    color: MUTED_FOREGROUND_COLOR,
    badgeVariant: "secondary",
    badgeClassName: "bg-muted text-muted-foreground border-muted",
  },
};

export const QUOTE_STATUS_FILTER_ORDER: readonly (QuoteStatus | "all")[] = [
  "all", "draft", "pending_singular_approval", "pending_approval", "pending", "sent", "viewed",
  "revision", "approved_singular", "approved", "converted", "rejected_singular", "rejected", "expired",
] as const;

export const QUOTE_PENDING_STATUSES = new Set<QuoteStatus>([
  "pending", "sent", "viewed", "pending_approval", "pending_singular_approval",
]);

const EDITABLE_QUOTE_STATUSES = new Set([
  "draft",
  "revision",
  "rejected",
  "rejected_singular",
]);

const QUOTE_STATUSES_REQUIRING_DRAFT_RESET = new Set([
  "revision",
  "rejected",
  "rejected_singular",
]);

/** Alinha a interface ao gate de imutabilidade comercial do banco. */
export function isQuoteCommerciallyEditable(
  status: string | null | undefined,
  isLatestVersion = true,
): boolean {
  return isLatestVersion && typeof status === "string" && EDITABLE_QUOTE_STATUSES.has(status);
}

/** Exige registrar a reabertura antes de uma nova submissão. */
export function quoteStatusRequiresDraftReset(status: string | null | undefined): boolean {
  return typeof status === "string" && QUOTE_STATUSES_REQUIRING_DRAFT_RESET.has(status);
}

/** A ação em lote só é válida para versões vigentes que ainda estão em rascunho. */
export function canBulkMarkQuotesPending(
  quotes: Array<{ status: string | null | undefined; is_latest_version?: boolean }>,
): boolean {
  return quotes.length > 0 && quotes.every(
    (quote) => quote.status === "draft" && quote.is_latest_version !== false,
  );
}

/** Helper: get status label with fallback */
export function getQuoteStatusLabel(status: string): string {
  return QUOTE_STATUS_CONFIG[status as QuoteStatus]?.label || status;
}

/** Helper: get status color for charts */
export function getQuoteStatusColor(status: string): string {
  return QUOTE_STATUS_CONFIG[status as QuoteStatus]?.color || MUTED_FOREGROUND_COLOR;
}
